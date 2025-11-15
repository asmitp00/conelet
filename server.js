const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

// --- Mongoose Models ---
const Product = require('./models/product');
const CartItem = require('./models/cartItem');

// --- PLACEHOLDER USER MODEL/ARRAY ---
// IMPORTANT: This is a placeholder. Replace with your Mongoose User model later.
let users = []; 

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware Setup ---
app.use(express.json());
// Parses incoming form data (crucial for account login/register)
app.use(express.urlencoded({ extended: true })); 

const dbUrl = process.env.DATABASE_URL;

mongoose.connect(dbUrl)
  .then(() => console.log('MongoDB connected successfully!'))
  .catch(err => console.error('MongoDB connection error:', err));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const session = require('express-session');

app.use(session({
    secret: 'change-this-to-a-long-random-string', 
    resave: false,
    saveUninitialized: true
}));

// --- Middleware to attach user/status to all routes ---
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
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
        return res.redirect('/'); 
    }
    res.render('account', { 
        error: req.session.error || null, 
        mode: req.session.mode || 'login'
    });
    req.session.error = null;
    req.session.mode = null;
});

app.get('/cart', async (req, res) => {
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
    try {
        let filter = {};
        if (req.query.categories) filter.category = { $in: req.query.categories };
        if (req.query.sizes) filter.size = { $in: req.query.sizes };
        if (req.query.maxPrice) filter.price = { $lte: parseFloat(req.query.maxPrice) };
        if (req.query.search) filter.name = { $regex: req.query.search, $options: 'i' };

        let sort = {};
        if (req.query.sort === 'price-asc') sort.price = 1;
        else if (req.query.sort === 'price-desc') sort.price = -1;

        const filteredProducts = await Product.find(filter).sort(sort);
        res.json(filteredProducts);
    } catch (err) {
        res.status(500).json({ error: 'Error fetching data' });
    }
});

// FIX: Changed findOne by productId to ensure correct item aggregation
app.post('/api/cart/add', async (req, res) => {
    try {
        const { productId, name, price, image } = req.body;
        // Find by productId field, not Mongoose _id
        let existingItem = await CartItem.findOne({ productId }); 

        if (existingItem) {
            existingItem.quantity += 1;
            await existingItem.save();
        } else {
            // Ensure ProductId is passed to the database model
            const newItem = new CartItem({ productId, name, price, image, quantity: 1 });
            await newItem.save();
        }

        const totalCount = await CartItem.find({})
            .then(items => items.reduce((sum, item) => sum + item.quantity, 0));

        res.json({ success: true, message: 'Added to cart!', newCount: totalCount });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Error adding to cart' });
    }
});

app.get('/api/cart/count', async (req, res) => {
    try {
        const totalCount = await CartItem.find({})
            .then(items => items.reduce((sum, item) => sum + item.quantity, 0));

        res.json({ success: true, count: totalCount });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Error counting cart' });
    }
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
        
        // --- 1. Finalize totals (Recalculate based on current session data) ---
        const cartItems = await CartItem.find({});
        let subtotal = 0;
        cartItems.forEach(item => subtotal += item.price * item.quantity);
        
        const discountPercentage = req.session.discount || 0;
        const discountAmount = subtotal * discountPercentage;
        const taxableSubtotal = subtotal - discountAmount;
        
        const tax = taxableSubtotal * 0.1;
        const finalTotal = taxableSubtotal + tax;

        // 2. IMPORTANT: Process payment and create order record here
        
        const orderData = {
            userId: req.session.user ? req.session.user.id : 'guest',
            shipping,
            paymentSummary: {
                total: finalTotal,
                discount: discountAmount,
                tax,
                method: 'Card' 
            },
            items: cartItems.map(item => ({ 
                name: item.name, 
                price: item.price, 
                quantity: item.quantity,
                productId: item.productId 
            })),
            placedAt: new Date()
        };
        
        // 3. Clear the cart and session variables
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
