require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const serverless = require('serverless-http'); // Ensure this is installed: npm install serverless-http

const server = express();

// 1. Basic Middleware
server.use(express.json());
server.use(cors()); // Allow all origins by default

// 🚀 2. ROOT ROUTE (Top Priority)
// This sits BEFORE the database connection so it always opens instantly.
server.get('/', (req, res) => {
  res.send('Server is running ✅ (Database check skipped for this route)');
});

// -- MONGOOSE CONNECTION LOGIC --
async function connectDB() {
  const uri = process.env.DATABASE_LINK;
  if (!uri) throw new Error('Missing DATABASE_LINK environment variable');

  // If already connected, reuse existing connection
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    return;
  }

  // If connection is in progress, wait for it
  if (global.__mongooseConnect) {
    await global.__mongooseConnect;
    return;
  }

  // Start new connection
  global.__mongooseConnect = mongoose.connect(uri);

  try {
    await global.__mongooseConnect;
    console.log('Connected to DB ✅');
  } catch (err) {
    console.error('DB connection failed ❌', err);
    global.__mongooseConnect = null; // Reset promise so we can try again
    throw err;
  }
}

// 🛑 3. DATABASE MIDDLEWARE
// This forces every route BELOW this line to wait for the DB connection.
// This prevents the "spinning/loading" issue on cold starts.
server.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error('Middleware DB Error:', err);
    res.status(500).json({ error: 'Database connection failed' });
  }
});

// 4. LOAD CONTROLLERS
// Wrapped in try/catch to debug file name casing issues on Vercel (Linux)
let productController, userController, sellerController;
try {
  productController = require('./controller/productController');
  userController = require('./controller/UserController');
  sellerController = require('./controller/SellerController');
} catch (err) {
  console.error('CRITICAL: Controller load failed. Check file names!', err);
  // We throw here because the app cannot function without controllers
  throw err; 
}

const checker = (req, res, next) => {
  console.log('✅ checker hit');
  next();
};

// 5. APPLICATION ROUTES
// These will only run AFTER the DB is connected
server.get('/products', productController.getProducts);
server.post('/login', userController.Login);
server.post('/signup', userController.createUser);
server.post('/user', userController.verification);
server.get('/products/items/:id', productController.getSpecificProduct);
server.post('/products/addData', productController.addProductToCart);
server.post('/products/removeData', productController.removeProduct);
server.post('/user/addAddress', userController.addAddress);
server.post('/user/removeAddress', userController.removeAddress);
server.post('/sellerLogin', sellerController.addSeller);
server.post('/sellerLoginVerify', sellerController.loginSeller);
server.post('/verifyTheSeller', sellerController.verifySeller);
server.post('/addProduct', sellerController.addProduct);
server.post('/removeProduct', sellerController.removeProduct);
server.post('/products/placeOrder', userController.placeOrder);
server.get('/fetchOrders', userController.fetchOrders);
server.post('/cancelOrder', userController.cancelOrder);
server.get('/getOrderForComplete', sellerController.fetchSellerOrders);
server.post('/CompletedOrder', sellerController.CompletedOrder);
server.get('/FetchOrderedProduct', userController.GetHistory);
server.post('/postReview', checker, productController.postReview);

// 6. GLOBAL ERROR HANDLER
server.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error', details: err.message });
});

// 7. LOCAL DEVELOPMENT START
if (require.main === module) {
  const PORT = process.env.PORT || 8080;
  server.listen(PORT, () => {
    console.log(`Server is On ✅ Listening on port ${PORT}`);
  });
}

// 8. EXPORT FOR VERCEL
module.exports = serverless(server);