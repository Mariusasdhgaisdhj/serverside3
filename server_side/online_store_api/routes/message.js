const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const { Conversation, Message } = require('../model/message');

// Create or get conversation between buyer and seller
router.post('/conversation', asyncHandler(async (req, res) => {
  const { buyerId, sellerId } = req.body || {};
  if (!buyerId || !sellerId) return res.status(400).json({ success: false, message: 'buyerId and sellerId required' });
  let convo = await Conversation.findOne({ buyerId, sellerId });
  if (!convo) convo = await Conversation.create({ buyerId, sellerId });
  res.json({ success: true, message: 'Conversation ready', data: convo });
}));

// List conversations for a user
router.get('/conversations/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const convos = await Conversation.find({ $or: [{ buyerId: userId }, { sellerId: userId }] }).sort({ createdAt: -1 });
  res.json({ success: true, message: 'Conversations fetched', data: convos });
}));

// Send message
router.post('/:conversationId/messages', asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { senderId, text } = req.body || {};
  if (!senderId || !text) return res.status(400).json({ success: false, message: 'senderId and text required' });
  const msg = await Message.create({ conversationId, senderId, text });
  res.json({ success: true, message: 'Message sent', data: msg });
}));

// List messages in conversation
router.get('/:conversationId/messages', asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const messages = await Message.find({ conversationId }).sort({ createdAt: 1 });
  res.json({ success: true, message: 'Messages fetched', data: messages });
}));

module.exports = router;


