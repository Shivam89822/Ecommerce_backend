require('dotenv').config(); 
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

// Note: We removed 'serverless-http' because Render runs a real server
const server = express();

// Middleware
server.use(express.json());
server.use(cors());

// 🚀 ROOT ROUTE (Health Check for Render)
// Render needs this to know your server is alive
server.get('/', (req, res) => {
  res.send('Render Backend is Running! 🚀');
});

// Load Controllers
let productController, userController, sellerController;
try {
  productController = require('./controller/productController');
  userController = require('./controller/UserController');
  sellerController = require('./controller/SellerController');
} catch (err) {
  console.error('Controller Load Error:', err.message);
}

const checker = (req, res, next) => {
  console.log('✅ checker hit');
  next();
};

// Routes
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

// Global Error Handler
server.use((err, req, res, next) => {
  console.error('Unhandled error:', err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

// -- START SERVER LOGIC --
const PORT = process.env.PORT || 8080;
const DB_URI = process.env.DATABASE_LINK;

// Connect to DB first, THEN start the server
mongoose.connect(DB_URI)
  .then(() => {
    console.log('Connected to DB ✅');
    server.listen(PORT, () => {
      console.log(`Server listening on port ${PORT} 🚀`);
    });
  })
  .catch((err) => {
    console.error('Failed to connect to DB ❌', err);
  });