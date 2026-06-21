const { body } = require('express-validator');

const registerValidationRules = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters long'),
  body('name')
    .notEmpty().withMessage('Name is required')
    .trim()
    .isLength({ min: 1, max: 100 }).withMessage('Name must be between 1 and 100 characters long')
];

const loginValidationRules = [
  body('email')
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Must be a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty().withMessage('Password is required')
];

module.exports = {
  registerValidationRules,
  loginValidationRules
};
