const Seller = require("../modules/seller");
const bcrypt = require("bcrypt");
const mongoose = require("mongoose");
const User = require('../modules/user');

const jwt = require("jsonwebtoken");
const productSchema = require("../modules/products");
const Product = mongoose.model("Product", productSchema, "products");


exports.addSeller = async (req, res) => {
  try {
    const { email, ...rest } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if seller already exists
    const existingSeller = await Seller.findOne({ email });
    if (existingSeller) {
      return res.status(409).json({ message: "Seller already exists" });
    }

    // Generate token
    const tokenCode = jwt.sign({ email }, "shivam", { expiresIn: "10h" });

    // Save seller
    const newSeller = new Seller({ email, ...rest, tokenCode });
    const savedSeller = await newSeller.save();

    return res.status(201).json(savedSeller);
  } catch (e) {
    console.error("Error in addSeller:", e);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.loginSeller = async (req, res) => {
  try {
    const email = req.body.email;
    const seller = await Seller.findOne({ email: email });
    const tokenCode = jwt.sign({ email }, "shivam", { expiresIn: "10h" });

    if (!seller) {
      return res.sendStatus(404);
    }
    seller.tokenCode = tokenCode;
    await seller.save();
    console.log("hi workink till now");
    return res.status(200).json(seller);
  } catch (e) {
    console.log("Error in loginSeller:", e);
    return res.sendStatus(500);
  }
};

// adjust path as needed

exports.verifySeller = async (req, res) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    return res.sendStatus(401); // No token provided
  }

  try {
    const decoded = jwt.verify(token, "shivam"); // will throw if expired
    const seller = await Seller.findOne({ email: decoded.email });

    if (seller) {
      return res.status(200).json(seller);
    } else {
      console.log("Not seller");
      return res.sendStatus(404); // Not found
    }
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired" });
    }
    console.error("JWT error:", err.message);
    return res.sendStatus(500);
  }
};

exports.addProduct = async (req, res) => {
  try {
    const data = req.body;
    console.log("Received product data:", data);

    if (!data || !data.seller) {
      console.log("No data or seller ID received");
      return res
        .status(400)
        .json({ message: "Missing product data or seller ID" });
    }

    // Step 1: Find seller
    const seller = await Seller.findById(data.seller);
    if (!seller) {
      console.log("No matching seller found");
      return res.status(404).json({ message: "Seller not found" });
    }

    // Step 2: Save product to Product collection
    const product = await new Product(data).save();
    if (!product) {
      console.log("Failed to create product");
      return res.status(500).json({ message: "Product creation failed" });
    }

    // Step 3: Push product._id to seller's products array
    seller.products.push(product); // 🔁 Only save ID for best practice
    await seller.save();

    return res
      .status(201)
      .json({ message: "Product added successfully", product });
  } catch (e) {
    console.error("ERROR in addProduct:", e);
    return res
      .status(500)
      .json({ message: "Internal server error", error: e.message });
  }
};

exports.removeProduct = async (req, res) => {
  const { seller: sellerId, product: productId } = req.body;

  // console.log("Received seller:", sellerId, "product:", productId);

  if (!sellerId || !productId) {
    console.log("❌ seller or product not received");
    return res.sendStatus(404);
  }

  try {
    // Step 1: Find the seller
    const seller = await Seller.findById(sellerId);
    if (!seller) {
      console.log("❌ Seller not found");
      return res.sendStatus(404);
    }

    const initialLength = seller.products.length;

    // Step 2: Remove product from embedded products
    seller.products = seller.products.filter(
      (product) => product._id.toString() !== productId
    );

    // Check if product was actually found and removed
    if (seller.products.length === initialLength) {
      console.log("⚠️ Product not found in seller's product list");
      return res.status(404).send("Product not found in seller");
    }

    await seller.save();
    console.log("✅ Embedded product removed successfully");
    res.sendStatus(200);
  } catch (error) {
    console.error("❌ Error in removeProduct:", error);
    res.sendStatus(500);
  }
};

exports.fetchSellerOrders = async (req, res) => {
  const { seller: sellerId } = req.query;
  try {
    const seller = await Seller.findOne({ _id: sellerId });
    if (!seller) {
      console.log("cant find seller");
      return res.status(404).json({ message: "Seller not found" });
    }

    return res.status(200).json({ inventory: seller.orders });
  } catch (e) {
    console.log(e);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

exports.CompletedOrder = async (req, res) => {
  const {user: userEmail, product: productId } = req.body;

  try {
    const user = await User.findOne({ email:userEmail });
    const product = await Product.findOne({ _id: productId });

    if (!user || !product) {
      console.log('User not find❌')
      return res.status(404).json({ message: "User or Product not found" });
    }

    const seller = await Seller.findOne({ _id: product.sellerId });
    if (!seller) {
      console.log('Seller not find❌')
      return res.status(404).json({ message: "Seller not found" });
    }

    user.order = user.order.filter(p => p._id.toString() !== product._id.toString());
    user.shopHistory.push(product);
    const response1 = await user.save();
    if (!response1) {
      console.log('User cant save❌')
      return res.status(500).json({ message: "User not updated" });
    }

   seller.orders = seller.orders.filter(o => {
         return o.order._id.toString() !== product._id.toString();
   });

    const response2 = await seller.save();
    if (!response2) {
      console.log('seller cant save❌')

      return res.status(500).json({ message: "Seller not updated" });
    }

    return res.sendStatus(202); 

  } catch (e) {
    console.log('❌')
    console.error(e);
    return res.sendStatus(500);
  }
};
