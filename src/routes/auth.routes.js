const express = require('express');
const authController = require('../controllers/auth.controller');
const { registerValidationRules, loginValidationRules } = require('../validators/auth.validator');
const validateRequest = require('../middleware/validateRequest.middleware');

const router = express.Router();

router.post('/register', registerValidationRules, validateRequest, authController.register);
router.post('/login', loginValidationRules, validateRequest, authController.login);

module.exports = router;
