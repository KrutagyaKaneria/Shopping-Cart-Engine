const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User.model');
const ApiError = require('../utils/ApiError');

/**
 * Signs a JWT with the user's ID as 'sub' and their role.
 * Uses process.env.JWT_SECRET and process.env.JWT_EXPIRES_IN.
 */
const signToken = (user) => {
  const payload = {
    sub: user._id.toString(),
    role: user.role
  };
  return jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d'
  });
};

/**
 * Registers a new user, hashes password, saves to database, and signs JWT.
 * Relying on Mongoose unique index for duplicate email checking; errors bubble up to controller.
 */
const registerUser = async ({ email, password, name }) => {
  const passwordHash = await bcrypt.hash(password, 10);

  const user = await User.create({
    email,
    passwordHash,
    name
  });

  const userObject = user.toObject();
  delete userObject.passwordHash;

  const token = signToken(userObject);

  return { user: userObject, token };
};

/**
 * Authenticates user credentials.
 * Throws identical generic error on user-not-found and password mismatch.
 */
const loginUser = async ({ email, password }) => {
  // Explicitly fetch passwordHash which is hidden by default in the schema
  const user = await User.findOne({ email }).select('+passwordHash');

  // To prevent user enumeration attacks, we do not disclose whether the email or password was wrong.
  // We use an identical generic error message and same 401 status code for both failure modes.
  if (!user) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const isMatch = await bcrypt.compare(password, user.passwordHash);
  if (!isMatch) {
    throw new ApiError(401, 'Invalid credentials');
  }

  const userObject = user.toObject();
  delete userObject.passwordHash;

  const token = signToken(userObject);

  return { user: userObject, token };
};

module.exports = {
  registerUser,
  loginUser,
  signToken
};
