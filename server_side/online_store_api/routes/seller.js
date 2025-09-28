const express = require('express');
const router = express.Router();
const { supabase } = require('../config/supabase');
const asyncHandler = require('express-async-handler');

// Get seller statistics
router.get('/:sellerId/stats', asyncHandler(async (req, res) => {
    try {
        const { sellerId } = req.params;
        
        // Get total products count
        const { count: totalProducts, error: productsError } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('seller_id', sellerId);
        
        if (productsError) throw productsError;

        // Get total orders count
        const { count: totalOrders, error: ordersError } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', sellerId);
        
        if (ordersError) throw ordersError;

        // Get total revenue
        const { data: revenueData, error: revenueError } = await supabase
            .from('orders')
            .select('total_price')
            .eq('user_id', sellerId)
            .eq('order_status', 'completed');
        
        if (revenueError) throw revenueError;
        
        const totalRevenue = revenueData?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0;

        // Get pending orders count
        const { count: pendingOrders, error: pendingError } = await supabase
            .from('orders')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', sellerId)
            .in('order_status', ['pending', 'processing']);
        
        if (pendingError) throw pendingError;

        res.json({
            success: true,
            data: {
                totalProducts: totalProducts || 0,
                totalOrders: totalOrders || 0,
                totalRevenue: totalRevenue,
                pendingOrders: pendingOrders || 0
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching seller statistics: ' + error.message
        });
    }
}));

// Get seller recent activity
router.get('/:sellerId/activity', asyncHandler(async (req, res) => {
    try {
        const { sellerId } = req.params;
        const limit = parseInt(req.query.limit) || 10;
        
        // Get recent orders
        const { data: recentOrders, error: ordersError } = await supabase
            .from('orders')
            .select(`
                id,
                order_status,
                total_price,
                created_at,
                order_items (
                    product_id,
                    quantity,
                    products (
                        name
                    )
                )
            `)
            .eq('user_id', sellerId)
            .order('created_at', { ascending: false })
            .limit(limit);
        
        if (ordersError) throw ordersError;

        // Get recent messages
        const { data: recentMessages, error: messagesError } = await supabase
            .from('conversations')
            .select(`
                id,
                created_at,
                buyer_id,
                messages (
                    text,
                    created_at,
                    sender_id
                )
            `)
            .eq('seller_id', sellerId)
            .order('created_at', { ascending: false })
            .limit(5);
        
        if (messagesError) throw messagesError;

        // Get recent product updates
        const { data: recentProducts, error: productsError } = await supabase
            .from('products')
            .select('id, name, updated_at')
            .eq('seller_id', sellerId)
            .order('updated_at', { ascending: false })
            .limit(5);
        
        if (productsError) throw productsError;

        // Format activities
        const activities = [];

        // Add order activities
        recentOrders?.forEach(order => {
            const productNames = order.order_items?.map(item => item.products?.name).filter(Boolean).join(', ') || 'Unknown Product';
            activities.push({
                id: `order_${order.id}`,
                type: 'order',
                title: `New order received`,
                description: `${productNames} - ₱${order.total_price?.toFixed(2) || '0.00'}`,
                icon: 'shopping_cart',
                color: 'green',
                timestamp: order.created_at,
                status: order.order_status
            });
        });

        // Add message activities
        recentMessages?.forEach(conversation => {
            const latestMessage = conversation.messages?.[0];
            if (latestMessage) {
                activities.push({
                    id: `message_${conversation.id}`,
                    type: 'message',
                    title: `New message received`,
                    description: latestMessage.text?.substring(0, 50) + (latestMessage.text?.length > 50 ? '...' : ''),
                    icon: 'message',
                    color: 'blue',
                    timestamp: latestMessage.created_at || conversation.created_at
                });
            }
        });

        // Add product activities
        recentProducts?.forEach(product => {
            activities.push({
                id: `product_${product.id}`,
                type: 'product',
                title: `Product updated`,
                description: `${product.name} - Stock or details updated`,
                icon: 'edit',
                color: 'orange',
                timestamp: product.updated_at
            });
        });

        // Sort all activities by timestamp
        activities.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

        // Return limited results
        const limitedActivities = activities.slice(0, limit);

        res.json({
            success: true,
            data: limitedActivities
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching seller activity: ' + error.message
        });
    }
}));

module.exports = router;
