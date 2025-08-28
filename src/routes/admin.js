const express = require('express');
const AdminController = require('../controllers/AdminController');
const router = express.Router();


// Create exhibitor account with basic profile (simplified)
router.post('/exhibitor/create-exhibitor', AdminController.generateExhibitorCred );

// Get all exhibitors for an event
router.get('/exhibitor/:eventId', AdminController.getAllEventExhibitors);

// Toggle exhibitor account status
router.patch('/exhibitor/:exhibitorId/toggle-status', AdminController.toggleExhibitorStatus);

// Resend credentials email
router.post('/exhibitor/:exhibitorId/resend-credentials', AdminController.resendExhibitorCredentials);

// // Get event analytics
// router.get('/event/:eventId/analytics', async (req, res) => {
//   try {
//     const { eventId } = req.params;

//     const [visitors, interactions, profiles, publishedProfiles, qrScans] = await Promise.all([
//       prisma.eventVisitor.count({
//         where: { event_id: eventId }
//       }),
//       prisma.visitorExhibitorInteraction.count({
//         where: { 
//           profile: { event_id: eventId },
//           contact_saved: true
//         }
//       }),
//       prisma.exhibitorProfile.count({
//         where: { event_id: eventId }
//       }),
//       prisma.exhibitorProfile.count({
//         where: { 
//           event_id: eventId,
//           is_published: true
//         }
//       }),
//       prisma.profileView.count({
//         where: {
//           profile: { event_id: eventId }
//         }
//       })
//     ]);

//     // Get daily QR scan and contact save stats
//     const dailyStats = await prisma.$queryRaw`
//       SELECT 
//         DATE(pv.viewed_at) as date,
//         COUNT(pv.id) as qr_scans,
//         COUNT(CASE WHEN vei.contact_saved = true THEN 1 END) as contact_saves
//       FROM profile_views pv
//       LEFT JOIN visitor_exhibitor_interactions vei ON pv.profile_id = vei.profile_id AND pv.visitor_id = vei.visitor_id
//       JOIN exhibitor_profiles ep ON pv.profile_id = ep.id
//       WHERE ep.event_id = ${eventId}
//       GROUP BY DATE(pv.viewed_at)
//       ORDER BY DATE(pv.viewed_at) DESC
//       LIMIT 30
//     `;

//     // Get conversion funnel data
//     const uniqueQRScanners = await prisma.profileView.groupBy({
//       by: ['visitor_id'],
//       where: {
//         profile: { event_id: eventId },
//         visitor_id: { not: null }
//       },
//       _count: { visitor_id: true }
//     });

//     const uniqueContactSavers = await prisma.visitorExhibitorInteraction.groupBy({
//       by: ['visitor_id'],
//       where: {
//         profile: { event_id: eventId },
//         contact_saved: true
//       },
//       _count: { visitor_id: true }
//     });

//     const conversionRate = uniqueQRScanners.length > 0 
//       ? ((uniqueContactSavers.length / uniqueQRScanners.length) * 100).toFixed(2)
//       : 0;

//     res.json({
//       stats: {
//         totalVisitors: visitors,
//         totalQRScans: qrScans,
//         totalContactSaves: interactions,
//         totalProfiles: profiles,
//         publishedProfiles: publishedProfiles,
//         conversionRate: parseFloat(conversionRate),
//         avgScansPerProfile: publishedProfiles > 0 ? (qrScans / publishedProfiles).toFixed(1) : 0
//       },
//       dailyStats: dailyStats.map(stat => ({
//         date: stat.date.toISOString().split('T')[0],
//         qrScans: Number(stat.qr_scans),
//         contactSaves: Number(stat.contact_saves)
//       })),
//       conversionFunnel: {
//         registeredVisitors: visitors,
//         qrScanners: uniqueQRScanners.length,
//         contactSavers: uniqueContactSavers.length,
//         conversionRate: parseFloat(conversionRate)
//       }
//     });

//   } catch (error) {
//     console.error('Event analytics error:', error);
//     res.status(500).json({ error: 'Failed to get event analytics' });
//   }
// });

module.exports = router;