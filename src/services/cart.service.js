const Cart = require('../models/Cart.model');
const productService = require('./product.service');
const ApiError = require('../utils/ApiError');

/**
 * Finds the active cart for a user. If none exists, creates a new active cart.
 */
const getOrCreateCart = async (userId) => {
  let cart = await Cart.findOne({ userId, status: 'active' });
  if (!cart) {
    cart = await Cart.create({ userId, items: [], status: 'active' });
  }
  return cart;
};

/**
 * Adds an item to the user's cart. Reuses product service for active state and stock checks.
 * Snapshots name, SKU, price, and category to prevent retro-active changes to user's cart.
 */
const addItemToCart = async (userId, productId, quantity) => {
  const product = await productService.findActiveProductById(productId);
  
  // Enforce initial stock availability assertion
  productService.assertSufficientStock(product, quantity);

  const cart = await getOrCreateCart(userId);

  const existingItemIndex = cart.items.findIndex(item => item.productId.toString() === productId.toString());

  if (existingItemIndex !== -1) {
    const existingItem = cart.items[existingItemIndex];
    const newQuantity = existingItem.quantity + quantity;
    
    // Enforce 100 quantity cap per item
    if (newQuantity > 100) {
      throw new ApiError(400, 'Quantity exceeds maximum allowed per item');
    }
    
    // Assert stock availability for the combined new quantity
    productService.assertSufficientStock(product, newQuantity);
    
    existingItem.quantity = newQuantity;
  } else {
    // Snapshotted fields: we snapshot sku, name, unitPrice, and category.
    // Price and category are snapshotted to preserve historical transaction values,
    // protecting them from external requests altering cart prices retrospectively.
    cart.items.push({
      productId: product._id,
      sku: product.sku,
      name: product.name,
      unitPrice: product.price,
      category: product.category,
      quantity
    });
  }

  await cart.save();
  return cart;
};

/**
 * Updates the quantity of a specific item in the user's active cart.
 * Re-validates stock levels against the requested quantity.
 */
const updateItemQuantity = async (userId, itemId, quantity) => {
  const cart = await Cart.findOne({ userId, status: 'active' });
  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  const item = cart.items.id(itemId);
  if (!item) {
    throw new ApiError(404, 'Cart item not found');
  }

  // Look up the live product to validate stock against the new requested quantity
  const product = await productService.findActiveProductById(item.productId);
  productService.assertSufficientStock(product, quantity);

  item.quantity = quantity;
  await cart.save();
  return cart;
};

/**
 * Removes a specific item from the user's active cart.
 */
const removeItem = async (userId, itemId) => {
  const cart = await Cart.findOne({ userId, status: 'active' });
  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  const item = cart.items.id(itemId);
  if (!item) {
    throw new ApiError(404, 'Cart item not found');
  }

  cart.items.pull(itemId);
  await cart.save();
  return cart;
};

/**
 * Clears all items in the user's active cart.
 */
const clearCart = async (userId) => {
  const cart = await Cart.findOne({ userId, status: 'active' });
  if (!cart) {
    throw new ApiError(404, 'Cart not found');
  }

  cart.items = [];
  await cart.save();
  return cart;
};

module.exports = {
  getOrCreateCart,
  addItemToCart,
  updateItemQuantity,
  removeItem,
  clearCart
};
