const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const { Conversation, Message } = require('../models/message');
const Order = require('../models/order');
const OneSignal = require('onesignal-node');
const User = require('../models/user');
const dotenv = require('dotenv');
dotenv.config();
const multer = require('multer');
const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
});

// Create or get conversation between buyer and seller
router.post('/conversation', asyncHandler(async (req, res) => {
  const { buyerId, sellerId } = req.body || {};
  if (!buyerId || !sellerId) return res.status(400).json({ success: false, message: 'buyerId and sellerId required' });
  const convo = await Conversation.getOrCreate(buyerId, sellerId);
  res.json({ success: true, message: 'Conversation ready', data: convo });
}));

// List conversations for a user (with latest message preview)
router.get('/conversations/:userId', asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '50', 10);
  const { data, total } = await Conversation.findByUserId(userId, page, limit);

  // Attach latest message per conversation using descending order for true latest
  const withPreview = [];
  for (const c of (data || [])) {
    const { data: msgs } = await Message.findByConversationId(c.id, 1, 1); // our model returns ascending; we'll fetch last separately
    // Instead of relying on ascending, query latest directly
    const { data: latestArr } = await require('../config/supabase').supabase
      .from('messages')
      .select('id, text, created_at, sender_id')
      .eq('conversation_id', c.id)
      .order('created_at', { ascending: false })
      .limit(1);
    const latest = Array.isArray(latestArr) && latestArr.length > 0 ? latestArr[0] : (Array.isArray(msgs) && msgs.length > 0 ? msgs[msgs.length - 1] : null);
    withPreview.push({
      ...c,
      latestMessage: latest ? { id: latest.id, text: latest.text, created_at: latest.created_at, sender_id: latest.sender_id } : null,
    });
  }

  res.json({ success: true, message: 'Conversations fetched', data: withPreview, total, page, limit });
}));

// Alias: support query param style /conversations?userId=...
router.get('/conversations', asyncHandler(async (req, res) => {
  const userId = req.query.userId;
  if (!userId) return res.status(400).json({ success: false, message: 'userId required' });
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '50', 10);
  const { data, total } = await Conversation.findByUserId(String(userId), page, limit);

  const withPreview = [];
  for (const c of (data || [])) {
    const { data: msgs } = await Message.findByConversationId(c.id, 1, 1);
    const { data: latestArr } = await require('../config/supabase').supabase
      .from('messages')
      .select('id, text, created_at, sender_id')
      .eq('conversation_id', c.id)
      .order('created_at', { ascending: false })
      .limit(1);
    const latest = Array.isArray(latestArr) && latestArr.length > 0 ? latestArr[0] : (Array.isArray(msgs) && msgs.length > 0 ? msgs[msgs.length - 1] : null);
    withPreview.push({
      ...c,
      latestMessage: latest ? { id: latest.id, text: latest.text, created_at: latest.created_at, sender_id: latest.sender_id } : null,
    });
  }

  res.json({ success: true, message: 'Conversations fetched', data: withPreview, total, page, limit });
}));

// Get conversation details by ID (buyer and seller info)
router.get('/conversation/:id', asyncHandler(async (req, res) => {
  const convo = await Conversation.findById(req.params.id);
  if (!convo) return res.status(404).json({ success: false, message: 'Conversation not found' });
  res.json({ success: true, message: 'Conversation fetched', data: convo });
}));

// Create conversation explicitly between two users
router.post('/conversation/start', asyncHandler(async (req, res) => {
  const { buyerId, sellerId } = req.body || {};
  if (!buyerId || !sellerId) return res.status(400).json({ success: false, message: 'buyerId and sellerId required' });
  const convo = await Conversation.getOrCreate(buyerId, sellerId);
  res.json({ success: true, message: 'Conversation ready', data: convo });
}));

