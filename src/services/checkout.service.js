const Cart = require('../models/Cart.model');
const Product = require('../models/Product.model');
const pricingService = require('./pricing.service');
const ApiError = require('../utils/ApiError');

/**
 * Builds the checkout summary for the active cart.
 * Partitions items based on active catalog status and computes discounts.
 */
const buildCheckoutSummary = async (userId) => {
  const cart = await Cart.findOne({ userId, status: 'active' });
  if (!cart || cart.items.length === 0) {
    const apiError = new ApiError(400, 'Cart is empty');
    apiError.code = 'EMPTY_CART';
    apiError.details = { code: 'EMPTY_CART' };
    throw apiError;
  }

  const validItems = [];
  const unavailableItems = [];

  // Re-check live product active availability status
  for (const item of cart.items) {
    const product = await Product.findById(item.productId);
    if (!product || !product.isActive) {
      unavailableItems.push({
        itemId: item._id,
        sku: item.sku,
        name: item.name,
        reason: 'Product no longer available'
      });
    } else {
      validItems.push(item);
    }
  }

  // If no items remain valid after deactivation check, treat as empty cart
  if (validItems.length === 0) {
    const apiError = new ApiError(400, 'Cart is empty');
    apiError.code = 'EMPTY_CART';
    apiError.details = { code: 'EMPTY_CART' };
    throw apiError;
  }

  // Calculate pricing using snapshotted unit prices per project requirements.
  // Pricing logic uses the snapshotted unitPrice rather than re-fetching live product price
  // to protect users from retrospective price fluctuations during active cart sessions.
  const pricingResult = pricingService.calculatePricing(validItems);

  return {
    ...pricingResult,
    items: validItems,
    unavailableItems
  };
};

/**
 * Confirms checkout, transitioning the cart status to checked_out and returning the final snapshot.
 */
const confirmCheckout = async (userId) => {
  // Fetch the latest cart for the user to evaluate status
  const cart = await Cart.findOne({ userId }).sort({ updatedAt: -1 });
  if (!cart || cart.items.length === 0) {
    const apiError = new ApiError(400, 'Cart is empty');
    apiError.code = 'EMPTY_CART';
    apiError.details = { code: 'EMPTY_CART' };
    throw apiError;
  }

  if (cart.status !== 'active') {
    const apiError = new ApiError(400, 'Cart already checked out or unavailable');
    apiError.code = 'CART_ALREADY_CHECKED_OUT';
    apiError.details = { code: 'CART_ALREADY_CHECKED_OUT' };
    throw apiError;
  }

  // Re-use summary builder logic to calculate finalized price snapshot
  const checkoutSummary = await buildCheckoutSummary(userId);

  cart.status = 'checked_out';
  // Clear expiresAt so that checked-out/confirmed carts are not deleted by the TTL monitor
  cart.expiresAt = undefined;
  await cart.save();

  return {
    ...checkoutSummary,
    cartStatus: cart.status
  };
};

module.exports = {
  buildCheckoutSummary,
  confirmCheckout
};
