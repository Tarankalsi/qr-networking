const prisma = require("../db");
const { sendErrorResponse, sendSuccessResponse } = require("../utils/response");
const { visitorSchema } = require("../validations/visitorValidation");

class VisitorController {
    async registerVisitor(req, res) {
        try {
            const { error, value } = visitorSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 'Validation failed', 400, error.details[0].message);
            }
            const { eventId, name, email, phone, company, position, consentGiven } = value;
            if (!consentGiven) {
                return sendErrorResponse(res, 'Consent is required to proceed', 400);
            }
            // Verify event exists and is active
            const event = await prisma.event.findUnique({
                where: {
                    event_id: eventId
                }
            });
            if (!event) {
                return sendErrorResponse(res, 'Event not found or inactive', 404);
            }

            console.log('Event found:', event);
            console.log('Event ID:', eventId);
            console.log('Event ID from event:', event.id);
            // Check if visitor already exists for this event
            let visitor = await prisma.eventVisitor.findFirst({
                where: {
                    event_id: event.id,
                    email: email
                }
            });
            if (visitor) {
                // Update session and return existing visitor
                req.session.visitorId = visitor.id;
                await new Promise((resolve, reject) => {
                    req.session.save((err) => {
                        if (err) reject(err);
                        else resolve();
                    });
                });
                return sendSuccessResponse(res, 'Visitor already registered', visitor);
            }
            // Create new visitor
            visitor = await prisma.eventVisitor.create({
                data: {
                    event_id: event.id,
                    name,
                    email,
                    phone: phone || null,
                    company: company || null,
                    position: position || null,
                    session_id: req.sessionID,
                    consent_given: consentGiven,
                    consent_date: new Date()
                }
            });
            // Set session
            req.session.visitorId = visitor.id;
            await new Promise((resolve, reject) => {
                req.session.save((err) => {
                    if (err) reject(err);
                    else resolve();
                });
            });
            return sendSuccessResponse(res, 'Registration successful', visitor);
        } catch (error) {
            console.error('Registration error:', error);
            return sendErrorResponse(res, 'Registration failed', 500, error.message);
        }
    }

    async checkVisitorSession(req, res) {
        try {
            if (req.session.visitorId) {
                console.log('Session visitorId:', req.session.visitorId);
                const visitor = await prisma.eventVisitor.findUnique({
                    where: { id: req.session.visitorId },
                    include: {
                        event: {
                            select: {
                                id: true,
                                title: true
                            }
                        }
                    }
                });
                if (visitor) {
                    return sendSuccessResponse(res, 'Session is active', {
                        isRegistered: true,
                        visitor: {
                            id: visitor.id,
                            name: visitor.name,
                            email: visitor.email,
                            company: visitor.company,
                            eventName: visitor.event.name,
                            eventId: visitor.event.id
                        }
                    });
                } else {
                    // Clear invalid session
                    req.session.destroy();
                }
            }
            return sendSuccessResponse(res, 'No active session', {
                isRegistered: false
            });
        } catch (error) {
            console.error('Session check error:', error);
            return sendErrorResponse(res, 'Session check failed', 500, error.message);
        }
    }

    async saveContact(req, res) {
        try {
            const { slug } = req.params;
            const visitor = req.visitor;
            // Get profile by slug
            const profile = await prisma.exhibitorProfile.findUnique({
                where: {
                    profile_slug: slug,
                }
            });
            if (!profile) {
                return sendErrorResponse(res, 'Profile not found or not active', 404, 'Profile not found or not active');
            }
            // Verify same event
            if (visitor.event_id !== profile.event_id) {
                return sendErrorResponse(res, 'Visitor and exhibitor not from same event', 403, 'Visitor and exhibitor not from same event');
            }
            // Create or update interaction
            const interaction = await prisma.visitorExhibitorInteraction.upsert({
                where: {
                    visitor_id_profile_id: {
                        visitor_id: visitor.id,
                        profile_id: profile.id
                    }
                },
                update: {
                    contact_saved: true,
                    interaction_count: { increment: 1 },
                    last_interaction: new Date()
                },
                create: {
                    visitor_id: visitor.id,
                    profile_id: profile.id,
                    contact_saved: true,
                    interaction_count: 1
                }
            });
            // Prepare contact data for phone
            const profileUrl = `${process.env.FRONTEND_URL}/profile/${profile.profile_slug}`;
            const contactData = {
                name: profile.contact_person,
                company: profile.display_name,
                email: profile.contact_email,
                phone: profile.contact_phone,
                website: profile.website_url,
                profileUrl: profileUrl,
                address: profile.address,
                notes: `Met at ${profile.booth_number ? `booth ${profile.booth_number}` : 'event'} - ${visitor.name}`
            };
            return sendSuccessResponse(res, 'Contact saved successfully', {
                contact: contactData,
                interactionCount: interaction.interaction_count,
                message: 'Contact saved successfully!'
            });
        } catch (error) {
            console.error('Save contact error:', error);
            return sendErrorResponse(res, 'Failed to save contact', 500, error.message);
        }
    }

    async getInteractionStatus(req, res) {
        try {
            const { slug } = req.params;
            const visitor = req.visitor;
            const profile = await prisma.exhibitorProfile.findUnique({
                where: { profile_slug: slug }
            });
            if (!profile) {
                return sendErrorResponse(res, 'Profile not found', 404, 'The requested profile does not exist');
            }
            const interaction = await prisma.visitorExhibitorInteraction.findUnique({
                where: {
                    visitor_id_profile_id: {
                        visitor_id: visitor.id,
                        profile_id: profile.id
                    }
                }
            });
            return sendSuccessResponse(res, 'Interaction status retrieved', {
                hasInteracted: !!interaction,
                contactSaved: interaction?.contact_saved || false,
                interactionCount: interaction?.interaction_count || 0,
                lastInteraction: interaction?.last_interaction || null
            });
        } catch (error) {
            console.error('Get interaction status error:', error);
            return sendErrorResponse(res, 'Failed to get interaction status', 500, error.message);
        }
    }
}

module.exports = new VisitorController;