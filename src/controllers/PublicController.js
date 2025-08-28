const prisma = require("../db");
const { sendSuccessResponse, sendErrorResponse } = require("../utils/response");

class PublicController {
    async getProfile(req, res) {
        try {
            const { slug } = req.params;
            const profile = await prisma.exhibitorProfile.findFirst({
                where: {
                    profile_slug: slug,
                    is_published: true,
                    is_networking_active: true
                }
            });
            if (!profile) {
                return sendErrorResponse(res, 'Profile not found or not active', 404, 'Profile not found or not active');
            }
            // Get visitor info from session (if available)
            let visitorId = null;
            if (req.session.visitorId) {
                const visitor = await prisma.eventVisitor.findUnique({
                    where: { id: req.session.visitorId }
                });
                if (visitor) {
                    visitorId = visitor.id;
                }
            }
            // Track profile view (QR scan)
            await prisma.profileView.create({
                data: {
                    profile_id: profile.id,
                    visitor_id: visitorId,
                    ip_address: req.ip || req.connection.remoteAddress,
                    user_agent: req.get('User-Agent') || null,
                    referrer: req.get('Referer') || null
                }
            });
            // Update profile view count (for backward compatibility)
            await prisma.exhibitorProfile.update({
                where: { id: profile.id },
                data: { view_count: { increment: 1 } }
            });
            return sendSuccessResponse(res, 'Profile retrieved successfully', profile);
        } catch (error) {
            console.error('Get profile error:', error);
            return sendErrorResponse(res, 'Failed to retrieve profile', 500, error.message);
        }
    }
}

module.exports = new PublicController();