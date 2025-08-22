const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const mongoose = require('mongoose');
const asyncHandler = require('express-async-handler');
const dotenv = require('dotenv');
dotenv.config();

const app = express();
app.use(cors({ origin: '*' }));
app.use(bodyParser.json());

// Static assets (note: on serverless, local disk is ephemeral)
app.use('/image/products', express.static('public/products'));
app.use('/image/category', express.static('public/category'));
app.use('/image/poster', express.static('public/posters'));

// Mongo connection (keep outside of handlers to allow reuse across invocations)
if (!mongoose.connection.readyState) {
  const URL = process.env.MONGO_URL;
  if (URL) {
    mongoose.connect(URL);
    const db = mongoose.connection;
    db.on('error', (error) => console.error(error));
    db.once('open', () => console.log('Connected to Database'));
  }
}

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
app.use('/orders', require('./routes/order'));
app.use('/payment', require('./routes/payment'));
app.use('/notification', require('./routes/notification'));

// Root
app.get('/', asyncHandler(async (req, res) => {
  res.json({ success: true, message: 'API working successfully', data: null });
}));

// Error handler
app.use((error, req, res, next) => {
  res.status(500).json({ success: false, message: error.message, data: null });
});

module.exports = app;


