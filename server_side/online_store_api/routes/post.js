const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const multer = require('multer');
const { uploadPosters } = require('../uploadFile');
const { Post, Comment } = require('../models/post');
const User = require('../models/user');
const { supabase } = require('../config/supabase');

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
    // Support optional image via multipart (field: img)
    await new Promise((resolve, reject) => {
      uploadPosters.single('img')(req, res, (err) => {
        if (err instanceof multer.MulterError) return reject(err);
        if (err) return reject(err);
        resolve();
      });
    });

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
    
    const { category, tags } = req.body || {};
    let imageUrl = null;
    if (req.file) {
      imageUrl = `http://localhost:3000/image/poster/${req.file.filename}`;
    } else if (req.body.imageUrl) {
      imageUrl = String(req.body.imageUrl);
    }
    
    const post = await Post.create({ 
      user_id: userId, // Use user_id for Supabase
      title: title.trim(), 
      content: content.trim(),
      category: category || 'General',
      tags: tags || [],
      image_url: imageUrl
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

// update post
router.put('/:postId', asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    const { title, content, category } = req.body || {};
    if (!title && !content && !category) {
      return res.status(400).json({ success: false, message: 'Nothing to update' });
    }
    const updateData = {};
    if (title) updateData.title = String(title).trim();
    if (content) updateData.content = String(content).trim();
    if (category) updateData.category = String(category).trim();
    updateData.updated_at = new Date().toISOString();

    const updated = await Post.update(postId, updateData);
    if (!updated) return res.status(404).json({ success: false, message: 'Post not found' });

    res.json({ success: true, message: 'Post updated successfully', data: updated });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ success: false, message: 'Failed to update post' });
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
    
    // Send push notification to post author (if not commenting on own post)
    if (post.user_id !== userId) {
      try {
        // Get commenter's name for the notification
        const commenter = await User.findById(userId);
        const commenterName = commenter?.name || 'Someone';
        
        // Send notification via HTTP request to notification service
        const fetch = require('node-fetch');
        await fetch(`${process.env.BASE_URL || 'http://localhost:3000'}/notifications/comment`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: 'comment',
            post_id: postId,
            post_title: post.title,
            commenter_id: userId,
            post_author_id: post.user_id,
            message: `${commenterName} commented on your post: "${post.title}"`,
          })
        });
      } catch (notifError) {
        console.log('Failed to send comment notification:', notifError);
        // Don't fail the comment creation if notification fails
      }
    }
    
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

// Get comments for a post
router.get('/:postId/comments', asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: 'Post not found' 
      });
    }
    
    // Get comments for this post
    const { data, error } = await supabase
      .from('comments')
      .select(`
        *,
        users:user_id(name, email)
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    res.json({ 
      success: true, 
      message: 'Comments fetched successfully', 
      data: data || []
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch comments', 
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

// Delete a single comment
router.delete('/comments/:commentId', asyncHandler(async (req, res) => {
  try {
    const { commentId } = req.params;
    const { error } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);
    if (error) throw error;
    res.json({ success: true, message: 'Comment deleted' });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ success: false, message: 'Failed to delete comment' });
  }
}));

module.exports = router;


