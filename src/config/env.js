// Load environment variables immediately before configuring other modules
require('dotenv').config();

const logger = require('../utils/logger');

const requiredEnvVars = ['MONGO_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingEnvVars.length > 0) {
  // Exiting early with code 1 prevents the server from starting in an invalid or insecure state.
  // This avoids runtime failures when trying to connect to the database or verify JWT signatures.
  logger.error(`FATAL CONFIGURATION ERROR: Missing required environment variable(s): ${missingEnvVars.join(', ')}.`);
  process.exit(1);
}

const config = {
  port: parseInt(process.env.PORT, 10) || 4000,
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || '*',
  mongoUri: process.env.MONGO_URI,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  },
  cart: {
    ttlHours: parseInt(process.env.CART_TTL_HOURS, 10) || 24
  },
  rateLimit: {
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 900000,
    max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
    authMax: parseInt(process.env.AUTH_RATE_LIMIT_MAX, 10) || 20
  }
};

module.exports = config;
