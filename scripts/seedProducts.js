// Load environment variables before importing other modules
require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../src/config/db');
const Product = require('../src/models/Product.model');
const logger = require('../src/utils/logger');

const products = [
  // Electronics
  {
    sku: 'ELEC-HD-001',
    name: 'Noise Cancelling Headphones',
    category: 'Electronics',
    price: 150.00,
    stock: 50,
    isActive: true
  },
  {
    sku: 'ELEC-MS-002',
    name: 'Wireless Mouse',
    category: 'Electronics',
    price: 18.50,
    stock: 120,
    isActive: true
  },
  {
    sku: 'ELEC-MN-003',
    name: '4K Monitor 27-inch',
    category: 'Electronics',
    price: 280.00,
    stock: 25,
    isActive: true
  },
  {
    sku: 'ELEC-SW-004',
    name: 'Smartwatch Series 5',
    category: 'Electronics',
    price: 220.00,
    stock: 40,
    isActive: true
  },
  // Books
  {
    sku: 'BOOK-JS-001',
    name: 'Mastering Node.js',
    category: 'Books',
    price: 32.99,
    stock: 200,
    isActive: true
  },
  {
    sku: 'BOOK-CD-002',
    name: 'The Road to Coding',
    category: 'Books',
    price: 8.99,
    stock: 150,
    isActive: true
  },
  // Home & Kitchen
  {
    sku: 'HOME-AF-001',
    name: 'Air Fryer XL',
    category: 'Home & Kitchen',
    price: 120.00,
    stock: 30,
    isActive: true
  },
  {
    sku: 'HOME-MG-002',
    name: 'Ceramic Coffee Mug Set',
    category: 'Home & Kitchen',
    price: 14.99,
    stock: 80,
    isActive: true
  },
  {
    sku: 'HOME-SP-003',
    name: 'Kitchen Sponge Set',
    category: 'Home & Kitchen',
    price: 4.50,
    stock: 500,
    isActive: true
  },
  // Sports
  {
    sku: 'SPRT-BK-001',
    name: 'Mountain Bike',
    category: 'Sports',
    price: 450.00,
    stock: 15,
    isActive: true
  },
  {
    sku: 'SPRT-TM-002',
    name: 'Treadmill Compact',
    category: 'Sports',
    price: 799.99,
    stock: 8,
    isActive: true
  },
  {
    sku: 'SPRT-YM-003',
    name: 'Yoga Mat Non-Slip',
    category: 'Sports',
    price: 25.00,
    stock: 100,
    isActive: true
  },
  // Apparel
  {
    sku: 'APPR-HD-001',
    name: 'Premium Cotton Hoodie',
    category: 'Apparel',
    price: 45.00,
    stock: 75,
    isActive: true
  },
  {
    sku: 'APPR-SK-002',
    name: 'Classic Cotton Socks',
    category: 'Apparel',
    price: 5.99,
    stock: 300,
    isActive: true
  },
  {
    sku: 'APPR-LJ-003',
    name: 'Leather Jacket',
    category: 'Apparel',
    price: 199.99,
    stock: 20,
    isActive: true
  },
  // Beauty
  {
    sku: 'BEAU-LB-001',
    name: 'Organic Lip Balm',
    category: 'Beauty',
    price: 3.99,
    stock: 400,
    isActive: true
  },
  {
    sku: 'BEAU-FS-002',
    name: 'Hydrating Face Serum',
    category: 'Beauty',
    price: 28.00,
    stock: 110,
    isActive: true
  },
  // Toys
  {
    sku: 'TOYS-BB-001',
    name: 'Building Blocks Set',
    category: 'Toys',
    price: 35.00,
    stock: 90,
    isActive: true
  },
  {
    sku: 'TOYS-TB-002',
    name: 'Teddy Bear Classic',
    category: 'Toys',
    price: 12.50,
    stock: 150,
    isActive: true
  }
];

const seedDB = async () => {
  try {
    await connectDB();

    let processedCount = 0;
    for (const productData of products) {
      // Using findOneAndUpdate with unique key (sku) and upsert: true makes this script idempotent.
      // Re-running this script will update existing records matching the sku, avoiding duplicate creation.
      await Product.findOneAndUpdate(
        { sku: productData.sku },
        productData,
        { upsert: true, new: true }
      );
      processedCount++;
    }

    logger.info(`Database seeding completed: ${processedCount} products processed.`);
    await mongoose.connection.close();
    // Exits cleanly if executed directly as a script
    if (require.main === module) {
      process.exit(0);
    }
  } catch (error) {
    logger.error(`Database seeding failed: ${error.message}`);
    if (require.main === module) {
      process.exit(1);
    }
    throw error;
  }
};

if (require.main === module) {
  seedDB();
}

module.exports = seedDB;
