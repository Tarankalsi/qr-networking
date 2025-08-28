const sharp = require("sharp");
const QrService = require("../services/QrService");
const S3Service = require("../services/S3Service");
const { sendSuccessResponse, sendErrorResponse } = require("../utils/response");
const { profileSchema } = require("../validations/exhibitorValidation");
const prisma = require("../db");

class ProfileController {
    async getProfile(req, res) {
        try {
            const exhibitor = await req.getExhibitorDetails();
            return sendSuccessResponse(res, 'Profile retrieved successfully', exhibitor);
        } catch (error) {
            console.error('Get profile error:', error);
            return sendErrorResponse(res, 'Failed to get profile', 500, error.message);
        }
    }

    async updateProfile(req, res) {
        try {
            const exhibitor = await req.getExhibitorDetails();
            const exhibitorProfile = exhibitor.profile;

            // Support JSON profile data in req.body.payload (as stringified JSON), fallback to req.body
            let profileData = {};
            if (req.body && req.body.payload) {
                try {
                    profileData = JSON.parse(req.body.payload);
                } catch (e) {
                    return sendErrorResponse(res, 'Invalid JSON in payload', 400, 'Could not parse profile data');
                }
            } else if (req.body) {
                profileData = req.body;
            }

            // If no profile data and no files, return error
            if (Object.keys(profileData).length === 0 && (!req.files || Object.keys(req.files).length === 0)) {
                return sendErrorResponse(res, 'No data provided', 400, 'No profile data or files provided');
            }

            // Validate only if profileData has keys
            let value = {};
            if (Object.keys(profileData).length > 0) {
                const { error, value: validated } = profileSchema.validate(profileData);
                if (error) {
                    return sendErrorResponse(res, 'Validation failed', 400, error.details[0].message);
                }
                value = validated;
            } else {
                value = {};
            }

            if (!exhibitorProfile) {
                return sendErrorResponse(res, 'Profile not found', 404, 'Contact admin to create a basic profile first');
            }

            // Check if profile slug is unique (excluding own profile)
            if (value.profileSlug && value.profileSlug !== exhibitorProfile.profile_slug) {
                const existingProfile = await prisma.exhibitorProfile.findUnique({
                    where: { profile_slug: value.profileSlug }
                });
                if (existingProfile) {
                    return sendErrorResponse(res, 'Profile slug already exists', 409, 'Please choose a different profile slug');
                }
            }

            // Generate new QR code if slug changed
            let qrCodeUrl = exhibitorProfile.qr_code_url;
            if (value.profileSlug && value.profileSlug !== exhibitorProfile.profile_slug) {
                const qrResult = await QrService.generateQRCodeForProfile(value.profileSlug);
                qrCodeUrl = qrResult.qrCodeUrl;
                // Delete old QR code
                if (exhibitorProfile.qr_code_url) {
                    await S3Service.deleteFile(exhibitorProfile.qr_code_url);
                }
            }

            // Handle file uploads (logo, banner, profileImage)
            let logoUrl = exhibitorProfile.logo_url;
            let bannerUrl = exhibitorProfile.banner_url;
            let profileImageUrl = exhibitorProfile.profile_image_url;
            const files = req.files || {};

            // Logo
            if (files.logo && files.logo[0]) {
                const logoFilename = S3Service.generateLogoFilename(exhibitor.id, files.logo[0].originalname);
                logoUrl = await S3Service.uploadLogo(files.logo[0].buffer, logoFilename, files.logo[0].mimetype);
                if (exhibitorProfile.logo_url) {
                    await S3Service.deleteFile(exhibitorProfile.logo_url);
                }
            }

            // Banner
            if (files.banner && files.banner[0]) {
                const bannerFilename = `banner_${exhibitor.id}_${Date.now()}${files.banner[0].originalname.substring(files.banner[0].originalname.lastIndexOf('.'))}`;
                bannerUrl = await S3Service.uploadBanner(files.banner[0].buffer, bannerFilename, files.banner[0].mimetype);
                if (exhibitorProfile.banner_url) {
                    await S3Service.deleteFile(exhibitorProfile.banner_url);
                }
            }

            // Profile Image
            if (files.profileImage && files.profileImage[0]) {
                const profileImageFilename = `profile_${exhibitor.id}_${Date.now()}${files.profileImage[0].originalname.substring(files.profileImage[0].originalname.lastIndexOf('.'))}`;
                profileImageUrl = await S3Service.uploadBanner(files.profileImage[0].buffer, profileImageFilename, files.profileImage[0].mimetype);
                if (exhibitorProfile.profile_image_url) {
                    await S3Service.deleteFile(exhibitorProfile.profile_image_url);
                }
            }

            // Build update data (only update provided fields)
            const updateData = {
                updated_at: new Date(),
            };
            if (value.profileSlug) updateData.profile_slug = value.profileSlug;
            if (value.displayName) updateData.display_name = value.displayName;
            if (value.tagline !== undefined) updateData.tagline = value.tagline;
            if (value.description !== undefined) updateData.description = value.description;
            if (value.contactPerson) updateData.contact_person = value.contactPerson;
            if (value.contactEmail) updateData.contact_email = value.contactEmail;
            if (value.contactPhone !== undefined) updateData.contact_phone = value.contactPhone;
            if (value.websiteUrl !== undefined) updateData.website_url = value.websiteUrl;
            if (value.boothNumber !== undefined) updateData.booth_number = value.boothNumber;
            if (value.boothLocation !== undefined) updateData.booth_location = value.boothLocation;
            if (value.address !== undefined) updateData.address = value.address;
            if (value.linkedinUrl !== undefined) updateData.linkedin_url = value.linkedinUrl;
            if (value.twitterUrl !== undefined) updateData.twitter_url = value.twitterUrl;
            if (value.instagramUrl !== undefined) updateData.instagram_url = value.instagramUrl;
            if (value.facebookUrl !== undefined) updateData.facebook_url = value.facebookUrl;
            if (qrCodeUrl) updateData.qr_code_url = qrCodeUrl;
            if (logoUrl) updateData.logo_url = logoUrl;
            if (bannerUrl) updateData.banner_url = bannerUrl;
            if (profileImageUrl) updateData.profile_image_url = profileImageUrl;

            // Update profile
            const profile = await prisma.exhibitorProfile.update({
                where: { id: exhibitorProfile.id },
                data: updateData
            });
            return sendSuccessResponse(res, 'Profile updated successfully', profile);
        } catch (error) {
            console.error('Update profile error:', error);
            return sendErrorResponse(res, 'Failed to update profile', 500, error.message);
        }
    }

