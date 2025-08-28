// middleware/errorHandler.js
module.exports = (err, req, res, next) => {
  console.error('Global error:', err);
  const message = process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message;
  if (typeof res.sendErrorResponse === 'function') {
    return res.sendErrorResponse(res, 'Server error', err.status || 500, message);
  }
  res.status(err.status || 500).json({
    success: false,
    error: 'Server error',
    message
  });
};
