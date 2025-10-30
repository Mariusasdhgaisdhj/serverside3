const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const asyncHandler = require('express-async-handler');
const dotenv = require('dotenv');
const { testConnection } = require('./config/supabase');
dotenv.config();

const app = express();
app.use(cors({ origin: '*' }));
// Increase body size limit to 50MB to handle base64 images in seller requests
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Test Supabase connection
testConnection().then(connected => {
  if (connected) console.log('Connected to Supabase successfully');
  else console.error('Failed to connect to Supabase');
});

// ✅ ROUTE MOUNTS
app.use('/categories', require('./routes/category'));
app.use('/subCategories', require('./routes/subCategory'));
app.use('/brands', require('./routes/brand'));
app.use('/variantTypes', require('./routes/variantType'));
app.use('/variants', require('./routes/variant'));
app.use('/products', require('./routes/product'));
app.use('/couponCodes', require('./routes/couponCode'));
app.use('/posters', require('./routes/poster'));
app.use('/users', require('./routes/user')); // ✅ Users route
app.use('/posts', require('./routes/post'));
app.use('/orders', require('./routes/order'));
app.use('/payment', require('./routes/payment'));
app.use('/notification', require('./routes/notification'));
app.use('/messages', require('./routes/message'));
app.use('/alerts', require('./routes/alerts'));
app.use('/events', require('./routes/events'));
app.use('/sellers', require('./routes/seller'));
app.use('/post-views', require('./routes/post_views'));
app.use('/paymongo', require('./routes/paymongo'));

// Root
app.get('/', asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'API working successfully' });
}));

// Global Error Handler
app.use((error, req, res, next) => {
  res.status(500).json({ success: false, message: error.message });
});

module.exports = app;
