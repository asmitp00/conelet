







const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./models/product');
const CartItem = require('./models/cartItem');

const app = express();
const PORT = 3000;

app.use(express.json());
const dbUrl = process.env.DATABASE_URL;

mongoose.connect(dbUrl)
  .then(() => {
    console.log('MongoDB connected successfully!');
    app.listen(PORT, () => {
      console.log(`Server is running successfully on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err);
  });



app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// --- PAGE RENDERING ROUTES ---
app.get('/', (req, res) => { res.render('index'); });

app.get('/products', async (req, res) => {
  try {
    const allProducts = await Product.find({});
    res.render('products', { products: allProducts });
  } catch (err) {
    console.error('Error fetching products:', err);
    res.status(500).send('Error loading products');
  }
});

// UPDATED /cart route: Now it fetches REAL data
app.get('/cart', async (req, res) => {
  try {
    const cartItems = await CartItem.find({});
    // We also calculate the total price on the server
    let subtotal = 0;
    cartItems.forEach(item => {
      subtotal += item.price * item.quantity;
    });
    const tax = subtotal * 0.1; // Example 10% tax
    const total = subtotal + tax;

    res.render('cart', {
      cartItems: cartItems,
      subtotal: subtotal,
      tax: tax,
      total: total
    });
  } catch (err) {
    console.error('Error fetching cart items:', err);
    res.status(500).send('Error loading cart');
  }
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
    console.error('Error fetching API products:', err);
    res.status(500).json({ error: 'Error fetching data' });
  }
});

const session = require('express-session');

// ... after const app = express();

// This MUST be added BEFORE your routes
app.use(session({
    secret: 'change-this-to-a-long-random-string', // Change this!
    resave: false,
    saveUninitialized: true
}));

// API route for adding to cart
app.post('/api/cart/add', async (req, res) => {
  try {
    const { productId, name, price, image } = req.body;
    let existingItem = await CartItem.findOne({ productId: productId });

    if (existingItem) {
      existingItem.quantity += 1;
      await existingItem.save();
    } else {
      const newItem = new CartItem({ productId, name, price, image, quantity: 1 });
      await newItem.save();
    }
    // After adding, get the new total count and send it back
    const totalCount = await CartItem.find({}).then(items => items.reduce((sum, item) => sum + item.quantity, 0));
    res.json({ success: true, message: `Added to cart!`, newCount: totalCount });
  } catch (err) {
    console.error('Error adding to cart:', err);
    res.status(500).json({ success: false, error: 'Error adding to cart' });
  }
});

// API route to get cart count
app.get('/api/cart/count', async (req, res) => {
  try {
    const totalCount = await CartItem.find({}).then(items => items.reduce((sum, item) => sum + item.quantity, 0));
    res.json({ success: true, count: totalCount });
  } catch (err) {
    console.error('Error counting cart:', err);
    res.status(500).json({ success: false, error: 'Error counting cart' });
  }
});

// --- NEW API ROUTES FOR (U)PDATE and (D)ELETE ---

// This will handle both + and - clicks
app.post('/api/cart/update/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    const { action } = req.body; // 'increment' or 'decrement'

    const item = await CartItem.findById(itemId);
    if (!item) {
      return res.status(404).json({ success: false, error: 'Item not found' });
    }

    if (action === 'increment') {
      item.quantity += 1;
    } else if (action === 'decrement') {
      if (item.quantity > 1) {
        item.quantity -= 1;
      } else {
        // If quantity is 1, decrementing should remove it
        await CartItem.findByIdAndDelete(itemId);
        return res.json({ success: true, reload: true }); // Tell frontend to reload
      }
    }
    await item.save();
    res.json({ success: true, reload: true }); // Tell frontend to reload
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error updating quantity' });
  }
});

// This will handle "Remove" button clicks
app.delete('/api/cart/remove/:itemId', async (req, res) => {
  try {
    const { itemId } = req.params;
    await CartItem.findByIdAndDelete(itemId);
    res.json({ success: true, reload: true }); // Tell frontend to reload
  } catch (err) {
    res.status(500).json({ success: false, error: 'Error removing item' });
  }
});


// --- STATIC FILES ---
app.use(express.static(path.join(__dirname, 'public')));
