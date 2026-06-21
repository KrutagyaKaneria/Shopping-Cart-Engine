const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

const validateRequestMiddleware = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    // Map errors to the standard format requested: [{ field, message }]
    const details = errors.array().map((err) => ({
      field: err.path || err.param,
      message: err.msg
    }));
    return next(new ApiError(400, 'Invalid request payload', details));
  }
  next();
};

module.exports = validateRequestMiddleware;
