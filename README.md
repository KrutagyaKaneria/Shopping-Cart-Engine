# Adaptive E-Commerce Cart Engine

The Adaptive E-Commerce Cart Engine is a production-grade, highly secure, and performance-optimized backend system built with Node.js, Express, and MongoDB. It implements a complete shopping cart lifecycle including user registration and authentication, catalog item ingestion with stock validation, per-user cart isolation with static price/category snapshotting, a dynamic additive discount engine with capped promotions, and MongoDB TTL-based automatic expiration for abandoned carts. Securing the REST API is a layered defense-in-depth scheme featuring stacked rate-limiters, Helmet headers, locked CORS origins, and production-sanitized error envelopes.

---

## Setup Instructions

### Prerequisites
- **Node.js**: Version `>=18.0.0`
- **MongoDB**: A running local MongoDB instance (e.g., `mongodb://localhost:27017/cart-engine`) or a remote MongoDB Atlas connection URI string.

### Steps to Run the Project
1. **Clone the Repository** and navigate into the project root directory:
   ```bash
   cd "Shopping Cart Engine"
   ```
2. **Configure Environment Variables**:
   Copy the example environment variables file and fill in your connection details and secrets:
   ```bash
   cp .env.example .env
   ```
   Open the newly created `.env` file and customize the variables (e.g., set `MONGO_URI`, `JWT_SECRET`, and `CORS_ORIGIN`).
3. **Install Dependencies**:
   ```bash
   npm install
   ```
4. **Seed the Product Catalog**:
   Run the seeding script to populate the database catalog with 19 mock products spanning 7 distinct categories:
   ```bash
   npm run seed
   ```
5. **Start the Application**:
   - For production environments:
     ```bash
     npm start
     ```
   - For active development (with file watch capabilities):
     ```bash
     npm run dev
     ```
6. **Run Unit Tests**:
   Execute the Jest unit test suite covering the pricing engine logic:
   ```bash
   npm test
   ```

---

## Environment Variables

| Variable Name | Purpose | Example Value |
| :--- | :--- | :--- |
| `PORT` | The port number on which the Express web server listens. | `4000` |
| `NODE_ENV` | Mode of operation (`development` or `production`). Controls error stack trace visibility and log formats. | `development` |
| `MONGO_URI` | Connection URI string connecting the application to the MongoDB instance. | `mongodb://localhost:27017/cart-engine` |
| `JWT_SECRET` | Secret key used to sign and verify JSON Web Tokens (JWT) for user authorization. | `super_secret_jwt_key_change_in_production` |
| `JWT_EXPIRES_IN` | Duration indicating how long a newly signed JWT remains valid. | `7d` |
| `CART_TTL_HOURS` | Hour offset offset used to calculate automatic cart expiration timestamps. | `24` |
| `CORS_ORIGIN` | Allowed origin header for Cross-Origin Resource Sharing. Wildcards are rejected. | `http://localhost:3000` |
| `RATE_LIMIT_WINDOW_MS` | Window duration in milliseconds for tracking client request rates. | `900000` (15 mins) |
| `RATE_LIMIT_MAX` | Global maximum request allotment per window for any `/api/v1` route. | `100` |
| `AUTH_RATE_LIMIT_MAX` | Stricter max request allotment per window for authenticating endpoints. | `20` |

---

## API Route Specifications

All endpoints are prefix-mounted under `/api/v1`.

