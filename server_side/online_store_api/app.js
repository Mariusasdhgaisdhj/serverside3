const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const asyncHandler = require('express-async-handler');
const dotenv = require('dotenv');
const { testConnection } = require('./config/supabase');
dotenv.config();

const app = express();
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());

// Static assets (note: on serverless, local disk is ephemeral)
app.use('/image/products', express.static('public/products'));
app.use('/image/category', express.static('public/category'));
app.use('/image/poster', express.static('public/posters'));

// Supabase connection test (non-blocking)
testConnection().then(connected => {
  if (connected) {
    console.log('Connected to Supabase successfully');
  } else {
    console.error('Failed to connect to Supabase - check environment variables');
  }
}).catch(err => {
  console.error('Supabase connection error:', err);
  // Don't crash the app if Supabase connection fails
});

// Routes
app.use('/categories', require('./routes/category'));
app.use('/subCategories', require('./routes/subCategory'));
app.use('/brands', require('./routes/brand'));
app.use('/variantTypes', require('./routes/variantType'));
app.use('/variants', require('./routes/variant'));
app.use('/products', require('./routes/product'));
app.use('/couponCodes', require('./routes/couponCode'));
app.use('/posters', require('./routes/poster'));
app.use('/users', require('./routes/user'));
app.use('/posts', require('./routes/post'));
app.use('/orders', require('./routes/order'));
app.use('/payment', require('./routes/payment'));
app.use('/notification', require('./routes/notification'));
// app.use('/migrate', require('./routes/migrate')); // Temporary migration endpoint - REMOVED

// Root
app.get('/', asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'API working successfully', data: null });
}));

// Minimal pages for PayPal return/cancel (works even for mobile apps)
app.get('/paypal-success', (req, res) => {
  res.set('Content-Type', 'text/html');
  res.send('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><h3>Payment successful</h3><p>You can close this page and return to the app.</p></body></html>');
});
app.get('/paypal-cancel', (req, res) => {
  res.set('Content-Type', 'text/html');
  res.send('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><h3>Payment cancelled</h3><p>You can close this page and return to the app.</p></body></html>');
});

// Error handler
app.use((error, req, res, next) => {
  res.status(500).json({ success: false, message: error.message, data: null });
});

module.exports = app;


