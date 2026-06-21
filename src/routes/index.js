const express = require('express');
const healthRoutes = require('./health.routes');
const authRoutes = require('./auth.routes');
const cartRoutes = require('./cart.routes');
const checkoutRoutes = require('./checkout.routes');

const router = express.Router();

router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/cart', cartRoutes);
router.use('/checkout', checkoutRoutes);

module.exports = router;