| Method | Endpoint Path | Auth Required | Request Body Shape | Success Response (200/201 OK) | Key Error Responses (400/401/404/429) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **GET** | `/health` | No | *None* | `{ success: true, data: { status: "ok", uptime: 12.3 } }` | `500` (Database down) |
| **POST** | `/auth/register` | No | `{ "name": "Alice", "email": "alice@example.com", "password": "securepassword123" }` | `{ success: true, data: { token: "eyJhbG...", user: { id: "...", name: "Alice", email: "alice@example.com", role: "customer" } } }` | `400` (Validation failed, Email in use), `429` (Auth rate limit exceeded) |
| **POST** | `/auth/login` | No | `{ "email": "alice@example.com", "password": "securepassword123" }` | `{ success: true, data: { token: "eyJhbG...", user: { id: "...", name: "Alice", email: "alice@example.com", role: "customer" } } }` | `400` (Validation failed), `410` (Invalid credentials), `429` (Auth rate limit exceeded) |
| **GET** | `/cart` | Yes | *None* | `{ success: true, data: { id: "...", userId: "...", items: [], status: "active", expiresAt: "..." } }` | `401` (Unauthorized/Expired Token), `429` (Global rate limit exceeded) |
| **POST** | `/cart/items` | Yes | `{ "productId": "6675e...", "quantity": 2 }` | `{ success: true, data: { id: "...", userId: "...", items: [ { productId: "...", sku: "...", name: "...", unitPrice: 150.00, category: "...", quantity: 2 } ], status: "active" } }` | `400` (OutOfStock / Bad ObjectId), `401` (Token invalid), `404` (Product not found) |
| **PATCH** | `/cart/items/:itemId` | Yes | `{ "quantity": 5 }` | `{ success: true, data: { ...cart } }` | `400` (OutOfStock / Max quantity exceeded), `401` (Unauthorized), `404` (Cart/Item not found) |
| **DELETE** | `/cart/items/:itemId` | Yes | *None* | `{ success: true, data: { ...cart } }` | `401` (Unauthorized), `404` (Cart/Item not found) |
| **DELETE** | `/cart` | Yes | *None* | `{ success: true, data: { ...cart (empty items) } }` | `401` (Unauthorized), `404` (Cart not found) |
| **GET** | `/checkout/summary` | Yes | *None* | `{ success: true, data: { subtotal: 300, valueTier: "Silver", tierDiscountPct: 10, categoryCount: 1, diversityBonusPct: 0, combinedDiscountPct: 10, discountAmount: 30, finalAmount: 270, items: [...], unavailableItems: [] } }` | `400` (EMPTY_CART), `401` (Unauthorized) |
| **POST** | `/checkout/confirm` | Yes | *None* | `{ success: true, data: { subtotal: 300, ..., finalAmount: 270, cartStatus: "checked_out" } }` | `400` (EMPTY_CART / CART_ALREADY_CHECKED_OUT), `401` (Unauthorized) |

---

## Session & Authentication Strategy

The application adopts a **stateless JSON Web Token (JWT)** architecture to manage user identity and authorization. 

### Why Stateless JWT over Server-Side Sessions?
1. **Scalability**: By encoding credentials and access scopes directly in the token, the application server does not need to store, sync, or look up session records in an in-memory database (e.g. Redis), allowing the backend to scale horizontally without state constraints.
2. **Native Microservice Integration**: Verified tokens contain self-contained claims ready to be parsed instantly by any downstream API layer.

### Tenant Isolation Enforcement
Strict per-user isolation is enforced by deriving ownership data directly from the verified token signature rather than trusting client-submitted payloads:
1. The client sends a valid JWT in the HTTP headers: `Authorization: Bearer <token>`.
2. The `authMiddleware` intercepts the request, verifies the signature, and binds the user ID claim to the request object: `req.userId = decoded.sub`.
3. In all Cart and Checkout services, database queries are scoped exclusively by this server-resolved `userId`:
   - e.g., `Cart.findOne({ userId: req.userId })`.
   - Client requests are prohibited from supplying or mutating target user IDs. This structural pattern blocks IDOR (Insecure Direct Object Reference) vulnerabilities.

### Token Expiration Behavior
Tokens are signed with a strict expiration payload configured via `JWT_EXPIRES_IN`. If a user attempts to access protected routes with an expired token, the `authMiddleware` intercepts the request, blocks execution, and returns a `410 Unauthorized` response featuring the custom error code `TOKEN_EXPIRED` inside the standard details payload.

---

## Promotion Engine

The promotion engine calculates order discounts using a combination of transaction values and category diversity.

### Value Tiers
Determined by the cart's pre-discount subtotal:

| Tier Name | Minimum Subtotal | Maximum Subtotal | Discount Percentage |
| :--- | :--- | :--- | :--- |
| **None** | `$0.00` | `$49.99` | `0%` |
| **Bronze** | `$50.00` | `$149.99` | `5%` |
| **Silver** | `$150.00` | `$349.99` | `10%` |
| **Gold** | `$350.00` | `$749.99` | `15%` |
| **Platinum** | `$750.00` | `Infinity` | `20%` |

### Diversity Bonuses
Granted based on the count of distinct product categories present in the active cart:

| Distinct Category Count | Bonus Discount Percentage |
| :--- | :--- |
| **1 – 2 Categories** | `0%` |
| **3 – 4 Categories** | `2%` |
| **5 – 6 Categories** | `4%` |
| **7+ Categories** | `6%` |

