const { createLogger, format, transports } = require('winston');

// Define log format for development environments
const devFormat = format.printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    format.errors({ stack: true }), // ensures error stacks are captured
    process.env.NODE_ENV === 'production'
      ? format.json()
      : format.combine(format.colorize(), devFormat)
  ),
  transports: [
    new transports.Console()
  ]
});

module.exports = logger;
