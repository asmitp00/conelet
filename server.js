const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./models/product');
const CartItem = require('./models/cartItem');
const User = require('./models/user');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const dbUrl = process.env.DATABASE_URL;

mongoose.connect(dbUrl)
  .then(() => console.log('MongoDB connected successfully!'))
  .catch(err => console.error('MongoDB connection error:', err));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const session = require('express-session');

app.use(session({
    secret: 'change-this-to-a-long-random-string',
    resave: false,
    saveUninitialized: true
}));

// Middleware to pass user data to all views
app.use((req, res, next) => {
    res.locals.user = req.session.user || null;
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

app.get('/cart', async (req, res) => {
  if (!req.session.user) {
    return res.redirect('/login');
  }
  try {
    const cartItems = await CartItem.find({ userId: req.session.user._id });

    let subtotal = 0;
    cartItems.forEach(item => subtotal += item.price * item.quantity);

    // Apply discount to cart page totals
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
      discountAmount: discountAmount,
      discountCode: req.session.discountCode || null
    });
  } catch (err) {
    console.error("Error loading cart:", err);
    res.status(500).send('Error loading cart');
  }
});

// --- NEW: ORDER SUCCESS PAGE ROUTE ---
// This handles the "Thank You" page after a successful order
app.get('/order/success/:orderId', (req, res) => {
    res.render('order-success', {
        orderId: req.params.orderId,
        user: req.session.user || null
    });
});


// --- ACCOUNT ROUTES ---

// Show the login/register page
app.get('/login', (req, res) => {
    res.render('login', {
        error: req.session.error || null,
        mode: req.session.mode || 'login'
    });
    req.session.error = null;
    req.session.mode = null;
});

// Handle registration
app.post('/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const existing = await User.findOne({ email: email });
        if (existing) {
            req.session.error = 'Email already in use.';
            req.session.mode = 'register';
            return res.redirect('/login');
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ name, email, password: hashedPassword });
        await user.save();
        req.session.user = { _id: user._id, name: user.name, email: user.email };
        res.redirect('/products');
    } catch (err) {
        console.error(err);
        req.session.error = 'Error creating account.';
        req.session.mode = 'register';
        res.redirect('/login');
    }
});

// Handle login
app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await User.findOne({ email: email });
        if (!user) {
            req.session.error = 'Invalid email or password.';
            req.session.mode = 'login';
            return res.redirect('/login');
        }
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            req.session.error = 'Invalid email or password.';
            req.session.mode = 'login';
            return res.redirect('/login');
        }
        req.session.user = { _id: user._id, name: user.name, email: user.email };
        res.redirect('/products');
    } catch (err) {
        console.error(err);
        req.session.error = 'Server error during login.';
        req.session.mode = 'login';
        res.redirect('/login');
    }
});

// Handle logout
app.get('/account/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
});


// --- API ROUTES ---

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

// "Add to Cart"
app.post('/api/cart/add', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({
        success: false,
        message: 'You must be logged in to add items.',
        redirect: '/login'
    });
  }
  try {
    const { productId, name, price, image } = req.body;
    const userId = req.session.user._id;
    let existingItem = await CartItem.findOne({ productId: productId, userId: userId });
    if (existingItem) {
      existingItem.quantity += 1;
      await existingItem.save();
    } else {
      const newItem = new CartItem({ productId, name, price, image, quantity: 1, userId: userId });
      await newItem.save();
    }
    const totalCount = await CartItem.find({ userId: userId })
      .then(items => items.reduce((sum, item) => sum + item.quantity, 0));
    res.json({ success: true, message: 'Added to cart!', newCount: totalCount });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error adding to cart' });
  }
});

// Cart Count
app.get('/api/cart/count', async (req, res) => {
  if (!req.session.user) {
    return res.json({ success: true, count: 0 });
  }
  try {
    const userId = req.session.user._id;
    const totalCount = await CartItem.find({ userId: userId })
      .then(items => items.reduce((sum, item) => sum + item.quantity, 0));
    res.json({ success: true, count: totalCount });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error counting cart' });
  }
});

// Cart Update
app.post('/api/cart/update/:itemId', async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ success: false, error: 'Not logged in.' });
  }
  try {
    const { itemId } = req.params;
    const { action } = req.body;
    const userId = req.session.user._id;
    const item = await CartItem.findOne({ _id: itemId, userId: userId });

    // --- FIX 1: Was '4Z4' ---
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
    // --- FIX 2: Was '5Video (Async):' ---
    res.status(500).json({ success: false, error: 'Error updating quantity' });
  }
});

// Cart Remove
app.delete('/api/cart/remove/:itemId', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, error: 'Not logged in.' });
    }
    try {
        const { itemId } = req.params;
        const userId = req.session.user._id;
        await CartItem.findOneAndDelete({ _id: itemId, userId: userId });
        res.json({ success: true, reload: true });
    } catch (err) {
        // --- FIX 3: Was '50od' ---
        res.status(500).json({ success: false, error: 'Error removing item' });
    }
});

// API Route: Apply Discount
app.post('/api/cart/apply-discount', (req, res) => {
    const { code } = req.body;
    if (code && code.toUpperCase() === 'CONE10') {
        req.session.discount = 0.10; // Store 10% discount
        req.session.discountCode = code.toUpperCase();
        res.json({ success: true, message: 'Discount applied!' });
    } else {
        req.session.discount = 0;
        req.session.discountCode = null;
        res.status(400).json({ success: false, message: 'Invalid discount code.' });
    }
});

// API Route: Place Order
app.post('/api/order/place', async (req, res) => {
    if (!req.session.user) {
        return res.status(401).json({ success: false, message: 'You must be logged in to place an order.' });
    }
    try {
        const { shipping, payment } = req.body;
        const userId = req.session.user._id;

        const cartItems = await CartItem.find({ userId: userId });

        if (cartItems.length === 0) {
            return res.status(400).json({ success: false, message: 'Your cart is empty.' });
        }

        let subtotal = 0;
        cartItems.forEach(item => subtotal += item.price * item.quantity);

        const discountPercentage = req.session.discount || 0;
        const discountAmount = subtotal * discountPercentage;
        const taxableSubtotal = subtotal - discountAmount;

        const tax = taxableSubtotal * 0.1;
        const finalTotal = taxableSubtotal + tax;

        // --- In a real app, process payment HERE ---

        const orderData = {
            userId: userId,
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

        // --- In a real app, save 'orderData' to an 'Order' collection ---
        // const newOrder = new Order(orderData);
        // await newOrder.save();
        console.log("Order placed:", orderData);

        // --- Delete cart items for THIS user ONLY ---
        await CartItem.deleteMany({ userId: userId });
        req.session.discount = null;
        req.session.discountCode = null;

        res.json({ success: true, orderId: Date.now() }); // Using timestamp as a fake Order ID

    } catch (error) {
        console.error('Error placing order:', error);
        // --- FIX 4: Was '5We' ---
        res.status(500).json({ success: false, message: 'Server error while placing order.' });
    }
});


// --- Static Files ---
app.use(express.static(path.join(__dirname, 'public')));
