const mongoose = require('mongoose');
const slugify = require('slugify');

const { Schema } = mongoose;

const productSchema = new Schema(
  {
    title: { type: String, required: true },
    slug: { type: String, unique: true }, // Unique sluge
    sellerId:{type:String,required:false},
    price: { type: Number, required: true },
    description: { type: String, required: true },
    rating: { type: Number },
    quantity: { type: Number },
    category: {
      id: { type: Number },
      name: { type: String },
      slug: { type: String },
      image: { type: String },
      creationAt: { type: Date, default: Date.now },
      updatedAt: { type: Date, default: Date.now },
    },
    noOfReview: { type: Number },
    images: { type: [String], required: true },
    creationAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    reviews: [
      {
        userName: { type: String },
        rating: { type: Number },
        text: { type: String },
      },
    ],
  },
  { timestamps: true }
);

// Auto-generate slug from title if not provided
productSchema.pre('save', function (next) {
  if (!this.slug && this.title) {
    this.slug = slugify(this.title, { lower: true, strict: true });
  }
  next();
});

module.exports = productSchema;
