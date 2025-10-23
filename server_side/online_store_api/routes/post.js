const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const multer = require('multer');
const { uploadPosters } = require('../uploadFile');
const { Post, Comment } = require('../models/post');
const User = require('../models/user');
const { supabase } = require('../config/supabase');

// Helper function to upload file to Supabase
async function uploadToSupabase(file, bucket = process.env.SUPABASE_POSTS_BUCKET || 'product-images') {
  try {
    const original = (file.originalname || 'image').toLowerCase();
    // Replace any character that is not alphanumeric, dot, dash or underscore
    const sanitizedBase = original.replace(/[^a-z0-9._-]+/g, '_');
    const safeName = `${Date.now()}_${sanitizedBase}`;
    const fileName = `posts/${safeName}`; // keep forum uploads under posts/
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file.buffer, {
        contentType: file.mimetype,
        upsert: false
      });

    if (error) {
      console.error('Supabase upload error:', { bucket, error });
      throw new Error(`Failed to upload file: ${error.message}`);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(fileName);

    return publicUrl;
  } catch (error) {
    console.error('Upload to Supabase failed:', error);
    throw error;
  }
}

// List posts
router.get('/', asyncHandler(async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    
    const result = await Post.findAll(page, limit);

    // Normalize for frontend: add camelCase mirrors
    const normalized = (result.data || []).map((p) => ({
      ...p,
      imageUrl: p.image_url || null,
      isPinned: p.is_pinned,
      isLocked: p.is_locked,
      isHidden: p.is_hidden,
      isFlagged: p.is_flagged,
    }));

    res.json({ 
      success: true, 
      message: 'Posts fetched successfully', 
      data: normalized,
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

// Create post
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
      try {
        imageUrl = await uploadToSupabase(req.file);
        console.log('Post image uploaded to Supabase:', imageUrl);
      } catch (uploadError) {
        console.error('Failed to upload post image:', uploadError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to upload image. Please try again.' 
        });
      }
    } else if (req.body.imageUrl) {
      imageUrl = String(req.body.imageUrl);
    }
    
    // Normalize tags to a string[] for Postgres text[] column
    let parsedTags = [];
    if (tags) {
      let tagArray;
      if (Array.isArray(tags)) {
        tagArray = tags;
      } else if (typeof tags === 'string') {
        tagArray = tags.split(',').map(t => t.trim()).filter(t => t.length > 0);
      } else {
        tagArray = [];
      }
      if (tagArray.length > 0) parsedTags = tagArray;
    }
    
    const post = await Post.create({ 
      user_id: userId, // Use user_id for Supabase
      title: title.trim(), 
      content: content.trim(),
      category: category || 'General',
      tags: parsedTags,  // string[] (text[] column)
      image_url: imageUrl
    });
    
    // Add camelCase mirrors on response
    const postNormalized = post ? { ...post, imageUrl: post.image_url || null } : post;

    res.json({ 
      success: true, 
      message: 'Post created successfully', 
      data: postNormalized 
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

// Update post - FIXED typo
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
    if (category) updateData.category = String(category).trim(); // FIXED: was updateData.updateData.category
    updateData.updated_at = new Date().toISOString();

    const updated = await Post.update(postId, updateData);
    if (!updated) return res.status(404).json({ success: false, message: 'Post not found' });

    res.json({ success: true, message: 'Post updated successfully', data: updated });
  } catch (error) {
    console.error('Error updating post:', error);
    res.status(500).json({ success: false, message: 'Failed to update post' });
  }
}));

