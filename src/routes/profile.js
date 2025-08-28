const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { verifyExhibitorToken } = require('../middleware/authMiddleware');
const QrService = require('../services/QrService');
const S3Service = require('../services/S3Service');
const { exhibitorProfile } = require('../db');
const { sendSuccessResponse, sendErrorResponse } = require('../utils/response');
const prisma = require('../db');
const ProfileController = require('../controllers/ProfileController');
const upload = require('../utils/multer');
const router = express.Router();




// Get exhibitor's profile
router.get('/my-profile', verifyExhibitorToken, ProfileController.getProfile);


// Update profile, logo, banner, and profile image in one request
router.put(
	'/update',
	verifyExhibitorToken,
	upload.fields([
		{ name: 'logo', maxCount: 1 },
		{ name: 'banner', maxCount: 1 },
		{ name: 'profileImage', maxCount: 1 }
	]),
	ProfileController.updateProfile
);

// Publish/Unpublish profile
router.patch('/publish', verifyExhibitorToken, ProfileController.changeProfilePublishStatus);

// Toggle networking
router.patch('/toggle-networking', verifyExhibitorToken, ProfileController.toggleNetworking);

// Get analytics
router.get('/analytics', verifyExhibitorToken, ProfileController.getProfileAnalytics);

module.exports = router;