const express = require('express');
const checkoutController = require('../controllers/checkout.controller');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Enforce JWT authentication on all checkout endpoints
router.use(authMiddleware);

router.get('/summary', checkoutController.getSummary);
router.post('/confirm', checkoutController.confirm);

module.exports = router;
