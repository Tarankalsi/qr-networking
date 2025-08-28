
const express = require('express');
const PublicController = require('../controllers/PublicController');
const router = express.Router();

// Get exhibitor profile by slug (QR code destination)
router.get('/profile/:slug', PublicController.getProfile);



module.exports = router;