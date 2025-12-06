const mongoose = require('mongoose');
const productSchema = require('../modules/products'); // now correctly importing the schema
const User = require('../modules/user');
const Product = mongoose.model('Product', productSchema, 'products');

// In your product controller file

exports.getProducts = async (req, res) => {
  try {
    // --- Pagination and Sorting Parameters ---
    const page = Number(req.query.page) || 1; // Current page, default to 1
    const limit = 10; // Products per page
    const skip = (page - 1) * limit; // Calculate how many products to skip

    // --- Filter Parameters ---
    const priceLimit = Number(req.query.price);
    const category = req.query.category;
    const sortBy = req.query.sort || 'low'; // 'low' or 'high', defaults to 'low'

    // --- Build the query object ---
    let filter = {};
    if (priceLimit) {
      filter["price"] = { $lt: priceLimit };
    }
    if (category && category !== 'General') {
      filter["category.name"] = category;
    }
    
    // --- Build the sort object ---
    let sortOptions = {};
    if (sortBy === 'high') {
        sortOptions.price = -1; // -1 for descending order (High to Low)
    } else {
        sortOptions.price = 1; // 1 for ascending order (Low to High)
    }

    // --- Execute queries ---
    // 1. Get the total count of products matching the filter
    const totalProducts = await Product.countDocuments(filter);

    // 2. Get the paginated products
    const products = await Product.find(filter)
      .sort(sortOptions) // Apply sorting
      .skip(skip)        // Apply pagination skip
      .limit(limit);     // Apply pagination limit

    console.log(`✅ Products Fetched: Page ${page}, Limit ${limit}`);
    
    // --- Send response with products and total count ---
    res.status(200).json({
      products,
      totalProducts,
    });

  } catch (e) {
    console.error("❌ Can't Fetch", e);
    res.sendStatus(500);
  }
};
  
  
  exports.getSpecificProduct = async (req, res) => {
    try {
      const identity = req.params.id; // <- Changed from query to params
      const product = await Product.findById(identity);
      
      if (product) {
        res.status(200).json(product);
      } else {
        res.sendStatus(404);
      }
    } catch (e) {
      console.error("Failed in fetching ❌", e);
      res.sendStatus(500);
    }
  }
  
  exports.addProductToCart=async(req,res)=>{
    try{
      const data=req.body;
      const userId=data.userId
      const productId=data.productId
      const user= await User.findOne({_id:userId})
      const product=await Product.findOne({_id:productId})
      if(!user||!product){
        res.sendStatus(404)
      }
      user.cart.push(product)
      await user.save()
      res.sendStatus(202)
    }
    catch(e){
      console.log("failed adding product")
      res.sendStatus(404)
    }

  }
  
 
  exports.removeProduct = async (req, res) => {
    try {
      const { user: userId, product: productId } = req.body;
      const user = await User.findById(userId);
      if (!user) return res.status(404).json({ error: 'User not found' });
  
      // Correct comparison using productId as string
      user.cart = user.cart.filter(item => item._id.toString() !== productId.toString());
      await user.save();
  
      res.status(200).json({ message: 'Product removed from cart', cart: user.cart });
    } catch (e) {
      console.error(e);
      res.status(500).json({ error: 'Internal server error' });
    }
  };
  


  exports.postReview=async(req,res)=>{
    try{
      console.log("hellow World😂😂😂😂");
      const {user:userId,rating:rating,text:text,product:productId}=req.body;

      const product=await Product.findOne({_id:productId});
      const user=await User.findOne({_id:userId});
      if(!user||!product){
        console.log("user Product cant finded")
      }
      user.shopHistory=user.shopHistory.filter(p=>p._id.toString()!=productId.toString());
      const savedUser=await user.save();
      if(!savedUser){
        console.log("cant save user❌");
        res.sendStatus(404)
      }
      const newRating=product.noOfReview==0?rating:((product.rating*product.noOfReview+rating)/(product.noOfReview+1)).toFixed(1);
      product.noOfReview= product.noOfReview+1;
      product.rating=parseFloat(newRating);
      product.reviews.push({
        userName:user.name,
        rating:rating,
        text:text,
      })
      const savedProduct= await product.save();
      if(!savedProduct){
        console.log("cant save Products❌")
        res.sendStatus(404)
      }
      return res.sendStatus(202)

    }
    catch(e){
      console.log(e);
      res.sendStatus(500)

    }finally{
      console.log("hellow World😂😂😂😂");

    }
  }