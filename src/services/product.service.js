const Product = require('../models/Product.model');
const ApiError = require('../utils/ApiError');

/**
 * Finds an active product by its MongoDB _id.
 * Throws a 404 ApiError if the product does not exist, is inactive, or if an invalid ID structure causes query failure.
 */
const findActiveProductById = async (productId) => {
  let product;
  try {
    product = await Product.findById(productId);
  } catch (error) {
    // Ensures that raw Mongoose CastErrors for malformed ObjectIds do not escape,
    // translating them into expected 404 ApiErrors.
    throw new ApiError(404, 'Product not found or unavailable');
  }

  if (!product || !product.isActive) {
    throw new ApiError(404, 'Product not found or unavailable');
  }

  return product;
};

/**
 * Asserts that the product has enough stock.
 * Throws a 400 ApiError with available and requested stock details if stock is insufficient.
 */
const assertSufficientStock = (product, requestedQuantity) => {
  if (requestedQuantity > product.stock) {
    throw new ApiError(400, 'Insufficient stock', {
      available: product.stock,
      requested: requestedQuantity
    });
  }
};

module.exports = {
  findActiveProductById,
  assertSufficientStock
};
