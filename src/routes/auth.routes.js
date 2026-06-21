const express = require('express');
const authController = require('../controllers/auth.controller');
const { registerValidationRules, loginValidationRules } = require('../validators/auth.validator');
const validateRequest = require('../middleware/validateRequest.middleware');
const { authLimiter } = require('../middleware/rateLimiter.middleware');

const router = express.Router();

// Apply stacked auth rate limiting to mitigate credentials brute-force/stuffing attempts
router.post('/register', authLimiter, registerValidationRules, validateRequest, authController.register);
router.post('/login', authLimiter, loginValidationRules, validateRequest, authController.login);

module.exports = router;
