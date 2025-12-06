// user.js
const mongoose = require('mongoose');
const productSchema = require('./products'); // ✅ Import schema only



const { Schema } = mongoose;

const orderSchema = new Schema(
  {
    name: { type: String },
    email: {
      type: String,
      unique: false,
      validate: {
        validator: function (v) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email!`,
      },
    },
    address:{ 
      name:{type:String},
      number:{type:Number},
      pincode:{type:Number},
      locality:{type:String},
      address:{type:String},
      city:{type:String},
      state:{type:String}
     },
    quantity:{type:Number},
    order: {type:productSchema},
    date:{type: String}     // ✅ Embedded schema without unique fields
  },
  {
    timestamps: true,
    collection: "order",
  }
);

module.exports = orderSchema;