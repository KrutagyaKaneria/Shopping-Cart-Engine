const mongoose = require('mongoose');
const logger = require('../utils/logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000
    });
    logger.info(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    // A database connection failure is fatal for this engine, so we log the details and exit.
    logger.error(`MongoDB connection error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
