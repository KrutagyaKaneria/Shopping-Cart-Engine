const ApiError = require('../utils/ApiError');
const ApiResponse = require('../utils/ApiResponse');
const logger = require('../utils/logger');

// Express error-handling middleware must have 4 parameters: (err, req, res, next)
// eslint-disable-next-line no-unused-vars
const errorHandlerMiddleware = (err, req, res, next) => {
  // Always log the full error server-side with its stack if available
  logger.error(err.stack || err.message || err);

  let statusCode = 500;
  let message = 'Internal Server Error';
  let details = null;

  if (err instanceof ApiError) {
    statusCode = err.statusCode;
    message = err.message;
    details = err.details;
  } else if (err.name === 'ValidationError') {
    // Handle Mongoose validation errors
    statusCode = 400;
    message = 'Validation Error';
    details = {};
    if (err.errors) {
      Object.keys(err.errors).forEach((key) => {
        details[key] = err.errors[key].message;
      });
    }
  } else {
    // Generic fallback for unhandled operational/programming errors
    message = err.message || 'Internal Server Error';
  }

  // Build the error details object, ensuring the stack is never leaked in production
  let responseDetails = details;
  if (process.env.NODE_ENV !== 'production') {
    if (typeof responseDetails === 'object' && responseDetails !== null) {
      responseDetails = { ...responseDetails, stack: err.stack };
    } else if (responseDetails !== null) {
      responseDetails = { details: responseDetails, stack: err.stack };
    } else {
      responseDetails = { stack: err.stack };
    }
  }

  res.status(statusCode).json(ApiResponse.failure(statusCode, message, responseDetails));
};

module.exports = errorHandlerMiddleware;
