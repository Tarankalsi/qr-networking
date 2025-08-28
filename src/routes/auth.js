const express = require('express');
const { verifyExhibitorToken } = require('../middleware/authMiddleware');
const AuthController = require('../controllers/AuthController');
const router = express.Router();


// Exhibitor login
router.post('/login', AuthController.login);

// Get current exhibitor info
router.get('/exhibitor', verifyExhibitorToken, AuthController.getExhibitorDetails);

// Change password
router.post('/change-password', verifyExhibitorToken, AuthController.changePassword);

// Logout
router.post('/logout', verifyExhibitorToken, (req, res) => {
  res.json({
    success: true,
    message: 'Logged out successfully'
  });
});

// Get detailed QR scan analytics
router.get('/qr-analytics', verifyExhibitorToken,
  AuthController.getQrAnalytics
);

// Refresh access token using refresh token in cookies
router.post('/refresh-token', AuthController.refreshToken);

module.exports = router;