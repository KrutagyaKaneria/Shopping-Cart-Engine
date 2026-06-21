const rateLimit = require('express-rate-limit');
const ApiError = require('../utils/ApiError');

// Global rate limiter configuration
const globalLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS),
  max: Number(process.env.RATE_LIMIT_MAX),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new ApiError(429, 'Too many requests, please try again later'));
  }
});

// Stricter rate limiter configuration for auth/login endpoints
// Authenticating endpoints are given a lower rate threshold to mitigate credential stuffing
// and brute-force attacks, isolated from the global request limit allocation.
const authLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_WINDOW_MS),
  max: Number(process.env.AUTH_RATE_LIMIT_MAX),
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(new ApiError(429, 'Too many authentication attempts, please try again later'));
  }
});

module.exports = {
  globalLimiter,
  authLimiter
};
