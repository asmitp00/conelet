const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true, // No two users can have the same email
        lowercase: true
    },
    password: {
        type: String,
        required: true
    }
}, {
    timestamps: true // Adds 'createdAt' and 'updatedAt'
});

// Mongoose will create a collection called "users"
const User = mongoose.model('User', userSchema);

module.exports = User;
