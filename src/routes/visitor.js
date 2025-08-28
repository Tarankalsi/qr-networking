const express = require('express');

const { requireVisitor } = require('../middleware/authMiddleware');

const VisitorController = require('../controllers/VisitorController');
const router = express.Router();



// Register visitor
router.post('/register', VisitorController.registerVisitor);

// Check session
router.get('/session/check', VisitorController.checkVisitorSession);

// Save contact (main feature)
router.post('/profile/:slug/save-contact', requireVisitor, VisitorController.saveContact);

// Get interaction status
router.get('/profile/:slug/interaction', requireVisitor, VisitorController.getInteractionStatus);

module.exports = router;