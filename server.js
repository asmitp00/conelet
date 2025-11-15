const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('./models/product');
const CartItem = require('./models/cartItem');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

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
  try {
    const cartItems = await CartItem.find({});
    let subtotal = 0;
    cartItems.forEach(item => subtotal += item.price * item.quantity);
    const tax = subtotal * 0.1;
    const total = subtotal + tax;

    res.render('cart', {
      cartItems,
      subtotal,
      tax,
      total
    });
  } catch (err) {
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
    res.status(500).json({ error: 'Error fetching data' });
  }
});

app.post('/api/cart/add', async (req, res) => {
  try {
    const { productId, name, price, image } = req.body;
    let existingItem = await CartItem.findOne({ productId });

    if (existingItem) {
      existingItem.quantity += 1;
      await existingItem.save();
    } else {
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

app.use(express.static(path.join(__dirname, 'public')));
