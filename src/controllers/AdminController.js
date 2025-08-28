const prisma = require("../db");
const QrService = require("../services/QrService");
const Helpers = require("../utils/helpers");
const { sendErrorResponse, sendSuccessResponse } = require("../utils/response");
const { createExhibitorSchema } = require("../validations/exhibitorValidation");
const bcrypt = require("bcryptjs");
const { sendEmail } = require("../services/SendgridService");
const { sendCredentialsTemplate } = require("../utils/sendCredentialsTemplate");


class AdminController {
    async generateExhibitorCred(req, res) {
        try {
            const { error, value } = createExhibitorSchema.validate(req.body);
            if (error) {
                return sendErrorResponse(res, 'Validation failed', 400, error.details[0].message);
            }

            const {
                eventId,
                email,
                companyName,
                phoneNumber
            } = value;

            // Check if email already exists
            const existingAuth = await prisma.exhibitorAuth.findUnique({
                where: {
                    email: email,
                }
            });
            if (existingAuth) {
                return sendErrorResponse(res, 'Email already exists', 409);
            }

            // Verify event exists
            const event = await prisma.event.findUnique({
                where: { event_id: eventId }
            });
            if (!event) {
                return sendErrorResponse(res, 'Event not found', 404);
            }

            const password = Helpers.generatePassword(8);
            const passwordHash = await bcrypt.hash(password, 12);
            const profileSlug = Helpers.generateCompanySlug(companyName);
            // Generate QR code (outside transaction, as it's not DB related)
            const qrResult = await QrService.generateQRCodeForProfile(profileSlug);

            // Use Prisma transaction for atomic creation
            const [auth, profile] = await prisma.$transaction([
                prisma.exhibitorAuth.create({
                    data: {
                        event_id: event.id,
                        email,
                        password_hash: passwordHash
                    }
                }),
                prisma.exhibitorProfile.create({
                    data: {
                        // auth_id will be set after auth is created, so use a function
                        // But in $transaction array form, we can't reference previous result, so do 2-step transaction
                        // Instead, use interactive transaction
                    }
                })
            ]).catch(async () => {
                // Fallback to interactive transaction for correct foreign key
                return await prisma.$transaction(async (tx) => {
                    const authTx = await tx.exhibitorAuth.create({
                        data: {
                            event_id: event.id,
                            email,
                            password_hash: passwordHash
                        }
                    });
                    const profileTx = await tx.exhibitorProfile.create({
                        data: {
                            auth_id: authTx.id,
                            event_id: event.id,
                            company_name: companyName,
                            profile_slug: profileSlug,
                            display_name: companyName,
                            contact_person: companyName,
                            contact_email: email,
                            contact_phone: phoneNumber,
                            qr_code_url: qrResult.qrCodeUrl,
                            is_published: false
                        }
                    });
                    return [authTx, profileTx];
                });
            });

            // Send credentials email
            try {
                await sendEmail({
                    recipientEmail: auth.email,
                    subject: 'Your Exhibitor Account Credentials',
                    textContent: `Your account has been created. Here are your login credentials:\n\nEmail: ${email}\nPassword: ${password}\n\nYou can log in at ${process.env.FRONTEND_URL}/login`,
                    html: sendCredentialsTemplate({
                        email: auth.email,
                        password,
                        companyName: profile.company_name
                    })
                });
                return sendSuccessResponse(res, 'Exhibitor account created successfully', {
                    auth: {
                        id: auth.id,
                        email: auth.email,
                        eventId: auth.event_id
                    },
                    profile: {
                        id: profile.id,
                        profileSlug: profile.profile_slug,
                        companyName: profile.company_name,
                        qrCodeUrl: profile.qr_code_url,
                        profileUrl: `${process.env.FRONTEND_URL}/profile/${profile.profile_slug}`
                    },
                    message: `Exhibitor account created successfully. Login credentials have been sent to ${profile.contact_email}`,
                });
            } catch (emailError) {
                console.error('Failed to send credentials email:', emailError);
                // Account was created but email failed - still return success but warn about email
                return sendSuccessResponse(res, 'Exhibitor account created successfully', {
                    auth: {
                        id: auth.id,
                        email: auth.email,
                        eventId: auth.event_id
                    },
                    profile: {
                        id: profile.id,
                        profileSlug: profile.profile_slug,
                        companyName: profile.company_name,
                        qrCodeUrl: profile.qr_code_url,
                        profileUrl: `${process.env.FRONTEND_URL}/profile/${profile.profile_slug}`
                    },
                    // Only include credentials if you are sure it's safe
                    credentials: {
                        email,
                        password
                    },
                    warning: 'Account created successfully, but failed to send email. Please share the credentials manually.',
                    message: 'Exhibitor account created successfully'
                });
            }
        } catch (error) {
            console.error('Create account error:', error);
            return sendErrorResponse(res, 'Failed to create exhibitor account', 500, error.message);
        }
    }

