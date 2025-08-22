const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const Post = require('../model/post');

// list posts
router.get('/', asyncHandler(async (req, res) => {
  const posts = await Post.find().sort({ createdAt: -1 }).populate('userId', 'name');
  res.json({ success: true, message: 'Posts fetched', data: posts });
}));

// create post
router.post('/', asyncHandler(async (req, res) => {
  const { userId, title, content } = req.body || {};
  if (!userId || !title || !content) {
    return res.status(400).json({ success: false, message: 'userId, title, content required' });
  }
  const post = await Post.create({ userId, title, content });
  res.json({ success: true, message: 'Post created', data: post });
}));

// add comment
router.post('/:postId/comments', asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { userId, content } = req.body || {};
  if (!userId || !content) {
    return res.status(400).json({ success: false, message: 'userId and content required' });
  }
  const post = await Post.findById(postId);
  if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
  post.comments.push({ userId, content });
  await post.save();
  res.json({ success: true, message: 'Comment added', data: post });
}));

module.exports = router;


