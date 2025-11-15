const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// --- Mongoose Models ---
const Product = require('./models/product');
const CartItem = require('./models/cartItem');

// --- PLACEHOLDER USER MODEL/ARRAY ---
// In a real application, this would be imported from './models/user'
// We will use a simple in-memory array for demonstration purposes
let users = []; 
// If you create a User model later, you would replace `let users = []` with
// const User = require('./models/user');
// and replace array operations (find/push) with User.findOne/User.create.
// ------------------------------------

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware Setup ---
app.use(express.json());
// IMPORTANT: Add this middleware to parse form data for the account login/register
app.use(express.urlencoded({ extended: true })); 

const dbUrl = process.env.DATABASE_URL;

mongoose.connect(dbUrl)
  .then(() => console.log('MongoDB connected successfully!'))
  .catch(err => console.error('MongoDB connection error:', err));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const session = require('express-session');

app.use(session({
    secret: 'change-this-to-a-long-random-string', // Change this!
    resave: false,
    saveUninitialized: true
}));

// --- Middleware to attach user/status to all routes ---
app.use((req, res, next) => {
    // If the user is logged in, attach their data to locals for EJS access
    res.locals.user = req.session.user || null;
    
    // Calculate total discount/tax for cart rendering
    res.locals.discount = req.session.discount || 0;
    
    next();
});

// --- PAGE RENDERING ROUTES ---

app.get('/', (req, res) => { res.render('index'); });

app.get('/products', async (req, res) => {
    try {
        const allProducts = await Product.find({});
        res.render('products', { products: allProducts });
    } catch (err) {
        res.status(500).send('Error loading products');
    }
});

// 1. ACCOUNT RENDERING ROUTE
app.get('/account', (req, res) => {
    if (req.session.user) {
        return res.redirect('/'); // If already logged in, go home
    }
    res.render('account', { 
        error: req.session.error || null, // Check session for error messages
        mode: req.session.mode || 'login'
    });
    // Clear session messages after display
    req.session.error = null;
    req.session.mode = null;
});

app.get('/cart', async (req, res) => {
    // The previous logic was correct, but we need to factor in the discount!
    try {
        const cartItems = await CartItem.find({});
        let subtotal = 0;
        cartItems.forEach(item => subtotal += item.price * item.quantity);
        
        // Apply Discount
        const discountPercentage = req.session.discount || 0;
        const discountAmount = subtotal * discountPercentage;
        const taxableSubtotal = subtotal - discountAmount;
        
        const tax = taxableSubtotal * 0.1;
        const total = taxableSubtotal + tax;

        res.render('cart', {
            cartItems,
            subtotal,
            tax,
            total,
            discountAmount,
            discountCode: req.session.discountCode || null
        });
    } catch (err) {
        res.status(500).send('Error loading cart');
    }
});


// --- NEW ACCOUNT SUBMISSION ROUTES ---

app.post('/account/register', (req, res) => {
    const { email, name, password } = req.body;
    
    if (users.find(u => u.email === email)) {
        req.session.error = 'This email is already registered.';
        req.session.mode = 'register';
        return res.redirect('/account');
    }
    
    // In a real app, hash the password!
    const newUser = { id: Date.now(), email, name, password, cartId: req.session.cartId || null };
    users.push(newUser);
    
    req.session.user = newUser; 
    res.redirect('/cart'); 
});

app.post('/account/login', (req, res) => {
    const { email, password } = req.body;
    
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        req.session.user = user;
        // Logic to merge carts would go here if needed
        res.redirect('/cart'); 
    } else {
        req.session.error = 'Invalid email or password.';
        req.session.mode = 'login';
        res.redirect('/account');
    }
});

app.get('/account/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});


// --- EXISTING & NEW API ROUTES ---

app.get('/api/products', async (req, res) => {
    // ... (Your existing API logic) ...
});

app.post('/api/cart/add', async (req, res) => {
    // ... (Your existing API logic) ...
});

app.get('/api/cart/count', async (req, res) => {
    // ... (Your existing API logic) ...
});

app.post('/api/cart/update/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        const { action } = req.body;

        const item = await CartItem.findById(itemId);
        if (!item) return res.status(404).json({ success: false, error: 'Item not found' });

        if (action === 'increment') {
            item.quantity += 1;
        } else if (action === 'decrement') {
            if (item.quantity > 1) {
                item.quantity -= 1;
            } else {
                await CartItem.findByIdAndDelete(itemId);
                return res.json({ success: true, reload: true });
            }
        }

        await item.save();
        res.json({ success: true, reload: true });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Error updating quantity' });
    }
});

app.delete('/api/cart/remove/:itemId', async (req, res) => {
    try {
        const { itemId } = req.params;
        await CartItem.findByIdAndDelete(itemId);
        res.json({ success: true, reload: true });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Error removing item' });
    }
});


// 2. NEW API ROUTE: Apply Discount
app.post('/api/cart/apply-discount', (req, res) => {
    const { code } = req.body;

    if (code && code.toUpperCase() === 'CONE10') {
        req.session.discount = 0.10; // Store 10% discount
        req.session.discountCode = code.toUpperCase();
        res.json({ success: true, message: 'Discount applied!' });
    } else {
        req.session.discount = 0; // Clear any existing discount
        req.session.discountCode = null;
        res.status(400).json({ success: false, message: 'Invalid discount code.' });
    }
});

// 3. NEW API ROUTE: Place Order
app.post('/api/order/place', async (req, res) => {
    try {
        const { shipping, payment } = req.body;
        
        // 1. Finalize totals (Recalculate based on current session data)
        const cartItems = await CartItem.find({});
        let subtotal = 0;
        cartItems.forEach(item => subtotal += item.price * item.quantity);
        
        const discountPercentage = req.session.discount || 0;
        const discountAmount = subtotal * discountPercentage;
        const taxableSubtotal = subtotal - discountAmount;
        
        const tax = taxableSubtotal * 0.1;
        const finalTotal = taxableSubtotal + tax;

        // 2. IMPORTANT: In a real app, process payment here (Stripe, etc.)
        // We will assume success for this example.

        // 3. Create Order Record (Replace with Mongoose Order Model logic)
        const orderData = {
            userId: req.session.user ? req.session.user.id : 'guest',
            shipping,
            paymentSummary: {
                total: finalTotal,
                discount: discountAmount,
                tax,
                method: 'Card' // Based on form input
            },
            items: cartItems.map(item => ({ name: item.name, price: item.price, quantity: item.quantity })),
            placedAt: new Date()
        };
        
        // This is where you would save the order to MongoDB:
        // const newOrder = new Order(orderData);
        // await newOrder.save();
        
        // 4. Clear the cart and session variables
        await CartItem.deleteMany({});
        req.session.discount = null;
        req.session.discountCode = null;

        res.json({ success: true, orderId: Date.now() });

    } catch (error) {
        console.error('Error placing order:', error);
        res.status(500).json({ success: false, message: 'Server error while placing order.' });
    }
});


// --- Static Files & Server Start ---

app.use(express.static(path.join(__dirname, 'public')));

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
