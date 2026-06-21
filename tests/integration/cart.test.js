const { connectTestDb, closeTestDb, clearTestDb } = require('../setup/testDb');
const request = require('supertest');
const app = require('../../app');
const Product = require('../../src/models/Product.model');
const mongoose = require('mongoose');

describe('Cart Integration Tests', () => {
  let tokenA;
  let tokenB;
  let productActiveA; // Electronics, price: 100.00, stock: 10
  let productActiveB; // Books, price: 15.00, stock: 5
  let productLowStock; // Clothing, price: 30.00, stock: 0
  let productInactive; // Home, price: 45.00, stock: 10, isActive: false

  beforeAll(async () => {
    await connectTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  beforeEach(async () => {
    await clearTestDb();

    // 1. Seed products with known fields directly via Mongoose model
    productActiveA = await Product.create({
      sku: 'PROD-A',
      name: 'Product A',
      category: 'Electronics',
      price: 100.00,
      stock: 10,
      isActive: true
    });

    productActiveB = await Product.create({
      sku: 'PROD-B',
      name: 'Product B',
      category: 'Books',
      price: 15.00,
      stock: 5,
      isActive: true
    });

    productLowStock = await Product.create({
      sku: 'PROD-C',
      name: 'Product C',
      category: 'Clothing',
      price: 30.00,
      stock: 0,
      isActive: true
    });

    productInactive = await Product.create({
      sku: 'PROD-D',
      name: 'Product D',
      category: 'Home',
      price: 45.00,
      stock: 10,
      isActive: false
    });

    // 2. Register User A and User B to obtain separate authorization tokens
    const resA = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'usera@example.com',
        password: 'password123',
        name: 'User A'
      });
    tokenA = resA.body.data.token;

    const resB = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'userb@example.com',
        password: 'password123',
        name: 'User B'
      });
    tokenB = resB.body.data.token;
  });

  test('GET /api/v1/cart - should return 200 with empty active cart for new user', async () => {
    const res = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.cart).toBeDefined();
    expect(res.body.data.cart.items).toEqual([]);
    expect(res.body.data.cart.status).toBe('active');
  });

  test('POST /api/v1/cart/items - should add item and resolve price and category from server', async () => {
    // Intentionally omit unit price or category from client payload to confirm server resolution
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        productId: productActiveA._id.toString(),
        quantity: 2
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    const cart = res.body.data.cart;
    expect(cart.items.length).toBe(1);
    expect(cart.items[0].productId.toString()).toBe(productActiveA._id.toString());
    expect(cart.items[0].quantity).toBe(2);
    expect(cart.items[0].unitPrice).toBe(100.00);
    expect(cart.items[0].category).toBe('Electronics');
  });

  test('POST /api/v1/cart/items - should increment quantity when adding duplicate product', async () => {
    // Add first time
    await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        productId: productActiveA._id.toString(),
        quantity: 2
      });

    // Add second time
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        productId: productActiveA._id.toString(),
        quantity: 3
      });

    expect(res.status).toBe(201);
    const cart = res.body.data.cart;
    expect(cart.items.length).toBe(1); // Line item length remains 1
    expect(cart.items[0].quantity).toBe(5); // Quantity incremented: 2 + 3
  });

  test('POST /api/v1/cart/items - should fail (404) when product is inactive', async () => {
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        productId: productInactive._id.toString(),
        quantity: 1
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Product not found or unavailable');
  });

  test('POST /api/v1/cart/items - should fail (400) when adding quantity exceeding stock', async () => {
    const res = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        productId: productActiveB._id.toString(), // stock is 5
        quantity: 6
      });

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.message).toContain('Insufficient stock');
    expect(res.body.error.details.available).toBe(5);
  });

  test('PATCH /api/v1/cart/items/:itemId - should update quantity for a valid item', async () => {
    const addRes = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        productId: productActiveA._id.toString(),
        quantity: 2
      });

    const itemId = addRes.body.data.cart.items[0]._id;

    const res = await request(app)
      .patch(`/api/v1/cart/items/${itemId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        quantity: 4
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.cart.items[0].quantity).toBe(4);
  });

  test('PATCH /api/v1/cart/items/:itemId - should return 404 for nonexistent itemId', async () => {
    const fakeItemId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .patch(`/api/v1/cart/items/${fakeItemId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        quantity: 2
      });

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('DELETE /api/v1/cart/items/:itemId - should remove the item from the cart', async () => {
    const addRes = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        productId: productActiveA._id.toString(),
        quantity: 2
      });

    const itemId = addRes.body.data.cart.items[0]._id;

    const res = await request(app)
      .delete(`/api/v1/cart/items/${itemId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.cart.items.length).toBe(0);
  });

  test('DELETE /api/v1/cart/items/:itemId - should return 404 for nonexistent itemId', async () => {
    const fakeItemId = new mongoose.Types.ObjectId().toString();
    const res = await request(app)
      .delete(`/api/v1/cart/items/${fakeItemId}`)
      .set('Authorization', `Bearer ${tokenA}`);

    expect(res.status).toBe(404);
    expect(res.body.success).toBe(false);
  });

  test('CROSS-TENANT ISOLATION - User B should not be able to modify or delete User A\'s cart items', async () => {
    // Add item to User A's cart
    const addRes = await request(app)
      .post('/api/v1/cart/items')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        productId: productActiveA._id.toString(),
        quantity: 2
      });

    const itemIdA = addRes.body.data.cart.items[0]._id;

    // Attempt PATCH using User B's token
    const patchRes = await request(app)
      .patch(`/api/v1/cart/items/${itemIdA}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        quantity: 5
      });
    expect(patchRes.status).toBe(404);

    // Attempt DELETE using User B's token
    const deleteRes = await request(app)
      .delete(`/api/v1/cart/items/${itemIdA}`)
      .set('Authorization', `Bearer ${tokenB}`);
    expect(deleteRes.status).toBe(404);

    // Verify User A's cart remains completely unaffected
    const checkRes = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', `Bearer ${tokenA}`);
    expect(checkRes.status).toBe(200);
    expect(checkRes.body.data.cart.items.length).toBe(1);
    expect(checkRes.body.data.cart.items[0].quantity).toBe(2);
  });

  test('AUTHENTICATION PROTECTION - should return 401 for requests without token or with malformed token', async () => {
    // GET request without Authorization header
    const resNoAuth = await request(app).get('/api/v1/cart');
    expect(resNoAuth.status).toBe(401);

    // GET request with malformed token
    const resMalformedAuth = await request(app)
      .get('/api/v1/cart')
      .set('Authorization', 'Bearer garbage_token');
    expect(resMalformedAuth.status).toBe(401);
  });
});
