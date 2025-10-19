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
// These routes are disabled since we now use Supabase Storage for all file uploads
// app.use('/image/products', express.static('public/products'));
// app.use('/image/category', express.static('public/category'));
// app.use('/image/poster', express.static('public/posters'));

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
app.use('/messages', require('./routes/message'));
app.use('/alerts', require('./routes/alerts'));
app.use('/events', require('./routes/events'));
app.use('/sellers', require('./routes/seller'));
app.use('/post-views', require('./routes/post_views'));
// app.use('/migrate', require('./routes/migrate')); // Temporary migration endpoint - REMOVED


// Debug endpoint to check what users exist
app.get('/debug-users', asyncHandler(async (req, res) => {
  try {
    const User = require('./models/user');
    const { data: users } = await User.findAll(1, 10);
    
    res.json({
      success: true,
      message: 'Users retrieved successfully',
      data: users.map(user => ({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        password: user.password ? '***' : 'none'
      }))
    });
  } catch (error) {
    console.error('Debug users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users',
      error: error.message
    });
  }
}));

// Root
app.get('/', asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'API working successfully', data: null });
}));

// Test Supabase connection
app.get('/test', asyncHandler(async (req, res) => {
  try {
    const { supabase } = require('./config/supabase');
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (error) {
      res.json({
        success: false,
        message: 'Supabase connection failed',
        error: error.message
      });
    } else {
      res.json({
        success: true,
        message: 'Supabase connection successful',
        data: data
      });
    }
  } catch (err) {
    res.json({
      success: false,
      message: 'Supabase test failed',
      error: err.message
    });
  }
}));

// Test users table specifically
app.get('/test-users', asyncHandler(async (req, res) => {
  try {
    const { supabase } = require('./config/supabase');
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(5);

    if (error) {
      res.json({
        success: false,
        message: 'Users table test failed',
        error: error.message,
        code: error.code
      });
    } else {
      res.json({
        success: true,
        message: 'Users table accessible',
        data: data,
        count: data.length
      });
    }
  } catch (err) {
    res.json({
      success: false,
      message: 'Users table test failed',
      error: err.message
    });
  }
}));

// Minimal pages for PayPal return/cancel (works even for mobile apps)
app.get('/paypal-success', asyncHandler(async (req, res) => {
  const { order_id: orderId, txn_id: txnId } = req.query || {};
  if (orderId) {
    await setOrderPaid(orderId, 'paypal', txnId);
  }
  res.set('Content-Type', 'text/html');
  res.send('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><h3>Payment successful</h3><p>You can close this page and return to the app.</p></body></html>');
}));
app.get('/paypal-cancel', asyncHandler(async (req, res) => {
  // no-op; could mark as canceled if order_id provided
  res.set('Content-Type', 'text/html');
  res.send('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><h3>Payment cancelled</h3><p>You can close this page and return to the app.</p></body></html>');
}));

// Update order status helper
async function setOrderPaid(orderId, provider, txnId) {
  try {
    const { supabase } = require('./config/supabase');
    const base = {
      payment_provider: provider || null,
      transaction_id: txnId || null,
      updated_at: new Date().toISOString(),
    };
    const attempts = [
      { order_status: 'paid' },
      { status: 'paid' },
      { payment_status: 'paid' },
      { paymentStatus: 'paid' },
    ];
    for (const variant of attempts) {
      const { error } = await supabase.from('orders').update({ ...base, ...variant }).eq('id', orderId);
      if (!error) break;
    }
  } catch (_) {}
}

// For mobile/web return URLs: optionally pass ?order_id=&txn_id=&provider=paypal
app.get('/payment/return', asyncHandler(async (req, res) => {
  const { order_id: orderId, provider = 'paypal', txn_id: txnId } = req.query || {};
  if (orderId) {
    await setOrderPaid(orderId, provider, txnId);
  }
  res.set('Content-Type', 'text/html');
  res.send('<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"/></head><body><h3>Payment processed</h3><p>You can close this page and return to the app.</p></body></html>');
}));

// Generic confirm endpoint the client can call after provider SDK success
app.post('/payment/confirm', asyncHandler(async (req, res) => {
  const { orderId, provider, transactionId } = req.body || {};
  if (!orderId) return res.status(400).json({ success: false, message: 'orderId required' });
  await setOrderPaid(orderId, provider || 'unknown', transactionId);
  return res.json({ success: true, message: 'Order marked paid' });
}));

// Error handler
app.use((error, req, res, next) => {
  res.status(500).json({ success: false, message: error.message, data: null });
});

module.exports = app;