// Delete post
router.post('/:postId/delete', asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ 
        success: false, 
        message: 'Post not found' 
      });
    }
    
    // Delete via Supabase (handles RLS)
    const { data: deletedPost, error } = await supabase
      .from('posts')
      .delete()
      .eq('id', postId)
      .select()
      .single();
    
    if (error) {
      console.error('Supabase delete error:', error);
      throw new Error(`Failed to delete post: ${error.message}`);
    }
    
    // Optionally, delete associated comments/views (if needed)
    await supabase.from('comments').delete().eq('post_id', postId);
    
    res.json({ 
      success: true, 
      message: 'Post deleted successfully',
      data: deletedPost 
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

// ==================== COMMENT ROUTES ====================

// Get comments for a post - NEW
router.get('/:postId/comments', asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    
    // Check if post exists
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    // Fetch comments with user information
    const { data: comments, error } = await supabase
      .from('comments')
      .select(`
        *,
        users:user_id (
          id,
          name,
          email
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('Error fetching comments:', error);
      throw error;
    }
    
    res.json({ 
      success: true, 
      message: 'Comments fetched successfully', 
      data: comments || []
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

// Add comment
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
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    // Check if user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Create the comment
    const newComment = await Comment.create({
      post_id: postId,
      user_id: userId,
      content: content.trim()
    });
    
    res.json({ 
      success: true, 
      message: 'Comment added successfully', 
      data: newComment 
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

// Delete comment - NEW
router.delete('/comments/:commentId', asyncHandler(async (req, res) => {
  try {
    const { commentId } = req.params;
    
    // Check if comment exists
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .single();
    
    if (fetchError || !comment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Comment not found' 
      });
    }
    
    // Delete the comment
    const { error: deleteError } = await supabase
      .from('comments')
      .delete()
      .eq('id', commentId);
    
    if (deleteError) {
      console.error('Error deleting comment:', deleteError);
      throw deleteError;
    }
    
    res.json({ 
      success: true, 
      message: 'Comment deleted successfully' 
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to delete comment', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Flag comment - NEW
router.post('/comments/:commentId/flag', asyncHandler(async (req, res) => {
  try {
    const { commentId } = req.params;
    
    // Check if comment exists
    const { data: comment, error: fetchError } = await supabase
      .from('comments')
      .select('*')
      .eq('id', commentId)
      .single();
    
    if (fetchError || !comment) {
      return res.status(404).json({ 
        success: false, 
        message: 'Comment not found' 
      });
    }
    
    // Toggle flag status
    const { data: updated, error: updateError } = await supabase
      .from('comments')
      .update({ 
        is_flagged: !comment.is_flagged,
        updated_at: new Date().toISOString()
      })
      .eq('id', commentId)
      .select()
      .single();
    
    if (updateError) {
      console.error('Error flagging comment:', updateError);
      throw updateError;
    }
    
    res.json({ 
      success: true, 
      message: updated.is_flagged ? 'Comment flagged successfully' : 'Comment unflagged successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error flagging comment:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to flag comment', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// ==================== POST MODERATION ROUTES ====================

// Pin/Unpin post
router.post('/:postId/pin', asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    const updated = await Post.update(postId, { 
      is_pinned: true,
      updated_at: new Date().toISOString()
    });
    
    res.json({ 
      success: true, 
      message: 'Post pinned successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error pinning post:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to pin post', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Unpin post - NEW
router.post('/:postId/unpin', asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    const updated = await Post.update(postId, { 
      is_pinned: false,
      updated_at: new Date().toISOString()
    });
    
    res.json({ 
      success: true, 
      message: 'Post unpinned successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error unpinning post:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to unpin post', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Lock post
router.post('/:postId/lock', asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    const updated = await Post.update(postId, { 
      is_locked: true,
      updated_at: new Date().toISOString()
    });
    
    res.json({ 
      success: true, 
      message: 'Post locked successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error locking post:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to lock post', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Unlock post - NEW
router.post('/:postId/unlock', asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    const updated = await Post.update(postId, { 
      is_locked: false,
      updated_at: new Date().toISOString()
    });
    
    res.json({ 
      success: true, 
      message: 'Post unlocked successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error unlocking post:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to unlock post', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Hide post
router.post('/:postId/hide', asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    const updated = await Post.update(postId, { 
      is_hidden: true,
      updated_at: new Date().toISOString()
    });
    
    res.json({ 
      success: true, 
      message: 'Post hidden successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error hiding post:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to hide post', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Show post - NEW
router.post('/:postId/show', asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    const updated = await Post.update(postId, { 
      is_hidden: false,
      updated_at: new Date().toISOString()
    });
    
    res.json({ 
      success: true, 
      message: 'Post shown successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error showing post:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to show post', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Flag post - NEW
router.post('/:postId/flag', asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    const updated = await Post.update(postId, { 
      is_flagged: true,
      updated_at: new Date().toISOString()
    });
    
    res.json({ 
      success: true, 
      message: 'Post flagged successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error flagging post:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to flag post', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Unflag post - NEW
router.post('/:postId/unflag', asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    const post = await Post.findById(postId);
    
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    const updated = await Post.update(postId, { 
      is_flagged: false,
      updated_at: new Date().toISOString()
    });
    
    res.json({ 
      success: true, 
      message: 'Post unflagged successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error unflagging post:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to unflag post', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Moderate post
router.post('/:postId/moderate', asyncHandler(async (req, res) => {
  try {
    const { postId } = req.params;
    const { reason, action } = req.body;
    
    if (!action) {
      return res.status(400).json({ success: false, message: 'Action is required' });
    }
    
    const post = await Post.findById(postId);
    if (!post) {
      return res.status(404).json({ success: false, message: 'Post not found' });
    }
    
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    // Apply the requested action
    if (action === 'flag') {
      updateData.is_flagged = true;
    } else if (action === 'unflag') {
      updateData.is_flagged = false;
    }
    
    const updated = await Post.update(postId, updateData);
    
    res.json({ 
      success: true, 
      message: 'Post moderated successfully',
      data: updated
    });
  } catch (error) {
    console.error('Error moderating post:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to moderate post', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

// Bulk action on posts
router.post('/bulk-action', asyncHandler(async (req, res) => {
  try {
    const { action, postIds } = req.body;
    
    if (!action || !Array.isArray(postIds) || postIds.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Action and postIds array are required' 
      });
    }
    
    const updateData = {
      updated_at: new Date().toISOString()
    };
    
    // Set the appropriate field based on the action
    switch (action) {
      case 'pin':
        updateData.is_pinned = true;
        break;
      case 'unpin':
        updateData.is_pinned = false;
        break;
      case 'lock':
        updateData.is_locked = true;
        break;
      case 'unlock':
        updateData.is_locked = false;
        break;
      case 'hide':
        updateData.is_hidden = true;
        break;
      case 'show':
      case 'unhide':
        updateData.is_hidden = false;
        break;
      case 'flag':
        updateData.is_flagged = true;
        break;
      case 'unflag':
      case 'approve':
        updateData.is_flagged = false;
        break;
      case 'delete':
      case 'archive':
        // Handle bulk deletion
        const { error: delError } = await supabase
          .from('posts')
          .delete()
          .in('id', postIds);
          
        if (delError) throw delError;
        
        // Also delete associated comments
        await supabase
          .from('comments')
          .delete()
          .in('post_id', postIds);
        
        return res.json({ 
          success: true, 
          message: `${postIds.length} posts deleted successfully` 
        });
      default:
        return res.status(400).json({ 
          success: false, 
          message: `Unknown action: ${action}` 
        });
    }
    
    // Update all posts with the specified IDs
    const { error: updateError } = await supabase
      .from('posts')
      .update(updateData)
      .in('id', postIds);
      
    if (updateError) throw updateError;
    
    res.json({ 
      success: true, 
      message: `Bulk action '${action}' applied to ${postIds.length} posts successfully` 
    });
  } catch (error) {
    console.error('Error performing bulk action:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to perform bulk action', 
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}));

module.exports = router;