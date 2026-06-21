const {
  VALUE_TIERS,
  DIVERSITY_BUCKETS,
  MAX_DISCOUNT_CAP_PCT
} = require('../config/pricingConfig');

/**
 * Rounds a number to exactly 2 decimal places in a float-safe manner.
 * Returns a number.
 */
const round2 = (num) => {
  return Math.round((num + Number.EPSILON) * 100) / 100;
};

/**
 * Finds the value tier matching the subtotal value.
 */
const getValueTier = (subtotal) => {
  return VALUE_TIERS.find(
    tier => subtotal >= tier.min && subtotal <= tier.max
  ) || { name: 'None', discountPct: 0 };
};

/**
 * Finds the diversity bonus bucket matching the distinct category count.
 */
const getDiversityBonus = (distinctCategoryCount) => {
  return DIVERSITY_BUCKETS.find(
    bucket => distinctCategoryCount >= bucket.minCategories && distinctCategoryCount <= bucket.maxCategories
  ) || { minCategories: 1, maxCategories: 2, bonusPct: 0 };
};

/**
 * Caps the combined discount percentage to ensure it does not exceed the system maximum.
 */
const applyCap = (pct) => {
  return Math.min(pct, MAX_DISCOUNT_CAP_PCT);
};

/**
 * Computes pricing details based on a plain array of items.
 * Each item has the structure: { unitPrice, quantity, category }.
 */
const calculatePricing = (items = []) => {
  if (!items || items.length === 0) {
    return {
      subtotal: 0,
      distinctCategoryCount: 0,
      valueTier: 'None',
      valueDiscountPct: 0,
      diversityBonusPct: 0,
      totalDiscountPct: 0,
      discountAmount: 0,
      finalAmount: 0
    };
  }

  // 1. Calculate raw subtotal with float-safe rounding
  const rawSubtotal = items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  const subtotal = round2(rawSubtotal);

  // 2. Count distinct categories
  const categories = new Set(items.map(item => item.category).filter(Boolean));
  const distinctCategoryCount = categories.size;

  // 3. Resolve base value tier discount
  const valueTier = getValueTier(subtotal);
  const valueDiscountPct = valueTier.discountPct;
  const valueTierName = valueTier.name;

  // 4. Resolve category diversity bonus discount
  const diversityBucket = getDiversityBonus(distinctCategoryCount);
  const diversityBonusPct = diversityBucket.bonusPct;

  // 5. Combine discounts additively.
  // We use additive logic here because both promotions target the basket as a whole
  // (value-based loyalty tier and a variety-based category reward).
  const rawTotalDiscountPct = valueDiscountPct + diversityBonusPct;

  // 6. Enforce overall discount cap limit.
  // An overall cap is applied to protect store margins from stacked promotions.
  const totalDiscountPct = applyCap(rawTotalDiscountPct);

  // 7. Calculate discount amount and final total
  const discountAmount = round2((subtotal * totalDiscountPct) / 100);
  const finalAmount = round2(subtotal - discountAmount);

  return {
    subtotal,
    distinctCategoryCount,
    valueTier: valueTierName,
    valueDiscountPct,
    diversityBonusPct,
    totalDiscountPct,
    discountAmount,
    finalAmount
  };
};

module.exports = {
  round2,
  getValueTier,
  getDiversityBonus,
  applyCap,
  calculatePricing
};
