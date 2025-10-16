const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

// Temporary in-memory store; swap with DB models later
let EVENTS = [];

// List events
router.get('/', asyncHandler(async (req, res) => {
  res.json({ success: true, data: EVENTS });
}));

// Create event
router.post('/', asyncHandler(async (req, res) => {
  const { title, description, date, location } = req.body || {};
  const event = {
    id: Date.now().toString(36),
    title: title || 'Local Event',
    description: description || '',
    date: date || new Date().toISOString().substring(0, 10),
    location: location || '',
    createdAt: new Date().toISOString(),
  };
  EVENTS.unshift(event);
  res.json({ success: true, data: event });
}));

module.exports = router;


