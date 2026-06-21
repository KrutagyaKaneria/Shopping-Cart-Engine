const cartService = require('../services/cart.service');
const ApiResponse = require('../utils/ApiResponse');

const getCart = async (req, res, next) => {
  try {
    const cart = await cartService.getOrCreateCart(req.userId);
    res.status(200).json(ApiResponse.success({ cart }));
  } catch (error) {
    next(error);
  }
};

const addItem = async (req, res, next) => {
  try {
    const { productId, quantity } = req.body;
    const cart = await cartService.addItemToCart(req.userId, productId, quantity);
    res.status(201).json(ApiResponse.success({ cart }));
  } catch (error) {
    next(error);
  }
};

const updateItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const { quantity } = req.body;
    const cart = await cartService.updateItemQuantity(req.userId, itemId, quantity);
    res.status(200).json(ApiResponse.success({ cart }));
  } catch (error) {
    next(error);
  }
};

const removeItem = async (req, res, next) => {
  try {
    const { itemId } = req.params;
    const cart = await cartService.removeItem(req.userId, itemId);
    res.status(200).json(ApiResponse.success({ cart }));
  } catch (error) {
    next(error);
  }
};

const clearCart = async (req, res, next) => {
  try {
    const cart = await cartService.clearCart(req.userId);
    res.status(200).json(ApiResponse.success({ cart }));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCart,
  addItem,
  updateItem,
  removeItem,
  clearCart
};