### Additive-with-Cap Discount Formula
Discounts are additive. The total discount rate is calculated as:
$$\text{Combined Discount \%} = \min(\text{Tier Discount \%} + \text{Diversity Bonus \%}, 30\%)$$
The combined rate is capped at **30%** (`MAX_DISCOUNT_CAP_PCT`). All calculations and final currency outputs are rounded to exactly two decimal places.

### Worked Numeric Example
Consider a cart containing:
1. **Noise Cancelling Headphones** (Category: `Electronics`): 2 units @ `$150.00` = `$300.00`
2. **Mastering Node.js** (Category: `Books`): 1 unit @ `$30.00` = `$30.00`
3. **Sports Shoes** (Category: `Sports`): 1 unit @ `$50.00` = `$50.00`

**Step-by-Step Calculation:**
1. **Compute Subtotal**:
   $$\text{Subtotal} = 300.00 + 30.00 + 50.00 = 380.00$$
2. **Determine Value Tier**:
   Subtotal `$380.00` falls within the Gold tier (`$350.00 – $749.99`), which yields a **15%** value discount.
3. **Determine Diversity Bonus**:
   There are 3 distinct categories (`Electronics`, `Books`, `Sports`), which maps to a **2%** diversity bonus.
4. **Combine Discounts**:
   $$\text{Combined Discount Rate} = 15\% + 2\% = 17\%$$
   (This is well below the 30% cap, so the rate remains `17%`).
5. **Compute Discount Amount**:
   $$\text{Discount Amount} = 380.00 \times 0.17 = 64.60$$
6. **Compute Final Amount**:
   $$\text{Final Amount} = 380.00 - 64.60 = 315.40$$

---

## Feature X — Cart Expiration

To prevent database bloat and manage stale catalog states, the system implements automated cart expiration.

### Implementation Details
- **TTL Index**: An expiration index is registered on the `expiresAt` property in the `Cart` model using Mongoose's schema options: `expiresAt: { type: Date, index: { expires: 0 } }`.
- **Mutation Refresh**: Any mutating write operation on a user's active cart (`addItemToCart`, `updateItemQuantity`, `removeItem`, `clearCart`) resets the cart's lifespan. The `expiresAt` field is set to:
  $$\text{expiresAt} = \text{Date.now()} + (\text{CART\_TTL\_HOURS} \times 60 \times 60 \times 1000)$$
- **Read Preservation**: Reading an existing cart (via `getOrCreateCart` or `GET /cart`) does not extend the lifespan. This preserves resources by allowing abandoned carts to expire naturally.
- **Checkout Persistence**: Confirming checkout removes the TTL tracker (`cart.expiresAt = undefined`) immediately before changing status to `'checked_out'`, ensuring checked-out orders are retained as permanent records.

### Engineering Justification
1. **Automatic Database Hygiene**: Stale, abandoned carts are removed automatically by MongoDB's background index manager without needing cron jobs, background processes, or worker nodes.
2. **Catalog Integrity**: Ensures reserved stock allocations do not remain locked indefinitely by abandoned sessions, returning inventory to circulation.

---

## Running Tests

### Unit Tests
Run Jest to execute the unit tests covering value tier calculations, category diversity bonuses, capping rules, and boundary limits:
```bash
npm test
```

### Integration Tests
Run the standalone integration verification suites targeting routes, controllers, and services in isolated mock environments:
- Verify Authentication and Authorization:
  ```bash
  NODE_PATH=./node_modules node src/../brain/eb15b99b-8c5d-49a0-84f2-cbc9ee20a92d/scratch/verify_phase1.js
  ```
- Verify Cart Ingestion:
  ```bash
  NODE_PATH=./node_modules node src/../brain/eb15b99b-8c5d-49a0-84f2-cbc9ee20a92d/scratch/verify_phase3.js
  ```
- Verify Checkout & Pricing Engine Integration:
  ```bash
  NODE_PATH=./node_modules node src/../brain/eb15b99b-8c5d-49a0-84f2-cbc9ee20a92d/scratch/verify_phase5.js
  ```
- Verify Cart Expiration and Recovery:
  ```bash
  NODE_PATH=./node_modules node src/../brain/eb15b99b-8c5d-49a0-84f2-cbc9ee20a92d/scratch/verify_phase6.js
  ```
- Verify Rate Limiters and Security Pass:
  ```bash
  NODE_PATH=./node_modules node src/../brain/eb15b99b-8c5d-49a0-84f2-cbc9ee20a92d/scratch/verify_phase7.js
  ```