// Send message
router.post('/:conversationId/messages', asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const { senderId, text } = req.body || {};
  if (!senderId || !text) return res.status(400).json({ success: false, message: 'senderId and text required' });
  const msg = await Message.create({ conversation_id: conversationId, sender_id: senderId, text });

  // Fire OneSignal push to the recipient, if server is configured
  try {
    const appId = process.env.ONE_SIGNAL_APP_ID;
    const apiKey = process.env.ONE_SIGNAL_REST_API_KEY;
    if (appId && apiKey) {
      const convo = await Conversation.findById(conversationId);
      if (convo) {
        const isSenderBuyer = String(convo.buyer_id) === String(senderId);
        const recipientId = String(isSenderBuyer ? convo.seller_id : convo.buyer_id);
        const client = new OneSignal.Client(appId, apiKey);
        // Fetch sender to personalize title/icon
        let senderName = 'New message';
        let senderAvatar = null;
        try {
          const u = await User.findById(senderId);
          if (u) {
            // Build a robust display name: firstname lastname > name > business_name > username
            const nameParts = [];
            if (u.firstname) nameParts.push(u.firstname);
            if (u.lastname) nameParts.push(u.lastname);
            const full = nameParts.join(' ').trim();
            senderName = full || u.name || u.business_name || u.username || 'New message';
            senderAvatar = u.profilepicture || null;
          }
        } catch (_) {}
        const preview = String(text).length > 120 ? String(text).slice(0, 117) + '...' : String(text);
        console.log('[push] convo', conversationId, 'sender', senderId, '-> recipient', recipientId);
        const resp = await client.createNotification({
          app_id: appId,
          include_external_user_ids: [recipientId],
          contents: { en: preview || 'Message' },
          headings: { en: senderName },
          large_icon: senderAvatar || undefined,
          
          data: { type: 'chat_message', conversationId, senderId, messageId: msg.id },
        });
        console.log('[push] onesignal response id:', resp?.body?.id || 'n/a');
      }
    }
  } catch (e) {
    // log and continue; do not fail the message send
    console.warn('[push] OneSignal push failed for message:', e?.message || e);
  }

  res.json({ success: true, message: 'Message sent', data: msg });
}));

// Upload image attachment for a conversation and return a public URL
router.post('/:conversationId/attachments', uploadMemory.single('img'), asyncHandler(async (req, res) => {
  try {
    const { conversationId } = req.params;
    if (!conversationId) return res.status(400).json({ success: false, message: 'conversationId required' });

    const file = req.file; // provided by multer
    if (!file) return res.status(400).json({ success: false, message: 'No file uploaded (field name img)' });

    const { supabase } = require('../config/supabase');
    const safeName = `${Date.now()}_${Math.floor(Math.random()*1000)}_${(file.originalname || 'image').replace(/\s+/g, '_')}`;
    const storagePath = `chat/${conversationId}/${safeName}`;
    const buffer = file.buffer;
    const contentType = file.mimetype || 'image/jpeg';

    const { error: uploadError } = await supabase
      .storage
      .from('product-images')
      .upload(storagePath, buffer, { contentType, upsert: false });
    if (uploadError) {
      console.error('Supabase upload error (chat):', uploadError);
      return res.status(500).json({ success: false, message: 'Upload failed' });
    }
    const { data: publicData, error: pubErr } = supabase
      .storage
      .from('product-images')
      .getPublicUrl(storagePath);
    if (pubErr) {
      console.error('Supabase public URL error (chat):', pubErr);
      return res.status(500).json({ success: false, message: 'Failed to get public URL' });
    }
    const publicUrl = publicData?.publicUrl;
    return res.json({ success: true, message: 'Attachment uploaded', data: { url: publicUrl } });
  } catch (e) {
    console.error('Chat attachment error', e);
    return res.status(500).json({ success: false, message: 'Server error' });
  }
}));

// List messages in conversation
router.get('/:conversationId/messages', asyncHandler(async (req, res) => {
  const { conversationId } = req.params;
  const page = parseInt(req.query.page || '1', 10);
  const limit = parseInt(req.query.limit || '200', 10);
  const { data, total } = await Message.findByConversationId(conversationId, page, limit);
  res.json({ success: true, message: 'Messages fetched', data, total, page, limit });
}));

// Create conversation automatically from order (buyer ↔ seller of first item)
router.post('/conversation/from-order/:orderId', asyncHandler(async (req, res) => {
  const { orderId } = req.params;
  const order = await Order.findById(orderId);
  if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
  const buyerId = order.user_id;
  const firstItem = Array.isArray(order.order_items) && order.order_items[0];
  const sellerId = firstItem?.products?.seller_id;
  if (!buyerId || !sellerId) return res.status(400).json({ success: false, message: 'Cannot resolve buyer/seller from order' });
  const convo = await Conversation.getOrCreate(buyerId, sellerId);
  res.json({ success: true, message: 'Conversation created from order', data: convo });
}));

module.exports = router;


