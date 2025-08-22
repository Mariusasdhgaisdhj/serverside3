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
  email: {
    type: String,
    required: true,
    unique: true,
    sparse: true,
    validate: {
      validator: function(v) {
        return v && v.trim().length > 0 && v !== 'null';
      },
      message: 'Email cannot be null or empty'
    }
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

// Add pre-save middleware to ensure email is always valid
userSchema.pre('save', function(next) {
  if (!this.email || this.email === 'null' || this.email.trim() === '') {
    return next(new Error('Email is required and cannot be null'));
  }
  this.email = this.email.trim().toLowerCase();
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;
