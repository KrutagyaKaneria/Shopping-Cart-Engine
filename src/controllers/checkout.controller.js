const checkoutService = require('../services/checkout.service');
const ApiResponse = require('../utils/ApiResponse');

const getSummary = async (req, res, next) => {
  try {
    const result = await checkoutService.buildCheckoutSummary(req.userId);
    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

const confirm = async (req, res, next) => {
  try {
    const result = await checkoutService.confirmCheckout(req.userId);
    res.status(200).json(ApiResponse.success(result));
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
  confirm
};
