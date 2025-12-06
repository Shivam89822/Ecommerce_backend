require('dotenv').config();         // keep this at top
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const server = express();
server.use(express.json());
server.use(cors());

// connection flag (mutable)
let connection = false;

async function main() {
  try {
    await mongoose.connect(process.env.DATABASE_LINK, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log("Connected to DB ✅");
    connection = true;
  } catch (e) {
    console.error("DB connection failed ❌", e);
  }
}

if (!connection) {
  main();
}

// require controllers (check file names / casing)
const productController = require('./controller/productController');
const userController = require('./controller/UserController');
const sellerController = require('./controller/SellerController');

const checker = (req, res, next) => {
  console.log("✅✅✅✅✅✅ checker hit");
  next();
};

// routes
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

// Only start the server when run directly (keeps Vercel happy)
if (require.main === module) {
  const PORT = process.env.PORT || 8080;
  server.listen(PORT, () => {
    console.log(`Server is On ✅  Listening on port ${PORT}`);
  });
}

module.exports = server;
