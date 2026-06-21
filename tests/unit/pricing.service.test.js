const {
  round2,
  getValueTier,
  getDiversityBonus,
  applyCap,
  calculatePricing
} = require('../../src/services/pricing.service');

describe('Pricing Service Unit Tests', () => {
  describe('getValueTier', () => {
    test('boundary at $49.99 should return None (0% discount)', () => {
      const tier = getValueTier(49.99);
      expect(tier.name).toBe('None');
      expect(tier.discountPct).toBe(0);
    });

    test('boundary at $50.00 should return Bronze (5% discount)', () => {
      const tier = getValueTier(50.00);
      expect(tier.name).toBe('Bronze');
      expect(tier.discountPct).toBe(5);
    });

    test('boundary at $149.99 should return Bronze (5% discount)', () => {
      const tier = getValueTier(149.99);
      expect(tier.name).toBe('Bronze');
      expect(tier.discountPct).toBe(5);
    });

    test('boundary at $150.00 should return Silver (10% discount)', () => {
      const tier = getValueTier(150.00);
      expect(tier.name).toBe('Silver');
      expect(tier.discountPct).toBe(10);
    });

    test('boundary at $349.99 should return Silver (10% discount)', () => {
      const tier = getValueTier(349.99);
      expect(tier.name).toBe('Silver');
      expect(tier.discountPct).toBe(10);
    });

    test('boundary at $350.00 should return Gold (15% discount)', () => {
      const tier = getValueTier(350.00);
      expect(tier.name).toBe('Gold');
      expect(tier.discountPct).toBe(15);
    });

    test('boundary at $749.99 should return Gold (15% discount)', () => {
      const tier = getValueTier(749.99);
      expect(tier.name).toBe('Gold');
      expect(tier.discountPct).toBe(15);
    });

    test('boundary at $750.00 should return Platinum (20% discount)', () => {
      const tier = getValueTier(750.00);
      expect(tier.name).toBe('Platinum');
      expect(tier.discountPct).toBe(20);
    });

    test('value beyond $750 (e.g. $1000) should return Platinum (20% discount)', () => {
      const tier = getValueTier(1000.00);
      expect(tier.name).toBe('Platinum');
      expect(tier.discountPct).toBe(20);
    });
  });

  describe('getDiversityBonus', () => {
    test('1 distinct category should return 0% bonus', () => {
      const bucket = getDiversityBonus(1);
      expect(bucket.bonusPct).toBe(0);
    });

    test('2 distinct categories should return 0% bonus', () => {
      const bucket = getDiversityBonus(2);
      expect(bucket.bonusPct).toBe(0);
    });

    test('3 distinct categories should return 2% bonus', () => {
      const bucket = getDiversityBonus(3);
      expect(bucket.bonusPct).toBe(2);
    });

    test('4 distinct categories should return 2% bonus', () => {
      const bucket = getDiversityBonus(4);
      expect(bucket.bonusPct).toBe(2);
    });

    test('5 distinct categories should return 4% bonus', () => {
      const bucket = getDiversityBonus(5);
      expect(bucket.bonusPct).toBe(4);
    });

    test('6 distinct categories should return 4% bonus', () => {
      const bucket = getDiversityBonus(6);
      expect(bucket.bonusPct).toBe(4);
    });

    test('7 distinct categories should return 6% bonus', () => {
      const bucket = getDiversityBonus(7);
      expect(bucket.bonusPct).toBe(6);
    });

    test('more than 7 distinct categories (e.g. 10) should return 6% bonus', () => {
      const bucket = getDiversityBonus(10);
      expect(bucket.bonusPct).toBe(6);
    });
  });

  describe('applyCap', () => {
    test('should return input if under max cap percentage (30%)', () => {
      expect(applyCap(15)).toBe(15);
      expect(applyCap(26)).toBe(26);
    });

    test('should cap discount percentage at 30% if sum exceeds it', () => {
      expect(applyCap(31)).toBe(30);
      expect(applyCap(45)).toBe(30);
    });
  });

  describe('calculatePricing', () => {
    test('empty items array case returns zeros and None value tier without throwing', () => {
      const pricing = calculatePricing([]);
      expect(pricing).toEqual({
        subtotal: 0,
        distinctCategoryCount: 0,
        valueTier: 'None',
        valueDiscountPct: 0,
        diversityBonusPct: 0,
        totalDiscountPct: 0,
        discountAmount: 0,
        finalAmount: 0
      });
    });

    test('rounding behavior with precision of 2 decimal places', () => {
      // Subtotal = 10.33 * 1 + 20.66 * 1 + 30.11 * 1 = 61.10
      // 3 distinct categories -> 2% diversity bonus, Value tier (Bronze) -> 5%
      // Total discount = 7%
      // Raw discount amount = 61.10 * 0.07 = 4.277
      // Expected discountAmount (rounded) = 4.28
      // Expected finalAmount = 61.10 - 4.28 = 56.82
      const items = [
        { unitPrice: 10.33, quantity: 1, category: 'A' },
        { unitPrice: 20.66, quantity: 1, category: 'B' },
        { unitPrice: 30.11, quantity: 1, category: 'C' }
      ];

      const pricing = calculatePricing(items);
      expect(pricing.subtotal).toBe(61.10);
      expect(pricing.distinctCategoryCount).toBe(3);
      expect(pricing.valueTier).toBe('Bronze');
      expect(pricing.valueDiscountPct).toBe(5);
      expect(pricing.diversityBonusPct).toBe(2);
      expect(pricing.totalDiscountPct).toBe(7);
      expect(pricing.discountAmount).toBe(4.28);
      expect(pricing.finalAmount).toBe(56.82);
    });

    test('combined discount case under the cap', () => {
      // subtotal $160 (Silver - 10%), categories: 3 (2% bonus)
      // expected combined = 12%
      const items = [
        { unitPrice: 80.00, quantity: 1, category: 'A' },
        { unitPrice: 40.00, quantity: 1, category: 'B' },
        { unitPrice: 40.00, quantity: 1, category: 'C' }
      ];

      const pricing = calculatePricing(items);
      expect(pricing.subtotal).toBe(160.00);
      expect(pricing.valueDiscountPct).toBe(10);
      expect(pricing.diversityBonusPct).toBe(2);
      expect(pricing.totalDiscountPct).toBe(12);
      expect(pricing.discountAmount).toBe(19.20);
      expect(pricing.finalAmount).toBe(140.80);
    });

    test('capping behavior on maximum achievable combination under current config', () => {
      // Platinum (20%) + 7 categories (6% bonus) = 26% (which is under the 30% cap)
      const items = [
        { unitPrice: 110.00, quantity: 1, category: 'Cat1' },
        { unitPrice: 110.00, quantity: 1, category: 'Cat2' },
        { unitPrice: 110.00, quantity: 1, category: 'Cat3' },
        { unitPrice: 110.00, quantity: 1, category: 'Cat4' },
        { unitPrice: 110.00, quantity: 1, category: 'Cat5' },
        { unitPrice: 110.00, quantity: 1, category: 'Cat6' },
        { unitPrice: 110.00, quantity: 1, category: 'Cat7' }
      ];

      const pricing = calculatePricing(items);
      expect(pricing.subtotal).toBe(770.00);
      expect(pricing.valueDiscountPct).toBe(20);
      expect(pricing.diversityBonusPct).toBe(6);
      expect(pricing.totalDiscountPct).toBe(26);
      expect(pricing.discountAmount).toBe(200.20);
      expect(pricing.finalAmount).toBe(569.80);
    });
  });
});
