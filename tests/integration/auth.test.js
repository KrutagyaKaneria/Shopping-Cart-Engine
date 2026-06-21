const { connectTestDb, closeTestDb, clearTestDb } = require('../setup/testDb');
const request = require('supertest');
const app = require('../../app');

describe('Auth Integration Tests', () => {
  beforeAll(async () => {
    await connectTestDb();
  });

  afterEach(async () => {
    await clearTestDb();
  });

  afterAll(async () => {
    await closeTestDb();
  });

  test('POST /api/v1/auth/register - should register a new user successfully', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'securePassword123',
        name: 'John Doe'
      });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
    expect(response.body.data.user).toBeDefined();
    expect(response.body.data.user.email).toBe('test@example.com');
    expect(response.body.data.user.name).toBe('John Doe');
    expect(response.body.data.user.passwordHash).toBeUndefined();
  });

  test('POST /api/v1/auth/register - should fail when email is already registered', async () => {
    // First register
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'duplicate@example.com',
        password: 'securePassword123',
        name: 'John Doe'
      });

    // Second registration with the same email
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'duplicate@example.com',
        password: 'anotherPassword123',
        name: 'Jane Doe'
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toMatch(/already/i);
  });

  test('POST /api/v1/auth/register - should fail with invalid email format', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'invalid-email-format',
        password: 'securePassword123',
        name: 'John Doe'
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toBe('Invalid request payload');
    // Field-level details mentioning 'email'
    const details = JSON.stringify(response.body.error.details);
    expect(details).toContain('email');
  });

  test('POST /api/v1/auth/register - should fail with short password (7 characters)', async () => {
    const response = await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'test@example.com',
        password: 'short7c',
        name: 'John Doe'
      });

    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(response.body.error.message).toBe('Invalid request payload');
    // Field-level details mentioning 'password'
    const details = JSON.stringify(response.body.error.details);
    expect(details).toContain('password');
  });

  test('POST /api/v1/auth/login - should login user successfully with correct credentials', async () => {
    // Register the user first
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'login@example.com',
        password: 'securePassword123',
        name: 'John Doe'
      });

    const response = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'login@example.com',
        password: 'securePassword123'
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.data.token).toBeDefined();
    expect(response.body.data.user.email).toBe('login@example.com');
  });

  test('POST /api/v1/auth/login - should fail with identical error message for wrong password and nonexistent email', async () => {
    // Register a valid user
    await request(app)
      .post('/api/v1/auth/register')
      .send({
        email: 'login@example.com',
        password: 'securePassword123',
        name: 'John Doe'
      });

    // 1. Login with wrong password
    const resWrongPassword = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'login@example.com',
        password: 'wrongPassword123'
      });

    expect(resWrongPassword.status).toBe(401);
    expect(resWrongPassword.body.success).toBe(false);
    expect(resWrongPassword.body.error.message).toBe('Invalid credentials');

    // 2. Login with nonexistent email
    const resNonexistentEmail = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'nonexistent@example.com',
        password: 'securePassword123'
      });

    expect(resNonexistentEmail.status).toBe(401);
    expect(resNonexistentEmail.body.success).toBe(false);
    expect(resNonexistentEmail.body.error.message).toBe('Invalid credentials');

    // Assert message equality between the two cases
    expect(resWrongPassword.body.error.message).toBe(resNonexistentEmail.body.error.message);
  });
});
