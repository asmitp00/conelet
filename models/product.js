const mongoose = require('mongoose');

// This is the "Schema" - the blueprint for our data
// It now 100% matches the JSON you provided
const productSchema = new mongoose.Schema({
  id: {
    type: Number,
    required: true,
    unique: true // Ensures we don't add the same ID twice
  },
  name: {
    type: String,
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  image: {
    type: String,
    required: true
  },
  category: {
    type: String,
    enum: ['parfait', 'cone', 'tub'], // Matches your categories
    required: true
  },
  isFeatured: {
    type: Boolean,
    default: false
  }
});

// Mongoose will create a collection called "products"
const Product = mongoose.model('Product', productSchema);

module.exports = Product;
