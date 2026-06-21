const express = require('express');
const cartController = require('../controllers/cart.controller');
const {
  addItemValidationRules,
  updateItemValidationRules,
  itemIdParamValidationRules
} = require('../validators/cart.validator');
const validateRequest = require('../middleware/validateRequest.middleware');
const authMiddleware = require('../middleware/auth.middleware');

const router = express.Router();

// Enforce JWT authentication on all cart management endpoints
router.use(authMiddleware);

router.get('/', cartController.getCart);
router.post('/items', addItemValidationRules, validateRequest, cartController.addItem);
router.patch('/items/:itemId', updateItemValidationRules, validateRequest, cartController.updateItem);
router.delete('/items/:itemId', itemIdParamValidationRules, validateRequest, cartController.removeItem);
router.delete('/', cartController.clearCart);

module.exports = router;
