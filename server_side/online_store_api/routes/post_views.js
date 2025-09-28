const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const asyncHandler = require('express-async-handler');

// Track post view
router.post('/:postId/view', asyncHandler(async (req, res) => {
    try {
        const { postId } = req.params;
        const { user_id, viewed_at } = req.body;
        
        if (!user_id) {
            return res.status(400).json({
                success: false,
                message: 'User ID is required'
            });
        }

        // Check if user has already viewed this post
        const { data: existingView, error: checkError } = await supabase
            .from('post_views')
            .select('id')
            .eq('post_id', postId)
            .eq('user_id', user_id)
            .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 = no rows found
            throw checkError;
        }

        if (existingView) {
            // Update existing view timestamp
            const { error: updateError } = await supabase
                .from('post_views')
                .update({ viewed_at: viewed_at || new Date().toISOString() })
                .eq('id', existingView.id);

            if (updateError) throw updateError;
        } else {
            // Create new view record
            const { error: insertError } = await supabase
                .from('post_views')
                .insert({
                    post_id: postId,
                    user_id: user_id,
                    viewed_at: viewed_at || new Date().toISOString()
                });

            if (insertError) throw insertError;
        }

        res.json({
            success: true,
            message: 'Post view tracked successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error tracking post view: ' + error.message
        });
    }
}));

// Check if user has viewed a post
router.get('/:postId/view/:userId', asyncHandler(async (req, res) => {
    try {
        const { postId, userId } = req.params;
        
        const { data, error } = await supabase
            .from('post_views')
            .select('id, viewed_at')
            .eq('post_id', postId)
            .eq('user_id', userId)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw error;
        }

        res.json({
            success: true,
            data: {
                hasViewed: !!data,
                viewedAt: data?.viewed_at
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error checking post view: ' + error.message
        });
    }
}));

module.exports = router;
