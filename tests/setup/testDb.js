// Pre-set essential environment variables before other files require src/config/env.js
process.env.NODE_ENV = 'test';
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test_secret_for_jwt_signature_verification_purposes_only';
}
if (!process.env.MONGO_URI) {
  // Placeholder URI to pass config validation before the memory server URI is set
  process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/placeholder-test';
}
// Set rate limits high for tests to prevent 429 errors from interfering with the test suite
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '100000';
process.env.AUTH_RATE_LIMIT_MAX = '100000';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongoServer;

/**
 * Connects to the in-memory MongoDB server.
 * Note: We run tests in-band (--runInBand) to avoid port/instance collisions and ensure clean test database isolation.
 */
const connectTestDb = async () => {
  if (mongoServer) {
    return;
  }
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  process.env.MONGO_URI = uri;
  await mongoose.connect(uri);
};

const closeTestDb = async () => {
  await mongoose.disconnect();
  if (mongoServer) {
    await mongoServer.stop();
    mongoServer = null;
  }
};

const clearTestDb = async () => {
  if (mongoose.connection.readyState !== 0) {
    const collections = mongoose.connection.collections;
    for (const key in collections) {
      await collections[key].deleteMany({});
    }
  }
};

module.exports = {
  connectTestDb,
  closeTestDb,
  clearTestDb
};
