require('dotenv').config(); // keep this at top
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const server = express();
server.use(express.json());
server.use(cors());

// -- MONGOOSE: reuse connection in serverless env to avoid repeated connects
async function connectDB() {
  const uri = process.env.DATABASE_LINK;
  if (!uri) {
    throw new Error('Missing DATABASE_LINK environment variable');
  }

  // If already connected, reuse the connection
  if (mongoose.connection && mongoose.connection.readyState === 1) {
    console.log('Using existing mongoose connection');
    return;
  }

  // Avoid duplicating connections in hot reload / lambda reuse
  if (global.__mongooseConnect) {
    await global.__mongooseConnect;
    return;
  }

  global.__mongooseConnect = mongoose.connect(uri, {
    // options kept minimal — Mongoose v6+ ignores legacy options
  }).then(() => {
    console.log('Connected to DB ✅');
  }).catch((err) => {
    console.error('DB connection failed ❌', err);
    // rethrow so caller knows
    throw err;
  });

  await global.__mongooseConnect;
}

// Connect once at startup (this will run in Vercel on first invocation)
connectDB().catch(err => {
  // Log the error so Vercel runtime logs show the reason for crash
  console.error('Initial DB connect error (catch):', err);
});

// require controllers with clear error message if missing (helps catch case-sensitivity)
let productController, userController, sellerController;
try {
  productController = require('./controller/productController');
  userController = require('./controller/UserController');
  sellerController = require('./controller/SellerController');
} catch (err) {
  console.error('Controller load error — check file paths and casing in ./controller/:', err);
  // rethrow so Vercel logs capture it and you can see exact stack
  throw err;
}

const checker = (req, res, next) => {
  console.log('✅✅✅✅✅✅ checker hit');
  next();
};

// routes (keep them as you had)
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

// Generic error handler so crashes show in logs and return 500
server.use((err, req, res, next) => {
  console.error('Unhandled error:', err && err.stack ? err.stack : err);
  res.status(500).json({ error: 'Internal Server Error' });
});

// Local start for dev
if (require.main === module) {
  const PORT = process.env.PORT || 8080;
  server.listen(PORT, () => {
    console.log(`Server is On ✅ Listening on port ${PORT}`);
  });
}

// Export serverless handler for Vercel
// NOTE: make sure serverless-http is in "dependencies" (not devDependencies)
const serverless = require('serverless-http');
module.exports = serverless(server);
