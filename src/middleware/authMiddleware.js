const jwt = require('jsonwebtoken');
const prisma = require('../db');
const { sendErrorResponse } = require('../utils/response');

// Verify exhibitor JWT token
const verifyExhibitorToken = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Attach exhibitor ID only
    req.exhibitorId = decoded.exhibitorId;

    // Unified lazy loader for exhibitor details
    req.getExhibitorDetails = async () => {
      if (!req._exhibitorDetails) {
        const exhibitorAuth = await prisma.exhibitorAuth.findUnique({
          where: { id: req.exhibitorId },
          include: {
            profile: true,
            event: {
              select: {
                id: true,
                title: true
              }
            }
          }
        });
        if (!exhibitorAuth || !exhibitorAuth.is_active) {
          throw new Error('Invalid or inactive exhibitor');
        }
        // Remove password_hash if present
        if (exhibitorAuth.password_hash) delete exhibitorAuth.password_hash;
        req._exhibitorDetails = exhibitorAuth;
      }
      return req._exhibitorDetails;
    };

  next();

  } catch (error) {
    console.error('Token verification error:', error);
    return res.status(401).json({ error: error.message === 'Invalid or inactive exhibitor' ? error.message : 'Invalid token' });
  }
};

// Verify visitor session
const requireVisitor = async (req, res, next) => {
  if (!req.session.visitorId) {
    return res.status(401).json({ 
      error: 'Visitor registration required',
      code: 'VISITOR_NOT_REGISTERED'
    });
  }
  
  try {
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
    if (!visitor) {
      req.session.destroy();
      return sendErrorResponse(res, 'Invalid visitor session', 401, 'INVALID_SESSION');
    }
    req.visitor = visitor;
    next();
  } catch (error) {
    console.error('Visitor validation error:', error);
    return sendErrorResponse(res, 'Session validation failed', 500, error.message);

  }
};

module.exports = {
  verifyExhibitorToken,
  requireVisitor
};