    async uploadLogo(req, res) {
        try {
            const exhibitor = await req.getExhibitorDetails();
            const exhibitorProfile = exhibitor.profile;
            if (!req.file) {
                return sendErrorResponse(res, 'No logo file provided', 400, 'No logo file provided');
            }
            if (!exhibitorProfile) {
                return sendErrorResponse(res, 'Profile not found. Update profile first.', 404, 'Profile not found. Update profile first.');
            }
            // Process image
            const processedImage = await sharp(req.file.buffer)
                .resize(200, 200, {
                    fit: 'inside',
                    withoutEnlargement: true,
                    background: { r: 255, g: 255, b: 255, alpha: 1 }
                })
                .jpeg({ quality: 85 })
                .toBuffer();
            // Generate filename and upload to S3
            const filename = S3Service.generateLogoFilename(exhibitor.id, req.file.originalname);
            const logoUrl = await S3Service.uploadLogo(processedImage, filename, 'image/jpeg');
            // Delete old logo if exists
            if (exhibitorProfile.logo_url) {
                await S3Service.deleteFile(exhibitorProfile.logo_url);
            }
            // Update profile
            await prisma.exhibitorProfile.update({
                where: { id: exhibitorProfile.id },
                data: {
                    logo_url: logoUrl,
                    updated_at: new Date()
                }
            });
            return sendSuccessResponse(res, 'Logo uploaded successfully', { logoUrl });
        } catch (error) {
            console.error('Logo upload error:', error);
            return sendErrorResponse(res, 'Failed to upload logo', 500, error.message);
        }
    }

