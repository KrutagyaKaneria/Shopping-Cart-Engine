const VALUE_TIERS = [
  { name: 'None', min: 0, max: 49.99, discountPct: 0 },
  { name: 'Bronze', min: 50, max: 149.99, discountPct: 5 },
  { name: 'Silver', min: 150, max: 349.99, discountPct: 10 },
  { name: 'Gold', min: 350, max: 749.99, discountPct: 15 },
  { name: 'Platinum', min: 750, max: Infinity, discountPct: 20 }
];

const DIVERSITY_BUCKETS = [
  { minCategories: 1, maxCategories: 2, bonusPct: 0 },
  { minCategories: 3, maxCategories: 4, bonusPct: 2 },
  { minCategories: 5, maxCategories: 6, bonusPct: 4 },
  { minCategories: 7, maxCategories: Infinity, bonusPct: 6 }
];

// The maximum overall discount percentage allowed for any combination of promotions.
const MAX_DISCOUNT_CAP_PCT = 30;

module.exports = {
  VALUE_TIERS,
  DIVERSITY_BUCKETS,
  MAX_DISCOUNT_CAP_PCT
};
