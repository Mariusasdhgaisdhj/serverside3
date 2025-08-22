const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const Post = require('../model/post');
const User = require('../model/user');

// list posts
router.get('/', asyncHandler(async (req, res) => {
  try {
    const posts = await Post.find()
      .sort({ createdAt: -1 })
      .populate('userId', 'name')
      .populate('comments.userId', 'name');
    
    res.json({ success: true, message: 'Posts fetched successfully', data: posts });
  } catch (error) {
    console.error('Error fetching posts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch posts', data: null });
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
      userId, 
      title: title.trim(), 
      content: content.trim() 
    });
    
    // Populate user info for response
    await post.populate('userId', 'name');
    
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
      data: null 
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
    
    // Add comment
    post.comments.push({ 
      userId, 
      content: content.trim() 
    });
    
    await post.save();
    
    // Populate user info for response
    await post.populate('userId', 'name');
    await post.populate('comments.userId', 'name');
    
    res.json({ 
      success: true, 
      message: 'Comment added successfully', 
      data: post 
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to add comment', 
      data: null 
    });
  }
}));

// Get a single post with comments
router.get('/:postId', asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    
    const post = await Post.findById(postId)
      .populate('userId', 'name')
      .populate('comments.userId', 'name');
    
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
      data: null 
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
    if (post.userId.toString() !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only delete your own posts' 
      });
    }
    
    await Post.findByIdAndDelete(postId);
    
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
      data: null 
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
    if (post.userId.toString() !== userId) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only delete your own posts' 
      });
    }
    
    await Post.findByIdAndDelete(postId);
    
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
      data: null 
    });
  }
}));

module.exports = router;