    async uploadBanner(req, res) {
        try {
            const exhibitor = await req.getExhibitorDetails();
            const exhibitorProfile = exhibitor.profile;
            if (!req.file) {
                return sendErrorResponse(res, 'No banner file provided', 400, 'Please upload a banner image');
            }
            if (!exhibitorProfile) {
                return sendErrorResponse(res, 'Profile not found', 404, 'Update your profile first to upload a banner');
            }
            // Process banner image
            const processedImage = await sharp(req.file.buffer)
                .resize(800, 300, {
                    fit: 'cover',
                    position: 'center'
                })
                .jpeg({ quality: 85 })
                .toBuffer();
            // Generate filename and upload to S3
            const filename = `banner_${exhibitor.id}_${Date.now()}.jpg`;
            const bannerUrl = await S3Service.uploadBanner(processedImage, filename, 'image/jpeg');
            // Delete old banner if exists
            if (exhibitorProfile.banner_url) {
                await S3Service.deleteFile(exhibitorProfile.banner_url);
            }
            // Update profile
            await prisma.exhibitorProfile.update({
                where: { id: exhibitorProfile.id },
                data: {
                    banner_url: bannerUrl,
                    updated_at: new Date()
                }
            });
            return sendSuccessResponse(res, 'Banner uploaded successfully', { bannerUrl });
        } catch (error) {
            console.error('Banner upload error:', error);
            return sendErrorResponse(res, 'Failed to upload banner', 500, error.message);
        }
    }

    async changeProfilePublishStatus(req, res) {
        try {
            const { isPublished } = req.body;
            const exhibitor = await req.getExhibitorDetails();
            const exhibitorProfile = exhibitor.profile;
            if (typeof isPublished !== 'boolean') {
                return sendErrorResponse(res, 'Invalid request', 400, 'isPublished must be a boolean value');
            }
            if (!exhibitorProfile) {
                return sendErrorResponse(res, 'Profile not found', 404, 'You must create a profile first');
            }
            const profile = await prisma.exhibitorProfile.update({
                where: { id: exhibitorProfile.id },
                data: {
                    is_published: isPublished,
                    updated_at: new Date()
                }
            });
            return sendSuccessResponse(res, 'Profile status updated successfully', profile);
        } catch (error) {
            console.error('Publish profile error:', error);
            return sendErrorResponse(res, 'Failed to update profile status', 500, error.message);
        }
    }

    async toggleNetworking(req, res) {
        try {
            const { isActive } = req.body;
            const exhibitor = await req.getExhibitorDetails();
            const exhibitorProfile = exhibitor.profile;
            if (typeof isActive !== 'boolean') {
                return sendErrorResponse(res, 'isActive must be a boolean value', 400, 'isActive must be a boolean value');
            }
            if (!exhibitorProfile) {
                return sendErrorResponse(res, 'Profile not found', 404, 'Profile not found');
            }
            const profile = await prisma.exhibitorProfile.update({
                where: { id: exhibitorProfile.id },
                data: {
                    is_networking_active: isActive,
                    updated_at: new Date()
                }
            });
            return sendSuccessResponse(res, `Networking ${isActive ? 'activated' : 'deactivated'} successfully`, profile);
        } catch (error) {
            console.error('Toggle networking error:', error);
            return sendErrorResponse(res, 'Failed to toggle networking status', 500, error.message);
        }
    }

