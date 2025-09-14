const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const { Post, Comment } = require('../models/post');
const User = require('../models/user');

// list posts
router.get('/', asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const result = await Post.findAll(page, limit);
    
    res.json({ 
      success: true, 
      message: 'Posts fetched successfully', 
      data: result.data,
      total: result.total,
      page: page,
      limit: limit
    });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch posts', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// create post
router.post('/', asyncHandler(async (req, res) => {
  try {
    const { userId, title, content } = req.body || {};
    
    // Validate required fields
    if (!userId || !title || !content) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId, title, and content are required' 
      });
    }
    
    // Validate title and content length
    if (title.trim().length < 3) {
      return res.status(400).json({ 
        success: false, 
        message: 'Title must be at least 3 characters long' 
      });
    }
    
    if (content.trim().length < 10) {
      return res.status(400).json({ 
        success: false, 
        message: 'Content must be at least 10 characters long' 
      });
    }
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    const post = await Post.create({ 
      user_id: userId, // Use user_id for Supabase
      title: title.trim(), 
      content: content.trim() 
    });
    
    res.json({ 
      success: true, 
      message: 'Post created successfully', 
      data: post 
    });
  } catch (error) {
    console.error('Error creating post:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to create post', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// add comment
router.post('/:postId/comments', asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId, content } = req.body || {};
    
    // Validate required fields
    if (!userId || !content) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId and content are required' 
      });
    }
    
    // Validate content length
    if (content.trim().length < 1) {
      return res.status(400).json({ 
        success: false, 
        message: 'Comment content cannot be empty' 
      });
    }
    
    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: 'Post not found' 
      });
    }
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    // Create comment
    const comment = await Comment.create({ 
      post_id: postId,
      user_id: userId, 
      content: content.trim() 
    });
    
    res.json({ 
      success: true, 
      message: 'Comment added successfully', 
      data: comment 
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add comment', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Get a single post with comments
router.get('/:postId', asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: 'Post not found' 
      });
    }
    
    res.json({ 
      success: true, 
      message: 'Post fetched successfully', 
      data: post 
    });
  } catch (error) {
    console.error('Error fetching post:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch post', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Delete a post (only by the author)
router.delete('/:postId', asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body || {};
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId is required' 
      });
    }
    
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: 'Post not found' 
      });
    }
    
    // Check if user is the author of the post
    if (post.user_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only delete your own posts' 
      });
    }
    
    await Post.delete(postId);
    
    res.json({ 
      success: true, 
      message: 'Post deleted successfully', 
      data: null 
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete post', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Alternative delete endpoint using POST (for frontend compatibility)
router.post('/:postId/delete', asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    const { userId } = req.body || {};
    
    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: 'userId is required' 
      });
    }
    
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: 'Post not found' 
      });
    }
    
    // Check if user is the author of the post
    if (post.user_id !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only delete your own posts' 
      });
    }
    
    await Post.delete(postId);
    
    res.json({ 
      success: true, 
      message: 'Post deleted successfully', 
      data: null 
    });
  } catch (error) {
    console.error('Error deleting post:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete post', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

module.exports = router;


