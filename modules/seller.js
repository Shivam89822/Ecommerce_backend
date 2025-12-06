// user.js
const mongoose = require('mongoose');
const productSchema = require('./products'); // ✅ Import schema only
const orderSchema=require('./order')


const { Schema } = mongoose;

const sellerSchema = new Schema(
  {
    sellerName: { type: String, required: true },
    tokenCode:{type: String, required: true},
    email: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email!`,
      },
    },
    accNo:{type: String, required: true},
    businessType:{type: String, required: true},
    aboutBusiness:{type: String, required: true},
    panNo:{type: String, required: true},
    aadhaarNo:{type:Number,required:true},
    orders: [orderSchema],      // ✅ Embedded schema without unique fields
   products:[productSchema]
  },
  {
    timestamps: true,
    collection: "seller",
  }
);

const Seller = mongoose.model("Seller", sellerSchema);
module.exports = Seller;
