const User = require('../modules/user');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Seller = require('../modules/seller');
const productSchema = require('../modules/products');
const Product = mongoose.model('Product', productSchema, 'products');
const orderSchema = require('../modules/order');
const Order = mongoose.model('Order', orderSchema, 'order');
require('dotenv').config();
function idGenerator() {
    const now = new Date();
    let id = `${now.getFullYear()}${now.getMonth() + 1}${now.getDate()}${now.getHours()}${now.getMinutes()}${now.getSeconds()}`;
    return Number(id); // optional: convert to number if needed
}

exports.createUser = async (req, res) => {
    try {
        const doUserExist = await User.findOne({ email: req.body.email });
        if (doUserExist) {
            return res.status(409).json({ message: "Email already registered." });
        }

        const userInfo = new User(req.body);
        const hash = bcrypt.hashSync(req.body.password, 10);
        userInfo.password = hash;
        userInfo['userId'] = idGenerator();

        const savedUser = await userInfo.save();
        console.log("User saved ✅");
        res.json(savedUser);
    } catch (e) {
        console.error("User not saved ❌", e);
        res.status(500).json({ message: "Something went wrong", error: e.message });
    }
}

exports.Login=async(req,res)=>{
    try{
        const user= await User.findOne({email:req.body.email});
        if(!user){
            console.log("Email not found")
            return res.sendStatus(404);
        }
        const auth = bcrypt.compareSync(req.body.password, user.password);
        if(!auth){
            console.log("password dont match")
            return res.sendStatus(404);
        }
        const tokenCode=jwt.sign({email:req.body.email},process.env.JWT_KEY,{ expiresIn: '10h' });
        console.log("Login✅")
        return res.json({token:tokenCode});
    }catch(e){
        console.log("Some server error❌")
        return res.sendStatus(500);
    }
}


exports.verification = async (req, res) => {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) return res.sendStatus(401); 
  
    try {
      const decoded = jwt.verify(token, process.env.JWT_KEY); // Verify token
      const user = await User.findOne({ email: decoded.email }).select("-password"); // ✅ FIXED
  
      if (!user) {
        console.log("User not found ❌");
        return res.sendStatus(404); 
      }
  
      console.log("Authorized✅");
      res.json(user); 
    } catch (e) {
      console.log("unAuthorized❌", e.message);
      return res.sendStatus(403); 
    }
  };
  
exports.addAddress=async(req,res)=>{
    try{
    const user=await User.findOne({_id:req.query.user})
    const address=req.body;
    if(!user||!address){
        return res.sendStatus(404);
    }
    user.address.push(address);
    await user.save();
    return res.sendStatus(202);
}
    catch(e){
        return res.sendStatus(404)
    }
}

exports.removeAddress=async(req,res)=>{
    try{
        const user=await User.findOne({_id:req.query.user})
        const addressIdx=req.body.idx;
        if(!user){
            return res.sendStatus(404)
        }
        user.address.splice(addressIdx,1);
        await user.save();
        return res.sendStatus(202)
    }
    catch(e){
        return res.sendStatus(404)
    }
}

exports.placeOrder = async (req, res) => {
  try {
    const data = req.body;
    // console.log(data);

    const user = await User.findOne({ email: data.email });
    if (!user) {
      console.log("Can't find user");
      return res.sendStatus(404);
    }

    user.order.push({
      ...data.order,
      sellerId: data.order.sellerId, // make sure this is present
    });

    const savedUser = await user.save();
    if (!savedUser) {
      console.log("Product not added to user");
      return res.sendStatus(404);
    }

    const seller = await Seller.findOne({ _id: data.order.sellerId });
    if (!seller) {
      console.log("Seller not found");
      return res.sendStatus(404);
    }

    const order = new Order(data);
    // const savedOrder = await order.save();
    // if (!savedOrder) {
    //   console.log("Order not saved");
    //   return res.sendStatus(404);
    // }

    seller.orders.push(order);
    const savedSeller = await seller.save();
    if (!savedSeller) {
      console.log("Seller not saved");
    }

    return res.sendStatus(202);
  } catch (e) {
    console.log(e);
    res.sendStatus(500);
  }
};



exports.fetchOrders=async(req,res)=>{
  try{
      const { user: userId } = req.query;
     const user=await User.findOne({_id:userId});
     if(!user){
      return res.send(404).json({message:"no such user exist"})
     }
     return res.json({order:user.order});
  }
  catch(e){
    console.log(e);
      return res.send(500).json({message:"some internal error"})
    
  }
}


exports.cancelOrder = async (req, res) => {
  const { user: userId, product: productId } = req.body;

  try {
    const user = await User.findOne({ _id: userId });
    const product = await Product.findOne({ _id: productId });

    if (!user || !product) {
      return res.status(404).json({ message: "User or Product not found" });
    }

    const seller = await Seller.findOne({ _id: product.sellerId });
    if (!seller) {
      return res.status(404).json({ message: "Seller not found" });
    }

    user.order = user.order.filter(p => p._id.toString() !== product._id.toString());
  

    const response1 = await user.save();
    if (!response1) {
      return res.status(500).json({ message: "User not updated" });
    }

   seller.orders = seller.orders.filter(o => {
         return o.order._id.toString() !== product._id.toString();
   });

    const response2 = await seller.save();
    if (!response2) {
      return res.status(500).json({ message: "Seller not updated" });
    }

    return res.sendStatus(202); 

  } catch (e) {
    console.error(e);
    return res.sendStatus(500);
  }
};


exports.GetHistory=async(req,res)=>{
  const {user:userId}=req.query;
  try{
    const user=await User.findOne({_id:userId});
    if(!user){
      console.log("User Not Found");
      return res.sendStatus(404);
    }
    return res.json({history:user.shopHistory});
  }catch(e){
    console.log(e);
    return res.sendStatus(500);
  }
}