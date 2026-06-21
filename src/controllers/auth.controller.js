const authService = require('../services/auth.service');
const ApiResponse = require('../utils/ApiResponse');
const ApiError = require('../utils/ApiError');

const register = async (req, res, next) => {
  try {
    const { email, password, name } = req.body;
    const result = await authService.registerUser({ email, password, name });
    res.status(201).json(ApiResponse.success(result));
  } catch (error) {
    // Translate raw MongoDB duplicate key index violation (error code 11000) to a clear 400 ApiError
    if (error.code === 11000) {
      return next(new ApiError(400, 'Email already in use'));
    }
    next(error);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.loginUser({ email, password });
    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login
};
