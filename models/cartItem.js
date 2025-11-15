const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
    productId: {
        type: String,
        required: true
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
    quantity: {
        type: Number,
        required: true,
        default: 1
    },
    // --- ADD THIS FIELD ---
    // This connects the cart item to a specific user
    userId: {
        type: String, // Or mongoose.Schema.Types.ObjectId if you use a real User model
        required: true
    }
});

const CartItem = mongoose.model('CartItem', cartItemSchema);

module.exports = CartItem;
