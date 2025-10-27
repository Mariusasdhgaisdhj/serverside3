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

// Get seller earnings (pending and completed)
router.get('/:sellerId/earnings', asyncHandler(async (req, res) => {
    try {
        const { sellerId } = req.params;
        
        // Get pending earnings (orders completed but not paid out)
        const { data: pendingOrders, error: pendingError } = await supabase
            .from('orders')
            .select('id, total_price, order_status, created_at')
            .eq('user_id', sellerId)
            .eq('order_status', 'completed')
            .not('id', 'in', supabase
                .from('seller_payouts')
                .select('order_id')
                .eq('seller_id', sellerId)
                .eq('status', 'completed')
            );
        
        if (pendingError) throw pendingError;
        
        const pendingEarnings = pendingOrders?.reduce((sum, order) => sum + (order.total_price || 0), 0) || 0;
        
        // Get total payouts
        const { data: payoutsData, error: payoutsError } = await supabase
            .from('seller_payouts')
            .select('amount, net_amount, status')
            .eq('seller_id', sellerId);
        
        if (payoutsError) throw payoutsError;
        
        const completedPayouts = payoutsData?.filter(p => p.status === 'completed')
            .reduce((sum, p) => sum + (p.net_amount || 0), 0) || 0;
        
        const totalPayouts = payoutsData?.reduce((sum, p) => sum + (p.amount || 0), 0) || 0;
        
        res.json({
            success: true,
            data: {
                pendingEarnings,
                completedPayouts,
                totalEarnings: completedPayouts + pendingEarnings, // No platform fee - 100% to seller
                totalOrders: pendingOrders?.length || 0
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching seller earnings: ' + error.message
        });
    }
}));

// Process seller payout
router.post('/:sellerId/payout', asyncHandler(async (req, res) => {
    try {
        const { sellerId } = req.params;
        const { orderIds, payoutMethod, adminNotes } = req.body;
        const adminId = req.body.processedBy;
        
        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Order IDs are required'
            });
        }
        
        // Get seller info
        const { data: seller, error: sellerError } = await supabase
            .from('users')
            .select('*')
            .eq('id', sellerId)
            .single();
        
        if (sellerError) throw sellerError;
        if (!seller) {
            return res.status(404).json({
                success: false,
                message: 'Seller not found'
            });
        }
        
        // Get orders to payout
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('*')
            .eq('user_id', sellerId)
            .in('id', orderIds)
            .eq('order_status', 'completed');
        
        if (ordersError) throw ordersError;
        
        if (!orders || orders.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'No valid completed orders found'
            });
        }
        
        // Calculate total amount (no platform fee - 100% to seller)
        const totalAmount = orders.reduce((sum, order) => sum + (order.total_price || 0), 0);
        const platformFee = 0; // No fee - completely free
        const netAmount = totalAmount; // 100% to seller
        
        // Get payout information from seller
        const payoutInfo = seller.payoutinfo || {};
        
        // Create payout record
        const { data: payout, error: payoutError } = await supabase
            .from('seller_payouts')
            .insert([{
                seller_id: sellerId,
                amount: totalAmount,
                fee: platformFee,
                net_amount: netAmount,
                payment_method: orders[0].payment_method || 'cod',
                payout_method: payoutMethod || 'gcash',
                payout_info: payoutInfo,
                status: 'processing',
                processed_by: adminId,
                notes: adminNotes || 'Payout initiated by admin',
                order_id: orderIds[0] // Store first order as reference
            }])
            .select()
            .single();
        
        if (payoutError) throw payoutError;
        
        res.json({
            success: true,
            message: 'Payout initiated successfully',
            data: {
                payout,
                totalAmount,
                platformFee,
                netAmount,
                ordersCount: orders.length
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error processing payout: ' + error.message
        });
    }
}));

// Get seller payout history
router.get('/:sellerId/payouts', asyncHandler(async (req, res) => {
    try {
        const { sellerId } = req.params;
        const { status, limit = 20, offset = 0 } = req.query;
        
        let query = supabase
            .from('seller_payouts')
            .select('*, orders!inner(id, total_price, order_status), sellers:processed_by(name, email)')
            .eq('seller_id', sellerId)
            .order('created_at', { ascending: false });
        
        if (status) {
            query = query.eq('status', status);
        }
        
        const { data: payouts, error: payoutsError } = await query
            .range(offset, offset + limit - 1);
        
        if (payoutsError) throw payoutsError;
        
        res.json({
            success: true,
            data: payouts || []
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Error fetching payout history: ' + error.message
        });
    }
}));

module.exports = router;
