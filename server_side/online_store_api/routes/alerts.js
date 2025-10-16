const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();

// In-memory placeholder if you don't have a model yet
// Replace with Mongo/Supabase model as needed
let ALERTS = [];

// List alerts
router.get('/', asyncHandler(async (req, res) => {
  res.json({ success: true, data: ALERTS });
}));

// Create alert
router.post('/', asyncHandler(async (req, res) => {
  const { title, description, season, startDate, endDate } = req.body || {};
  const alert = {
    id: Date.now().toString(36),
    title: title || 'Seasonal Alert',
    description: description || '',
    season: season || '',
    startDate: startDate || null,
    endDate: endDate || null,
    createdAt: new Date().toISOString(),
  };
  ALERTS.unshift(alert);
  res.json({ success: true, data: alert });
}));

module.exports = router;


