const { connectTestDb, closeTestDb, clearTestDb } = require('../setup/testDb');
const request = require('supertest');
const app = require('../../app');
const Product = require('../../src/models/Product.model');
const Cart = require('../../src/models/Cart.model');

describe('Checkout Integration Tests', () => {
  let token;
  let productA; // Electronics, $100.00, stock 10
  let productB; // Books, $50.00, stock 10
  let productC; // Clothing, $30.00, stock 10

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    // 1. Seed products across multiple categories with specific prices
    productA = await Product.create({
      sku: 'SKU-ELECT',
      name: 'Smart Speaker',
      category: 'Electronics',
      price: 100.00,
      stock: 10,
      isActive: true
    });

    productB = await Product.create({
      sku: 'SKU-BOOK',
      name: 'Programming Guide',
      category: 'Books',
      price: 50.00,
      stock: 10,
      isActive: true
    });

    productC = await Product.create({
      sku: 'SKU-CLOTH',
      name: 'Winter Jacket',
      category: 'Clothing',
      price: 30.00,
      stock: 10,
      isActive: true
    });

    // 2. Register user to get JWT token
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'checkout.user@example.com',
        password: 'securePassword123',
        name: 'Jane Doe'
      });
    token = res.body.data.token;
  });

  test('GET /api/v1/checkout/summary - should return 400 (EMPTY_CART) for empty cart', async () => {
    const res = await request(app)
      .get('/api/v1/checkout/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Cart is empty');
    expect(res.body.error.details.code).toBe('EMPTY_CART');
  });

  test('GET /api/v1/checkout/summary - should calculate promotion values deterministically', async () => {
    // Add productA ($100), productB ($50), and productC ($30) to cart
    // Subtotal: $180.00 -> Silver Tier (10% discount)
    // 3 distinct categories -> 2% diversity bonus
    // Combined discount: 12%
    // Discount amount: $180.00 * 0.12 = $21.60
    // Final amount: $180.00 - $21.60 = $158.40

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: productA._id.toString(), quantity: 1 });

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: productB._id.toString(), quantity: 1 });

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: productC._id.toString(), quantity: 1 });

    const res = await request(app)
      .get('/api/v1/checkout/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const summary = res.body.data;
    expect(summary.subtotal).toBe(180.00);
    expect(summary.distinctCategoryCount).toBe(3);
    expect(summary.valueTier).toBe('Silver');
    expect(summary.valueDiscountPct).toBe(10);
    expect(summary.diversityBonusPct).toBe(2);
    expect(summary.totalDiscountPct).toBe(12);
    expect(summary.discountAmount).toBe(21.60);
    expect(summary.finalAmount).toBe(158.40);
    expect(summary.unavailableItems.length).toBe(0);
  });

  test('GET /api/v1/checkout/summary - should exclude deactivated product and recalculate pricing', async () => {
    // Add productA ($100), productB ($50), and productC ($30)
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: productA._id.toString(), quantity: 1 });

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: productB._id.toString(), quantity: 1 });

    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: productC._id.toString(), quantity: 1 });

    // Deactivate productC directly in MongoDB
    productC.isActive = false;
    await productC.save();

    // Recalculated Subtotal: $150.00 (productA + productB) -> Silver Tier (10%)
    // Recalculated Categories: 2 ("Electronics", "Books") -> 0% diversity bonus
    // Combined discount: 10%
    // Discount amount: $150.00 * 0.10 = $15.00
    // Final amount: $150.00 - $15.00 = $135.00

    const res = await request(app)
      .get('/api/v1/checkout/summary')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    const summary = res.body.data;
    expect(summary.subtotal).toBe(150.00);
    expect(summary.distinctCategoryCount).toBe(2);
    expect(summary.valueTier).toBe('Silver');
    expect(summary.valueDiscountPct).toBe(10);
    expect(summary.diversityBonusPct).toBe(0);
    expect(summary.totalDiscountPct).toBe(10);
    expect(summary.discountAmount).toBe(15.00);
    expect(summary.finalAmount).toBe(135.00);

    // Verify unavailableItems contains productC's details
    expect(summary.unavailableItems.length).toBe(1);
    expect(summary.unavailableItems[0].sku).toBe('SKU-CLOTH');
    expect(summary.unavailableItems[0].reason).toBe('Product no longer available');
  });

  test('POST /api/v1/checkout/confirm - should successfully checkout non-empty cart and update database state', async () => {
    // Add productA ($100)
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: productA._id.toString(), quantity: 1 });

    const res = await request(app)
      .post('/api/v1/checkout/confirm')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.cartStatus).toBe('checked_out');

    // Query database directly to verify status is 'checked_out' and expiresAt is unset
    const cart = await Cart.findOne({ status: 'checked_out' });
    expect(cart).toBeDefined();
    expect(cart.status).toBe('checked_out');
    expect(cart.expiresAt).toBeUndefined();
  });

  test('POST /api/v1/checkout/confirm - should block subsequent checkouts on already checked-out cart', async () => {
    // Add productA ($100)
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ productId: productA._id.toString(), quantity: 1 });

    // First checkout
    const res1 = await request(app)
      .post('/api/v1/checkout/confirm')
      .set('Authorization', `Bearer ${token}`);
    expect(res1.status).toBe(200);

    // Second checkout attempt
    const res2 = await request(app)
      .post('/api/v1/checkout/confirm')
      .set('Authorization', `Bearer ${token}`);
    expect(res2.status).toBe(400);
    expect(res2.body.success).toBe(false);
    expect(res2.body.error.message).toBe('Cart already checked out or unavailable');
    expect(res2.body.error.details.code).toBe('CART_ALREADY_CHECKED_OUT');
  });

  test('POST /api/v1/checkout/confirm - should fail (400) when checking out a brand-new empty cart', async () => {
    // Register another user who starts with an empty cart
    const registerRes = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'empty.user@example.com',
        password: 'securePassword123',
        name: 'Empty User'
      });
    const emptyToken = registerRes.body.data.token;

    const res = await request(app)
      .post('/api/v1/checkout/confirm')
      .set('Authorization', `Bearer ${emptyToken}`);

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toBe('Cart is empty');
    expect(res.body.error.details.code).toBe('EMPTY_CART');
  });
});
