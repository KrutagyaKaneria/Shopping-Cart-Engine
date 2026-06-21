const { body, param } = require('express-validator');

const addItemValidationRules = [
  body('productId')
    .notEmpty().withMessage('Product ID is required')
    .isMongoId().withMessage('Invalid product ID format'),
  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isInt({ min: 1, max: 100 }).withMessage('Quantity must be an integer between 1 and 100')
];

const updateItemValidationRules = [
  param('itemId')
    .notEmpty().withMessage('Item ID is required')
    .isMongoId().withMessage('Invalid item ID format'),
  body('quantity')
    .notEmpty().withMessage('Quantity is required')
    .isInt({ min: 1, max: 100 }).withMessage('Quantity must be an integer between 1 and 100')
];

const itemIdParamValidationRules = [
  param('itemId')
    .notEmpty().withMessage('Item ID is required')
    .isMongoId().withMessage('Invalid item ID format')
];

module.exports = {
  addItemValidationRules,
  updateItemValidationRules,
  itemIdParamValidationRules
};
