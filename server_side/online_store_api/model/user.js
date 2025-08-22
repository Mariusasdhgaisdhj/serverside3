const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  externalAuthId: {
    type: String,
    index: true,
    unique: false
  },
  name: {
    type: String,
    required: true
  },
  password: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['buyer', 'seller', 'admin'],
    default: 'buyer'
  },
  sellerProfile: {
    businessName: String,
    phone: String,
    paypalEmail: String,
    verified: { type: Boolean, default: false }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

const User = mongoose.model('User', userSchema);

module.exports = User;
