const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(new ApiError(401, 'Unauthorized'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.sub;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      const apiError = new ApiError(401, 'Token expired', null);
      apiError.code = 'TOKEN_EXPIRED';
      // Dynamically attach it to details so that the Phase 0 error handler automatically surfaces it to the client
      apiError.details = { code: 'TOKEN_EXPIRED' };
      return next(apiError);
    }
    next(new ApiError(401, 'Invalid token'));
  }
};

module.exports = authMiddleware;
