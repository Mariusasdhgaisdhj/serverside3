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
app.use('/messages', require('./routes/message'));
app.use('/sellers', require('./routes/seller'));
app.use('/post-views', require('./routes/post_views'));
// app.use('/migrate', require('./routes/migrate')); // Temporary migration endpoint - REMOVED

// Authentication routes - using existing user system
app.post('/auth/login', asyncHandler(async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Use existing user system
    const User = require('./models/user');
    const user = await User.findByEmail(email);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }
    
    // Check password (you might want to use proper password hashing)
    if (user.password !== password) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }
    
    // Return user data
    res.json({
      success: true,
      message: "Login successful",
      data: user
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}));

app.post('/auth/logout', (req, res) => {
  res.json({
    success: true,
    message: "Logout successful"
  });
});

app.get('/auth/me', asyncHandler(async (req, res) => {
  try {
    // For now, return a default admin user
    // In production, you'd check session/token and get actual user
    const User = require('./models/user');
    const users = await User.findAll();
    const adminUser = users.find(user => user.role === 'admin');
    
    if (adminUser) {
      res.json({
        success: true,
        data: adminUser
      });
    } else {
      res.status(404).json({
        success: false,
        message: "No admin user found"
      });
    }
  } catch (error) {
    console.error('Auth me error:', error);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
}));

// Admin routes
app.get('/admin/stats', asyncHandler(async (req, res) => {
  try {
    const User = require('./models/user');
    const users = await User.findAll();
    
    res.json({
      success: true,
      data: {
        totalUsers: users.length,
        activeSessions: 23, // You can implement session tracking
        systemStatus: "Online"
      }
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch admin stats"
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


