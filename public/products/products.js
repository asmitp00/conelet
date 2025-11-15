const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    // --- REMOVED ---
    // The manual 'id' field is not needed.
    // Mongoose provides a unique '_id' for every product automatically.
    // We will use this '_id' as the 'productId' in our cart.

    name: {
        type: String,
        required: true,
        trim: true // Good practice: removes whitespace
    },
    description: { // NEW: Added a description field
        type: String,
        required: false // This is optional
    },
    price: {
        type: Number,
        required: true,
        min: 0 // Good practice: price can't be negative
    },
    image: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['parfait', 'cone', 'tub'], // Matches your categories
        required: true,
        lowercase: true // Good practice
    },
    isFeatured: {
        type: Boolean,
        default: false
    }
}, {
    // NEW: Adds 'createdAt' and 'updatedAt' fields automatically
    timestamps: true
});

const Product = mongoose.model('Product', productSchema);

module.exports = Product;