    async getAllEventExhibitors(req, res) {
        try {
            const { eventId } = req.params;

            const event = await prisma.event.findUnique({
                where: { event_id: eventId }
            });
            if (!event) {
                return sendErrorResponse(res, 'Event not found', 404);
            }
            const exhibitors = await prisma.exhibitorAuth.findMany({
                where: { event_id: event.id },
                include: {
                    profile: true
                },
                orderBy: { created_at: 'desc' }
            });
            return sendSuccessResponse(res, 'Exhibitors retrieved successfully', {
                exhibitors: exhibitors.map(auth => ({
                    id: auth.id,
                    email: auth.email,
                    isActive: auth.is_active,
                    lastLogin: auth.last_login,
                    profile: auth.profile,
                    hasProfile: !!auth.profile,
                    profileUrl: auth.profile ? `${process.env.FRONTEND_URL}/profile/${auth.profile.profile_slug}` : null
                }))
            });
        } catch (error) {
            console.error('Get exhibitors error:', error);
            return sendErrorResponse(res, 'Failed to get exhibitors', 500, error.message);
        }
    }

    async toggleExhibitorStatus(req, res) {
        try {
            const { exhibitorId } = req.params;
            const { isActive } = req.body;
            if (typeof isActive !== 'boolean') {
                return sendErrorResponse(res, 400, 'Invalid status', 'isActive must be a boolean value');
            }
            const auth = await prisma.exhibitorAuth.update({
                where: { id: exhibitorId },
                data: {
                    is_active: isActive,
                    updated_at: new Date()
                },
                include: { profile: true }
            });

            if (auth && auth.password_hash) {
                delete auth.password_hash;
            }
            return sendSuccessResponse(res, isActive ? 'Exhibitor account activated successfully' : 'Exhibitor account deactivated successfully', auth);
        } catch (error) {
            console.error('Toggle status error:', error);
            if (error.code === 'P2025') {
                return sendErrorResponse(res, 'Exhibitor account not found', 404, error.message);
            }
            return sendErrorResponse(res, 'Failed to toggle exhibitor status', 500, error.message);
        }
    }

    async resendExhibitorCredentials(req, res) {
        try {
            const { exhibitorId } = req.params;
            // Get exhibitor details
            const auth = await prisma.exhibitorAuth.findUnique({
                where: { id: exhibitorId },
                include: {
                    profile: true
                }
            });
            if (!auth || !auth.profile) {
                return res.status(404).json({ error: 'Exhibitor account not found' });
            }
            // Generate new password for security (don't send old one)
            const newPassword = Helpers.generatePassword(8);
            const passwordHash = await bcrypt.hash(newPassword, 12);
            // Update with new password
            const updatedExhibitor = await prisma.exhibitorAuth.update({
                where: { id: exhibitorId },
                data: {
                    password_hash: passwordHash,
                    updated_at: new Date()
                }
            });
            // Send credentials email
            try {
                await sendEmail({
                    recipientEmail: updatedExhibitor.email,
                    subject: 'Your Exhibitor Account Credentials',
                    textContent: `Your account has been created. Here are your login credentials:\n\nEmail: ${updatedExhibitor.email}\nPassword: ${newPassword}\n\nYou can log in at ${process.env.FRONTEND_URL}/login`,
                    html: sendCredentialsTemplate({
                        email: updatedExhibitor.email,
                        password: newPassword,
                        companyName: auth.profile.company_name
                    })
                });
                return sendSuccessResponse(res, `Credentials have been sent to ${updatedExhibitor.email}`);
            } catch (emailError) {
                console.error('Failed to send credentials email:', emailError);
                return sendSuccessResponse(res, 'Credentials generated successfully but failed to send email', {
                    credentials: {
                        email: updatedExhibitor.email,
                        password: newPassword
                    },
                    warning: 'Failed to send email. Please share the credentials manually.',
                    message: 'Credentials generated successfully'
                });
            }
        } catch (error) {
            console.error('Resend credentials error:', error);
            return sendErrorResponse(res, 'Failed to resend credentials', 500, error.message);
        }
    }
}

module.exports = new AdminController();