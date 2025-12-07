require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const serverless = require('serverless-http');

const server = express();

// 1. Basic Middleware
server.use(express.json());
server.use(cors());

// 🚀 2. ROOT ROUTE (Must be at the top)
// This loads INSTANTLY because it doesn't wait for the database.
server.get('/', (req, res) => {
  res.send('Server is running successfully! 🚀');
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
    global.__mongooseConnect = null;
    throw err;
  }
}

// 🛑 3. DATABASE MIDDLEWARE
// Only routes BELOW this line will trigger a DB connection.
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
let productController, userController, sellerController;
try {
  productController = require('./controller/productController');
  userController = require('./controller/UserController');
  sellerController = require('./controller/SellerController');
} catch (err) {
  console.error('CRITICAL: Controller load failed.', err);
  throw err; 
}

const checker = (req, res, next) => {
  console.log('✅ checker hit');
  next();
};

// 5. APPLICATION ROUTES
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