    async getProfileAnalytics(req, res) {
        try {
            const { startDate, endDate } = req.query;
            const exhibitor = await req.getExhibitorDetails();
            const exhibitorProfile = exhibitor.profile;
            if (!exhibitorProfile) {
                return sendErrorResponse(res, 'Profile not found', 404, 'Profile not found');
            }
            let dateFilter = {};
            if (startDate && endDate) {
                dateFilter = {
                    created_at: {
                        gte: new Date(startDate),
                        lte: new Date(endDate)
                    }
                };
            }
            // Get profile views (QR scans)
            const profileViews = await prisma.profileView.findMany({
                where: {
                    profile_id: exhibitorProfile.id,
                    viewed_at: dateFilter.created_at ? {
                        gte: dateFilter.created_at.gte,
                        lte: dateFilter.created_at.lte
                    } : undefined
                },
                include: {
                    visitor: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            company: true
                        }
                    }
                },
                orderBy: { viewed_at: 'desc' }
            });
            // Get contact interactions
            const interactions = await prisma.visitorExhibitorInteraction.findMany({
                where: {
                    profile_id: exhibitorProfile.id,
                    ...dateFilter
                },
                include: {
                    visitor: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                            company: true,
                            position: true,
                            phone: true,
                            created_at: true
                        }
                    }
                },
                orderBy: { created_at: 'desc' }
            });
            // Calculate metrics
            const totalQRScans = profileViews.length;
            const uniqueQRScans = new Set(profileViews.map(view =>
                view.visitor_id || view.ip_address
            )).size;
            const registeredVisitorScans = profileViews.filter(view => view.visitor_id).length;
            const anonymousScans = profileViews.filter(view => !view.visitor_id).length;
            const totalContactSaves = interactions.filter(i => i.contact_saved).length;
            const uniqueVisitorsWhoSaved = new Set(interactions.filter(i => i.contact_saved).map(i => i.visitor_id)).size;
            // Conversion rate: registered visitors who scanned vs who saved contact
            const registeredVisitorIds = new Set(profileViews.filter(v => v.visitor_id).map(v => v.visitor_id));
            const savedVisitorIds = new Set(interactions.filter(i => i.contact_saved).map(i => i.visitor_id));
            const conversionRate = registeredVisitorIds.size > 0
                ? ((uniqueVisitorsWhoSaved / registeredVisitorIds.size) * 100).toFixed(2)
                : 0;
            const stats = {
                // QR Scan Metrics
                totalQRScans,
                uniqueQRScans,
                registeredVisitorScans,
                anonymousScans,
                // Contact Save Metrics
                totalContactSaves,
                uniqueVisitorsWhoSaved,
                totalClicks: interactions.reduce((sum, i) => sum + i.interaction_count, 0),
                // Conversion Metrics
                conversionRate: parseFloat(conversionRate),
                scanToSaveRatio: totalQRScans > 0 ? ((totalContactSaves / totalQRScans) * 100).toFixed(2) : 0,
                // Legacy metric
                profileViews: exhibitorProfile.view_count
            };
            // Group QR scans by day for charts
            const scansByDay = profileViews.reduce((acc, view) => {
                const date = view.viewed_at.toISOString().split('T')[0];
                acc[date] = (acc[date] || 0) + 1;
                return acc;
            }, {});
            // Group contact saves by day for charts
            const savesByDay = interactions.filter(i => i.contact_saved).reduce((acc, interaction) => {
                const date = interaction.created_at.toISOString().split('T')[0];
                acc[date] = (acc[date] || 0) + 1;
                return acc;
            }, {});
            // Combine chart data
            const allDates = new Set([...Object.keys(scansByDay), ...Object.keys(savesByDay)]);
            const chartData = Array.from(allDates).map(date => ({
                date,
                qrScans: scansByDay[date] || 0,
                contactSaves: savesByDay[date] || 0
            })).sort((a, b) => new Date(a.date) - new Date(b.date));
            // Get recent QR scans with visitor info
            const recentScans = profileViews.slice(0, 10).map(view => ({
                id: view.id,
                viewedAt: view.viewed_at,
                visitor: view.visitor,
                isRegistered: !!view.visitor_id,
                ipAddress: view.visitor_id ? null : view.ip_address // Hide IP if visitor is registered
            }));
            return sendSuccessResponse(res, 'Analytics retrieved successfully', {
                exhibitor: {
                    id: exhibitor.id,
                    companyName: exhibitorProfile.company_name,
                    profileSlug: exhibitorProfile.profile_slug,
                    isPublished: exhibitorProfile.is_published
                },
                stats,
                chartData,
                recentScans,
                interactions: interactions.map(interaction => ({
                    id: interaction.id,
                    visitor: interaction.visitor,
                    contactSaved: interaction.contact_saved,
                    interactionCount: interaction.interaction_count,
                    lastInteraction: interaction.last_interaction,
                    createdAt: interaction.created_at
                }))
            });
        } catch (error) {
            console.error('Analytics error:', error);
            return sendErrorResponse(res, 'Failed to get analytics', 500, error.message);
        }
    }
}

module.exports = new ProfileController();