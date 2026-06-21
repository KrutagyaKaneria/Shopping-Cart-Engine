// Load and validate environment variables first
require('./src/config/env');

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const logger = require('./src/utils/logger');
const routes = require('./src/routes');
const { globalLimiter } = require('./src/middleware/rateLimiter.middleware');
const notFoundMiddleware = require('./src/middleware/notFound.middleware');
const errorHandlerMiddleware = require('./src/middleware/errorHandler.middleware');

const app = express();

app.use(helmet());
app.use(cors({ origin: process.env.CORS_ORIGIN }));
app.use(express.json());

// Stream morgan log messages into our custom winston logger
app.use(
  morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim())
    }
  })
);

// Mount versioned API routes with global rate limiting applied
app.use('/api/v1', globalLimiter, routes);

// Fallback for non-existent route paths
app.use(notFoundMiddleware);

// Register global error handler (must be last middleware)
app.use(errorHandlerMiddleware);

module.exports = app;
