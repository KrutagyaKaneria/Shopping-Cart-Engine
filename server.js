const app = require('./app');
const connectDB = require('./src/config/db');
const logger = require('./src/utils/logger');

const PORT = process.env.PORT || 4000;

// Connect to MongoDB and start the server listener upon successful connection
connectDB().then(() => {
  app.listen(PORT, () => {
    logger.info(`Server is running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
  });
});
