const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const Order = require('../models/order');
const OneSignal = require('onesignal-node');
const dotenv = require('dotenv');
const { supabase } = require('../config/supabase');
dotenv.config();

// OneSignal client for sending push notifications
const client = new OneSignal.Client(process.env.ONE_SIGNAL_APP_ID, process.env.ONE_SIGNAL_REST_API_KEY);

// Function to validate stock availability before order creation
async function validateStockAvailability(items) {
    try {
        console.log('Validating stock for items:', items);
        
        for (const item of items) {
            const { data: product, error } = await supabase
                .from('products')
                .select('id, name, quantity')
                .eq('id', item.productID)
                .single();
                
            if (error) {
                throw new Error(`Product ${item.productID} not found: ${error.message}`);
            }
            
            if (!product) {
                throw new Error(`Product ${item.productID} not found`);
            }
            
            const currentStock = product.quantity || 0;
            const requestedQuantity = item.quantity || 0;
            
            if (currentStock < requestedQuantity) {
                throw new Error(`Insufficient stock for "${product.name}". Available: ${currentStock}, Requested: ${requestedQuantity}`);
            }
        }
        
        console.log('Stock validation passed for all items');
        return true;
    } catch (error) {
        console.error('Stock validation failed:', error.message);
        throw error;
    }
}

// Function to update product quantities after successful order
async function updateProductQuantities(items) {
    try {
        console.log('Updating product quantities for items:', items);
        
        for (const item of items) {
            const { error } = await supabase.rpc('decrease_product_quantity', {
                product_id: item.productID,
                quantity_to_subtract: item.quantity || 0
            });
            
            if (error) {
                console.error(`Failed to update quantity for product ${item.productID}:`, error);
                // Continue with other products even if one fails
            } else {
                console.log(`Updated quantity for product ${item.productID}: -${item.quantity}`);
            }
        }
        
        console.log('Product quantities updated successfully');
    } catch (error) {
        console.error('Error updating product quantities:', error.message);
        throw error;
    }
}

// Function to restore product quantities when order is cancelled
async function restoreProductQuantities(orderId) {
    try {
        console.log('Restoring product quantities for cancelled order:', orderId);
        
        // Get order items
        const { data: orderItems, error: itemsError } = await supabase
            .from('order_items')
            .select('product_id, quantity')
            .eq('order_id', orderId);
            
        if (itemsError) {
            throw new Error(`Failed to get order items: ${itemsError.message}`);
        }
        
        if (!orderItems || orderItems.length === 0) {
            console.log('No items found for order:', orderId);
            return;
        }
        
        // Restore quantities for each item
        for (const item of orderItems) {
            const { error } = await supabase.rpc('increase_product_quantity', {
                product_id: item.product_id,
                quantity_to_add: item.quantity || 0
            });
            
            if (error) {
                console.error(`Failed to restore quantity for product ${item.product_id}:`, error);
            } else {
                console.log(`Restored quantity for product ${item.product_id}: +${item.quantity}`);
            }
        }
        
        console.log('Product quantities restored successfully');
    } catch (error) {
        console.error('Error restoring product quantities:', error.message);
        throw error;
    }
}

// Function to send new order notifications to sellers
async function sendNewOrderNotifications(sellerIds, order, products) {
    try {
        console.log('Sending new order notifications to sellers:', sellerIds);
        
        // Get buyer information
        const { data: buyerData, error: buyerError } = await supabase
            .from('users')
            .select('firstname, lastname, business_name')
            .eq('id', order.user_id)
            .single();
            
        if (buyerError) {
            console.warn('Failed to get buyer info for notification:', buyerError);
        }
        
        const buyerName = buyerData?.business_name || 
                         `${buyerData?.firstname || ''} ${buyerData?.lastname || ''}`.trim() || 
                         'A customer';
        
        // Get product names
        const productNames = products.map(p => p.name).filter(Boolean);
        const productList = productNames.length > 0 ? productNames.join(', ') : 'products';
        
        // Create notification for each seller
        for (const sellerId of sellerIds) {
            try {
                const notification = {
                    app_id: process.env.ONE_SIGNAL_APP_ID,
                    include_external_user_ids: [String(sellerId)],
                    headings: { en: '🛒 New Order Received!' },
                    contents: { 
                        en: `${buyerName} ordered ${productList} - ₱${order.total_price?.toFixed(2) || '0.00'}` 
                    },
                    large_icon: 'https://via.placeholder.com/64x64/4CAF50/FFFFFF?text=🛒',
                    android_sound: 'default',
                    ios_sound: 'default',
                    android_channel_id: process.env.ONE_SIGNAL_ANDROID_CHANNEL_ID || undefined,
                    priority: 10,
                    data: {
                        type: 'new_order',
                        order_id: order.id,
                        buyer_id: order.user_id,
                        total_price: order.total_price,
                        order_status: order.order_status
                    }
                };
                
                const response = await client.createNotification(notification);
                console.log(`New order notification sent to seller ${sellerId}:`, response?.body?.id || 'n/a');
                
            } catch (sellerError) {
                console.warn(`Failed to send notification to seller ${sellerId}:`, sellerError?.message || sellerError);
            }
        }
        
    } catch (error) {
        console.warn('Failed to send new order notifications:', error?.message || error);
    }
}

// ============================================
// PAYMENT ROUTES - MUST BE FIRST TO AVOID CONFLICTS
// ============================================

// Get payments with filtering and pagination
router.get('/payments', asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 50, search, status, paymentMethod, dateFrom, dateTo, sellerId } = req.query;

        // Build filters
        let query = supabase
            .from('orders')
            .select('*', { count: 'exact' });

        if (status) query = query.eq('order_status', status);
        if (paymentMethod) query = query.eq('payment_method', paymentMethod);
        if (sellerId) query = query.eq('seller_id', sellerId);
        
        // Date range filter
        if (dateFrom) query = query.gte('created_at', dateFrom);
        if (dateTo) query = query.lte('created_at', dateTo);

        // Execute query
        const { data: orders, error, count } = await query
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

        if (error) {
            throw new Error(`Failed to fetch orders: ${error.message}`);
        }

        // Transform orders to payment format
        let payments = orders.map(order => ({
            _id: order.id,
            orderId: order.id,
            userId: order.user_id,
            amount: order.total_price || 0,
            currency: 'PHP',
            paymentMethod: order.payment_method || 'Unknown',
            status: order.order_status || 'pending',
            referenceNumber: order.reference_number,
            transactionId: order.id,
            createdAt: order.created_at,
            updatedAt: order.updated_at,
            metadata: {
                sellerId: order.seller_id,
                items: order.items
            }
        }));

        // Apply search filter if provided
        if (search) {
            const searchLower = search.toLowerCase();
            payments = payments.filter(payment => 
                payment._id.toLowerCase().includes(searchLower) ||
                payment.orderId.toLowerCase().includes(searchLower) ||
                payment.referenceNumber?.toLowerCase().includes(searchLower) ||
                payment.transactionId?.toLowerCase().includes(searchLower)
            );
        }

        res.json({ 
            success: true, 
            message: "Payments retrieved successfully.", 
            data: payments,
            total: count || 0,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil((count || 0) / limit)
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Get payment statistics
router.get('/payments/stats', asyncHandler(async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        
        // Build query
        let query = supabase.from('orders').select('*');
        
        // Date range filter
        if (dateFrom || dateTo) {
            if (dateFrom) query = query.gte('created_at', dateFrom);
            if (dateTo) query = query.lte('created_at', dateTo);
        }

        const { data: orders, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch orders: ${error.message}`);
        }

        // Calculate statistics
        const totalTransactions = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + (order.total_price || 0), 0);
        const successfulPayments = orders.filter(o => o.order_status === 'paid').length;
        const pendingPayments = orders.filter(o => o.order_status === 'pending').length;
        const failedPayments = orders.filter(o => o.order_status === 'cancelled').length;
        const refundedPayments = orders.filter(o => o.order_status === 'refunded').length;
        const disputedPayments = orders.filter(o => o.order_status === 'disputed').length;
        
        const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
        const successRate = totalTransactions > 0 ? (successfulPayments / totalTransactions) * 100 : 0;
        const platformEarnings = totalRevenue * 0.05; // 5% platform fee
        
        // Payment method distribution
        const paymentMethodDistribution = {};
        orders.forEach(order => {
            const method = order.payment_method || 'Unknown';
            if (!paymentMethodDistribution[method]) {
                paymentMethodDistribution[method] = { count: 0, amount: 0 };
            }
            paymentMethodDistribution[method].count++;
            paymentMethodDistribution[method].amount += order.total_price || 0;
        });

        const stats = {
            totalTransactions,
            totalRevenue,
            successfulPayments,
            pendingPayments,
            failedPayments,
            refundedPayments,
            disputedPayments,
            averageTransactionValue,
            successRate,
            platformEarnings,
            pendingPayouts: 0, // This would be calculated from seller payouts
            paymentMethodDistribution
        };

        res.json({ 
            success: true, 
            message: "Payment statistics retrieved successfully.", 
            data: stats 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Get single payment by ID
router.get('/payments/:id', asyncHandler(async (req, res) => {
    try {
        const paymentId = req.params.id;
        
        const { data: order, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', paymentId)
            .single();

        if (error) {
            return res.status(404).json({ success: false, message: "Payment not found." });
        }

        // Transform order to payment format
        const payment = {
            _id: order.id,
            orderId: order.id,
            userId: order.user_id,
            amount: order.total_price || 0,
            currency: 'PHP',
            paymentMethod: order.payment_method || 'Unknown',
            status: order.order_status || 'pending',
            referenceNumber: order.reference_number,
            transactionId: order.id,
            createdAt: order.created_at,
            updatedAt: order.updated_at,
            metadata: {
                sellerId: order.seller_id,
                items: order.items
            }
        };

        res.json({ 
            success: true, 
            message: "Payment retrieved successfully.", 
            data: payment 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// ============================================
// END PAYMENT ROUTES
// ============================================


// Initialize OneSignal client (only if environment variables are set)
let oneSignalClient = null;
if (process.env.ONE_SIGNAL_APP_ID && process.env.ONE_SIGNAL_REST_API_KEY) {
    oneSignalClient = new OneSignal.Client(process.env.ONE_SIGNAL_APP_ID, process.env.ONE_SIGNAL_REST_API_KEY);
}

// Function to send cancellation push notifications
async function sendCancellationNotifications(order, reason, cancelledBy) {
    const orderId = order._id || order.id;
    const buyerName = order.userID?.name || 'Customer';
    const orderTotal = order.totalPrice || 0;
    
    // Prepare notification content
    const notificationTitle = 'Order Cancelled';
    const notificationMessage = `Your order #${orderId.slice(0, 8)} has been cancelled. Reason: ${reason}`;
    
    // 1. Send Push Notification via OneSignal
    if (oneSignalClient) {
        try {
            const pushNotification = {
                contents: { 'en': notificationMessage },
                headings: { 'en': notificationTitle },
                included_segments: ['All'], // You can target specific users if you have their player IDs
                data: {
                    type: 'order_cancelled',
                    order_id: orderId,
                    reason: reason,
                    cancelled_by: cancelledBy || 'admin',
                    total_amount: orderTotal
                },
                // Optional: Add sound and priority
                sound: 'default',
                priority: 10
            };
            
            const pushResponse = await oneSignalClient.createNotification(pushNotification);
            console.log('Push notification sent:', pushResponse.body.id);
        } catch (pushError) {
            console.error('Failed to send push notification:', pushError);
        }
    } else {
        console.log('OneSignal client not initialized, skipping push notification');
    }
    
}

// Function to send refund push notifications
async function sendRefundNotifications(order, amount, reason, adminId) {
    const orderId = order._id || order.id;
    const buyerName = order.userID?.name || 'Customer';
    const orderTotal = order.totalPrice || 0;
    
    // Prepare notification content
    const notificationTitle = 'Refund Processed';
    const notificationMessage = `Your refund of ₱${parseFloat(amount).toLocaleString()} for order #${orderId.slice(0, 8)} has been processed.`;
    
    // 1. Send Push Notification via OneSignal
    if (oneSignalClient) {
        try {
            const pushNotification = {
                contents: { 'en': notificationMessage },
                headings: { 'en': notificationTitle },
                included_segments: ['All'],
                data: {
                    type: 'order_refunded',
                    order_id: orderId,
                    refund_amount: amount,
                    reason: reason,
                    admin_id: adminId,
                    total_amount: orderTotal
                },
                sound: 'default',
                priority: 10
            };
            
            const pushResponse = await oneSignalClient.createNotification(pushNotification);
            console.log('Refund push notification sent:', pushResponse.body.id);
        } catch (pushError) {
            console.error('Failed to send refund push notification:', pushError);
        }
    } else {
        console.log('OneSignal client not initialized, skipping refund push notification');
    }
    
}

// ============================================
// PAYMENT ROUTES - MUST BE FIRST TO AVOID CONFLICTS
// ============================================

// Get payments with filtering and pagination
router.get('/payments', asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 50, search, status, paymentMethod, dateFrom, dateTo, sellerId } = req.query;

        // Build filters
        let query = supabase
            .from('orders')
            .select('*', { count: 'exact' });

        if (status) query = query.eq('order_status', status);
        if (paymentMethod) query = query.eq('payment_method', paymentMethod);
        if (sellerId) query = query.eq('seller_id', sellerId);
        
        // Date range filter
        if (dateFrom) query = query.gte('created_at', dateFrom);
        if (dateTo) query = query.lte('created_at', dateTo);

        // Execute query
        const { data: orders, error, count } = await query
            .order('created_at', { ascending: false })
            .range((page - 1) * limit, page * limit - 1);

        if (error) {
            throw new Error(`Failed to fetch orders: ${error.message}`);
        }

        // Transform orders to payment format
        let payments = orders.map(order => ({
            _id: order.id,
            orderId: order.id,
            userId: order.user_id,
            amount: order.total_price || 0,
            currency: 'PHP',
            paymentMethod: order.payment_method || 'Unknown',
            status: order.order_status || 'pending',
            referenceNumber: order.reference_number,
            transactionId: order.id,
            createdAt: order.created_at,
            updatedAt: order.updated_at,
            metadata: {
                sellerId: order.seller_id,
                items: order.items
            }
        }));

        // Apply search filter if provided
        if (search) {
            const searchLower = search.toLowerCase();
            payments = payments.filter(payment => 
                payment._id.toLowerCase().includes(searchLower) ||
                payment.orderId.toLowerCase().includes(searchLower) ||
                payment.referenceNumber?.toLowerCase().includes(searchLower) ||
                payment.transactionId?.toLowerCase().includes(searchLower)
            );
        }

        res.json({ 
            success: true, 
            message: "Payments retrieved successfully.", 
            data: payments,
            total: count || 0,
            page: parseInt(page),
            limit: parseInt(limit),
            totalPages: Math.ceil((count || 0) / limit)
        });
    } catch (error) {
        console.error('Error fetching payments:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Get payment statistics
router.get('/payments/stats', asyncHandler(async (req, res) => {
    try {
        const { dateFrom, dateTo } = req.query;
        
        // Build query
        let query = supabase.from('orders').select('*');
        
        if (dateFrom) query = query.gte('created_at', dateFrom);
        if (dateTo) query = query.lte('created_at', dateTo);

        const { data: orders, error } = await query;

        if (error) {
            throw new Error(`Failed to fetch orders: ${error.message}`);
        }

        // Calculate statistics
        const totalTransactions = orders.length;
        const totalRevenue = orders.reduce((sum, order) => sum + (order.total_price || 0), 0);
        const successfulPayments = orders.filter(o => o.order_status === 'paid').length;
        const pendingPayments = orders.filter(o => o.order_status === 'pending').length;
        const failedPayments = orders.filter(o => o.order_status === 'cancelled').length;
        const refundedPayments = orders.filter(o => o.order_status === 'refunded').length;
        const disputedPayments = orders.filter(o => o.order_status === 'disputed').length;
        
        const averageTransactionValue = totalTransactions > 0 ? totalRevenue / totalTransactions : 0;
        const successRate = totalTransactions > 0 ? (successfulPayments / totalTransactions) * 100 : 0;
        const platformEarnings = totalRevenue * 0.05; // 5% platform fee
        
        // Payment method distribution
        const paymentMethodDistribution = {};
        orders.forEach(order => {
            const method = order.payment_method || 'Unknown';
            if (!paymentMethodDistribution[method]) {
                paymentMethodDistribution[method] = { count: 0, amount: 0 };
            }
            paymentMethodDistribution[method].count++;
            paymentMethodDistribution[method].amount += order.total_price || 0;
        });

        const stats = {
            totalTransactions,
            totalRevenue,
            successfulPayments,
            pendingPayments,
            failedPayments,
            refundedPayments,
            disputedPayments,
            averageTransactionValue,
            successRate,
            platformEarnings,
            pendingPayouts: 0, // This would be calculated from seller payouts
            paymentMethodDistribution
        };

        res.json({ 
            success: true, 
            message: "Payment statistics retrieved successfully.", 
            data: stats 
        });
    } catch (error) {
        console.error('Error fetching payment stats:', error);
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Bulk action on payments
router.post('/payments/bulk-action', asyncHandler(async (req, res) => {
    try {
        const { paymentIds, action, data } = req.body;
        
        if (!paymentIds || !Array.isArray(paymentIds) || paymentIds.length === 0) {
            return res.status(400).json({ success: false, message: "Payment IDs are required." });
        }
        
        if (!action) {
            return res.status(400).json({ success: false, message: "Action is required." });
        }

        const results = {
            success: [],
            failed: []
        };

        // Process each payment based on the action
        for (const paymentId of paymentIds) {
            try {
                // Find the order associated with this payment
                const order = await Order.findById(paymentId);
                
                if (!order) {
                    results.failed.push({ id: paymentId, reason: "No order found for this payment" });
                    continue;
                }

                switch (action) {
                    case 'mark_paid':
                        await Order.updateStatus(order.id, 'paid');
                        results.success.push(paymentId);
                        break;
                        
                    case 'refund':
                        if (!data?.amount) {
                            results.failed.push({ id: paymentId, reason: "Amount is required for refund action" });
                            continue;
                        }
                        // Process refund logic here
                        await Order.updateStatus(order.id, 'refunded');
                        results.success.push(paymentId);
                        break;
                        
                    case 'cancel':
                        await Order.updateStatus(order.id, 'cancelled');
                        results.success.push(paymentId);
                        break;
                        
                    default:
                        results.failed.push({ id: paymentId, reason: `Unknown action: ${action}` });
                }
            } catch (error) {
                results.failed.push({ id: paymentId, reason: error.message });
            }
        }

        res.json({ 
            success: true, 
            message: `Bulk payment action '${action}' completed with ${results.success.length} successful and ${results.failed.length} failed operations.`, 
            data: results 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Get single payment by ID
router.get('/payments/:id', asyncHandler(async (req, res) => {
    try {
        const paymentId = req.params.id;
        
        const { data: order, error } = await supabase
            .from('orders')
            .select('*')
            .eq('id', paymentId)
            .single();

        if (error) {
            return res.status(404).json({ success: false, message: "Payment not found." });
        }

        // Transform order to payment format
        const payment = {
            _id: order.id,
            orderId: order.id,
            userId: order.user_id,
            amount: order.total_price || 0,
            currency: 'PHP',
            paymentMethod: order.payment_method || 'Unknown',
            status: order.order_status || 'pending',
            referenceNumber: order.reference_number,
            transactionId: order.id,
            createdAt: order.created_at,
            updatedAt: order.updated_at,
            metadata: {
                sellerId: order.seller_id,
                items: order.items
            }
        };

        res.json({ 
            success: true, 
            message: "Payment retrieved successfully.", 
            data: payment 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// ============================================
// REGULAR ORDER ROUTES
// ============================================

// Get all orders (Supabase)
router.get('/', asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 50, status, paymentMethod, dateFrom, dateTo, sellerId } = req.query;

        const filters = {
            status: status || undefined,
            paymentMethod: paymentMethod || undefined,
            startDate: dateFrom || undefined,
            endDate: dateTo || undefined,
        };

        const { data, total } = await Order.findAll(filters, Number(page), Number(limit));

        let orders = data || [];

        // If sellerId is provided, keep only orders that include at least one item from this seller
        if (sellerId) {
            console.log(`Filtering orders for sellerId: ${sellerId}`);
            console.log(`Total orders before filtering: ${orders.length}`);
            
            orders = orders.filter((o) => {
                const items = Array.isArray(o.order_items) ? o.order_items : [];
                console.log(`Order ${o.id} has ${items.length} items`);
                
                const hasSellerItems = items.some((it) => {
                    console.log(`Item product:`, it.products);
                    console.log(`Item product seller_id: ${it.products?.seller_id}, looking for: ${sellerId}`);
                    // Check if the product has seller_id and it matches the requested seller
                    return it.products && it.products.seller_id === sellerId;
                });
                
                console.log(`Order ${o.id} has seller items: ${hasSellerItems}`);
                return hasSellerItems;
            });
            
            console.log(`Total orders after filtering: ${orders.length}`);
        }

        // Transform to frontend shape expected by mobile app
        const transformed = orders.map((o) => ({
            _id: o.id,
            userID: o.users ? { _id: o.user_id, name: o.users.name } : { _id: o.user_id, name: undefined },
            orderStatus: o.order_status,
            items: (o.order_items || []).map((it) => ({
                _id: it.id,
                productID: it.product_id,
                productName: it.product_name || it.products?.name,
                quantity: it.quantity,
                price: Number(it.price),
                variant: it.variant,
            })),
            totalPrice: Number(o.total_price),
            paymentMethod: o.payment_method,
            referenceNumber: o.reference_number,
            couponCode: o.coupons ? {
                _id: o.coupons.id,
                couponCode: o.coupons.coupon_code,
                discountType: o.coupons.discount_type,
                discountAmount: o.coupons.discount_amount,
            } : null,
            trackingUrl: o.tracking_url,
            orderDate: o.order_date,
            shippingAddress: Array.isArray(o.shipping_addresses) && o.shipping_addresses.length > 0 ? {
                phone: o.shipping_addresses[0].phone,
                street: o.shipping_addresses[0].street,
                city: o.shipping_addresses[0].city,
                state: o.shipping_addresses[0].state,
                postalCode: o.shipping_addresses[0].postal_code,
                country: o.shipping_addresses[0].country,
            } : null,
            billingAddress: Array.isArray(o.billing_addresses) && o.billing_addresses.length > 0 ? {
                phone: o.billing_addresses[0].phone,
                street: o.billing_addresses[0].street,
                city: o.billing_addresses[0].city,
                state: o.billing_addresses[0].state,
                postalCode: o.billing_addresses[0].postal_code,
                country: o.billing_addresses[0].country,
                companyName: o.billing_addresses[0].company_name,
                taxId: o.billing_addresses[0].tax_id,
            } : null,
        }));

        res.json({ success: true, message: "Orders retrieved successfully.", data: transformed, total });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Get orders by user ID
router.get('/orderByUserId/:userId', asyncHandler(async (req, res) => {
    try {
        const userId = req.params.userId;
        const { page = 1, limit = 50 } = req.query;
        const { data } = await Order.findByUserId(userId, Number(page), Number(limit));
        res.json({ success: true, message: "Orders retrieved successfully.", data });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Create a new order
router.post('/', asyncHandler(async (req, res) => {
    console.log('Order creation request received:', JSON.stringify(req.body, null, 2));
    
    const { 
        userID, 
        orderStatus, 
        items, 
        totalPrice, 
        shippingAddress, 
        billingAddress,
        paymentMethod, 
        couponCode, 
        orderTotal, 
        trackingUrl,
        referenceNumber
    } = req.body;
    
    if (!userID || !items || !totalPrice || !shippingAddress || !paymentMethod || !orderTotal) {
        console.log('Missing required fields:', {
            userID: !!userID,
            items: !!items,
            totalPrice: !!totalPrice,
            shippingAddress: !!shippingAddress,
            paymentMethod: !!paymentMethod,
            orderTotal: !!orderTotal
        });
        return res.status(400).json({ 
            success: false, 
            message: "User ID, items, totalPrice, shippingAddress, paymentMethod, and orderTotal are required." 
        });
    }

    try {
        // Validate stock availability before creating order
        try {
            await validateStockAvailability(items);
        } catch (stockError) {
            return res.status(400).json({ 
                success: false, 
                message: stockError.message 
            });
        }
        
        // Validate that user is not trying to buy their own products
        const productIds = Array.isArray(items) ? items.map((it) => it.productID).filter(Boolean) : [];
        
        if (productIds.length > 0) {
            const { data: products, error: proErr } = await supabase
                .from('products')
                .select('id, seller_id')
                .in('id', productIds);
            
            if (proErr) {
                return res.status(500).json({ 
                    success: false, 
                    message: "Error validating products: " + proErr.message 
                });
            }
            
            // Check if any product belongs to the buyer
            const selfOwnedProducts = products.filter(p => p.seller_id === userID);
            if (selfOwnedProducts.length > 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: "You cannot purchase your own products. Please remove your products from the cart." 
                });
            }
        }

        // Create the order
        // Map nested totals to flat columns
        const orderData = {
            user_id: userID,
            order_status: orderStatus || 'pending',
            total_price: totalPrice,
            payment_method: paymentMethod,
            coupon_id: couponCode,
            tracking_url: trackingUrl,
            reference_number: referenceNumber,
            subtotal: orderTotal?.subtotal,
            discount: orderTotal?.discount,
            total: orderTotal?.total
        };

        console.log('Creating order with data:', orderData);
        const order = await Order.create(orderData);
        console.log('Order created successfully:', order.id);
        
        // Add order items
        console.log('Adding order items:', items);
        await Order.addItems(order.id, items);
        console.log('Order items added successfully');
        
        // Update product quantities (reduce stock)
        await updateProductQuantities(items);
        console.log('Product quantities updated successfully');
        
        // Add shipping address
        console.log('Adding shipping address:', shippingAddress);
        await Order.addShippingAddress(order.id, shippingAddress);
        console.log('Shipping address added successfully');
        
        // Add billing address if provided
        if (billingAddress) {
            console.log('Adding billing address:', billingAddress);
            await Order.addBillingAddress(order.id, billingAddress);
            console.log('Billing address added successfully');
        }
        
        // Auto-create conversation(s) between buyer and seller(s)
        try {
            const productIds = Array.isArray(items) ? items.map((it) => it.productID).filter(Boolean) : [];
            if (productIds.length > 0) {
                const { data: proRows, error: proErr } = await supabase
                    .from('products')
                    .select('id, seller_id, name')
                    .in('id', productIds);
                if (!proErr && Array.isArray(proRows)) {
                    const uniqueSellerIds = [...new Set(proRows.map((p) => p.seller_id).filter(Boolean))];
                    if (uniqueSellerIds.length > 0) {
                        const { Conversation } = require('../models/message');
                        for (const sellerId of uniqueSellerIds) {
                            await Conversation.getOrCreate(userID, sellerId);
                        }
                        
                        // Send push notifications to sellers about new order
                        await sendNewOrderNotifications(uniqueSellerIds, order, proRows);
                    }
                }
            }
        } catch (e) {
            console.warn('Order conversation creation failed:', e?.message || e);
        }
        
        res.json({ 
            success: true, 
            message: "Order created successfully.", 
            data: { orderId: order.id } 
        });
    } catch (error) {
        console.error('Error creating order:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ 
            success: false, 
            message: error.message || "Failed to create order" 
        });
    }
}));

// Update order status (Supabase)
router.post('/:id/status', asyncHandler(async (req, res) => {
    try {
        const orderID = req.params.id;
        const { orderStatus } = req.body;
        
        if (!orderStatus) {
            return res.status(400).json({ success: false, message: "Order Status is required." });
        }

        const updatedOrder = await Order.updateStatus(orderID, orderStatus);
        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        res.json({ success: true, message: "Order status updated successfully.", data: updatedOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Add tracking information
router.post('/:id/tracking', asyncHandler(async (req, res) => {
    try {
        const orderID = req.params.id;
        const { trackingUrl } = req.body;
        
        if (!trackingUrl) {
            return res.status(400).json({ success: false, message: "Tracking URL is required." });
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            orderID,
            { trackingUrl },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        res.json({ success: true, message: "Tracking information added successfully.", data: updatedOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Cancel order (buyer request)
router.post('/:id/cancel', asyncHandler(async (req, res) => {
    try {
        const orderID = req.params.id;
        const { userId, reason, cancelledBy } = req.body;
        
        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is required." });
        }
        
        if (!reason) {
            return res.status(400).json({ success: false, message: "Cancellation reason is required." });
        }

        // Find the order first
        const order = await Order.findById(orderID);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }
        
        console.log('Order found:', { 
            id: order._id || order.id, 
            orderStatus: order.orderStatus, 
            status: order.status,
            userID: order.userID,
            fullOrder: order 
        });

        // Verify the user owns this order (unless they are an admin)
        // Check if user is admin by looking for admin role or if cancelledBy is 'admin'
        const isAdmin = cancelledBy === 'admin' || cancelledBy === 'Admin';

        // Normalize stored user id (could be ObjectId, string, or populated object)
        const extractIdString = (val) => {
            try {
                if (!val) return '';
                if (typeof val === 'string') return val.trim();
                if (val.$oid) return String(val.$oid).trim();
                if (val._id) return extractIdString(val._id);
                if (val.id) return extractIdString(val.id);
                if (typeof val === 'object' && val.toHexString) return val.toHexString();
                const s = String(val);
                const match = s.match(/ObjectId\("?([a-fA-F0-9]{24})"?\)/);
                return (match && match[1]) ? match[1] : s.trim();
            } catch (_) {
                return '';
            }
        };

        // Check multiple possible user ID fields (userID, user_id, userId, etc.)
        const orderUserId = order.userID || order.user_id || order.userId || order.buyerId || order.buyer_id;
        const normalizedOrderUserId = extractIdString(orderUserId);
        const normalizedRequestUserId = extractIdString(userId);

        console.log('Cancellation request:', {
            orderID,
            userId,
            cancelledBy,
            isAdmin,
            orderUserId: order.userID,
            normalizedOrderUserId,
            normalizedRequestUserId
        });

        // TEMPORARY: Log full order for debugging
        console.log('FULL ORDER DEBUG:', JSON.stringify(order, null, 2));

        if (!isAdmin && (!normalizedOrderUserId || normalizedOrderUserId !== normalizedRequestUserId)) {
            console.log('OWNERSHIP CHECK FAILED:', {
                normalizedOrderUserId,
                normalizedRequestUserId,
                match: normalizedOrderUserId === normalizedRequestUserId
            });
            return res.status(403).json({ success: false, message: "You can only cancel your own orders." });
        }

        // Check if order can be cancelled
        const currentStatus = (order.orderStatus?.toLowerCase?.() || order.order_status?.toLowerCase?.() || order.status?.toLowerCase?.() || 'unknown');
        const cancellableStatuses = ['pending', 'unpaid', 'paid', 'processing', 'to_ship', 'packed'];
        const nonCancellableStatuses = ['cancelled', 'completed', 'delivered', 'refunded'];
        
        console.log('Order status check:', { 
            orderStatus: order.orderStatus, 
            status: order.status, 
            currentStatus, 
            cancellableStatuses,
            nonCancellableStatuses
        });
        
        // If status is unknown/undefined, allow cancellation (might be data issue)
        // Only block if status is explicitly non-cancellable
        if (currentStatus !== 'unknown' && nonCancellableStatuses.includes(currentStatus)) {
            return res.status(400).json({ 
                success: false, 
                message: `Order cannot be cancelled. Current status: ${currentStatus}. Orders with status '${currentStatus}' cannot be cancelled.` 
            });
        }
        
        // If status is unknown, log it but allow cancellation
        if (currentStatus === 'unknown') {
            console.log('Warning: Order status is unknown/undefined, allowing cancellation anyway');
        }

        // Update order status to cancelled
        const updatedOrder = await Order.updateStatus(orderID, 'cancelled');
        
        if (!updatedOrder) {
            return res.status(500).json({ success: false, message: "Failed to cancel order." });
        }

        // Restore product quantities when order is cancelled
        try {
            await restoreProductQuantities(orderID);
            console.log('Product quantities restored for cancelled order');
        } catch (restoreError) {
            console.error('Failed to restore product quantities:', restoreError.message);
            // Don't fail the cancellation if stock restoration fails
        }

        // Log the cancellation for audit purposes
        console.log(`Order ${orderID} cancelled by ${cancelledBy || 'buyer'}. Reason: ${reason}`);

        // Send push notification to buyer
        try {
            // Only send notifications if OneSignal environment variables are configured
            if (process.env.ONE_SIGNAL_APP_ID && process.env.ONE_SIGNAL_REST_API_KEY) {
                await sendCancellationNotifications(order, reason, cancelledBy);
            } else {
                console.log('OneSignal environment variables not configured, skipping push notifications');
            }
        } catch (notifError) {
            console.error('Failed to send cancellation notifications:', notifError);
            // Don't fail the cancellation if notifications fail
        }

        res.json({ 
            success: true, 
            message: "Order cancelled successfully.", 
            data: updatedOrder 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Process refund for an order
router.post('/:id/refund', asyncHandler(async (req, res) => {
    try {
        const orderID = req.params.id;
        const { amount, reason, adminId } = req.body;
        
        if (!amount) {
            return res.status(400).json({ success: false, message: "Refund amount is required." });
        }

        // Find the order first
        const order = await Order.findById(orderID);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        // Check if order can be refunded (must be paid or delivered)
        const currentStatus = order.orderStatus?.toLowerCase();
        const refundableStatuses = ['paid', 'processing', 'shipped', 'delivered', 'completed'];
        
        if (!refundableStatuses.includes(currentStatus)) {
            return res.status(400).json({ 
                success: false, 
                message: `Order cannot be refunded. Current status: ${currentStatus}. Only paid or completed orders can be refunded.` 
            });
        }

        // Record the refund in the database
        // In a real implementation, this would also integrate with payment gateway APIs
        const refundData = {
            order_id: orderID,
            amount: parseFloat(amount),
            reason: reason || 'Admin initiated refund',
            admin_id: adminId,
            refund_date: new Date().toISOString()
        };

        const { data: refund, error } = await supabase
            .from('refunds')
            .insert([refundData])
            .select()
            .single();

        if (error) {
            throw new Error(`Failed to process refund: ${error.message}`);
        }

        // Update order status to refunded
        const updatedOrder = await Order.updateStatus(orderID, 'refunded');
        
        if (!updatedOrder) {
            return res.status(500).json({ success: false, message: "Failed to update order status." });
        }

        // Send refund push notification to buyer
        try {
            // Only send notifications if OneSignal environment variables are configured
            if (process.env.ONE_SIGNAL_APP_ID && process.env.ONE_SIGNAL_REST_API_KEY) {
                await sendRefundNotifications(order, amount, reason, adminId);
            } else {
                console.log('OneSignal environment variables not configured, skipping refund push notifications');
            }
        } catch (notifError) {
            console.error('Failed to send refund notifications:', notifError);
            // Don't fail the refund if notifications fail
        }

        res.json({ 
            success: true, 
            message: "Refund processed successfully.", 
            data: { 
                order: updatedOrder,
                refund: refund
            } 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Update shipping information
router.put('/:id/shipping', asyncHandler(async (req, res) => {
    try {
        const orderID = req.params.id;
        const { shippingAddress, trackingUrl, carrier, estimatedDelivery } = req.body;
        
        if (!shippingAddress && !trackingUrl && !carrier && !estimatedDelivery) {
            return res.status(400).json({ success: false, message: "No shipping information provided to update." });
        }

        // Find the order first
        const order = await Order.findById(orderID);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        // Prepare update data
        const updateData = {};
        if (trackingUrl) updateData.tracking_url = trackingUrl;
        if (carrier) updateData.shipping_carrier = carrier;
        if (estimatedDelivery) updateData.estimated_delivery = estimatedDelivery;

        // Update the order
        const updatedOrder = await Order.update(orderID, updateData);
        
        // If shipping address is provided, update it separately
        if (shippingAddress) {
            await Order.updateShippingAddress(orderID, shippingAddress);
        }

        res.json({ 
            success: true, 
            message: "Shipping information updated successfully.", 
            data: updatedOrder 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Bulk action on orders
router.post('/bulk-action', asyncHandler(async (req, res) => {
    try {
        const { orderIds, action, data } = req.body;
        
        if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
            return res.status(400).json({ success: false, message: "Order IDs are required." });
        }
        
        if (!action) {
            return res.status(400).json({ success: false, message: "Action is required." });
        }

        const results = {
            success: [],
            failed: []
        };

        // Process each order based on the action
        for (const orderId of orderIds) {
            try {
                switch (action) {
                    case 'update_status':
                        if (!data?.status) {
                            results.failed.push({ id: orderId, reason: "Status is required for update_status action" });
                            continue;
                        }
                        await Order.updateStatus(orderId, data.status);
                        results.success.push(orderId);
                        break;
                        
                    case 'add_tracking':
                        if (!data?.trackingUrl) {
                            results.failed.push({ id: orderId, reason: "Tracking URL is required for add_tracking action" });
                            continue;
                        }
                        await Order.update(orderId, { tracking_url: data.trackingUrl });
                        results.success.push(orderId);
                        break;
                        
                    case 'delete':
                        await Order.delete(orderId);
                        results.success.push(orderId);
                        break;
                        
                    default:
                        results.failed.push({ id: orderId, reason: `Unknown action: ${action}` });
                }
            } catch (error) {
                results.failed.push({ id: orderId, reason: error.message });
            }
        }

        res.json({ 
            success: true, 
            message: `Bulk action '${action}' completed with ${results.success.length} successful and ${results.failed.length} failed operations.`, 
            data: results 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Resolve dispute for an order
router.post('/:id/resolve-dispute', asyncHandler(async (req, res) => {
    try {
        const orderID = req.params.id;
        const { resolution, adminId, notes } = req.body;
        
        if (!resolution) {
            return res.status(400).json({ success: false, message: "Resolution decision is required." });
        }

        // Find the order first
        const order = await Order.findById(orderID);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        // Check if order is in disputed status
        if (order.order_status !== 'disputed') {
            return res.status(400).json({ 
                success: false, 
                message: "Only orders with 'disputed' status can be resolved." 
            });
        }

        // Update order status based on resolution
        const newStatus = resolution === 'approve' ? 'completed' : 
                         resolution === 'refund' ? 'refunded' : 
                         'cancelled';
        
        const updatedOrder = await Order.updateStatus(orderID, newStatus);
        
        if (!updatedOrder) {
            return res.status(500).json({ success: false, message: "Failed to update order status." });
        }

        // Log the dispute resolution for audit purposes
        const disputeResolution = {
            order_id: orderID,
            resolution: resolution,
            admin_id: adminId,
            notes: notes || '',
            resolved_at: new Date().toISOString()
        };

        // You might want to store this in a disputes_resolutions table
        console.log('Dispute resolution:', disputeResolution);

        res.json({ 
            success: true, 
            message: `Dispute resolved successfully with resolution: ${resolution}`, 
            data: updatedOrder 
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Test stock management functions
router.post('/test-stock', asyncHandler(async (req, res) => {
    try {
        const { productId, quantity } = req.body;
        
        if (!productId || !quantity) {
            return res.status(400).json({ 
                success: false, 
                message: 'Product ID and quantity are required' 
            });
        }
        
        // Test stock validation
        const testItems = [{ productID: productId, quantity: parseInt(quantity) }];
        
        try {
            await validateStockAvailability(testItems);
            res.json({ 
                success: true, 
                message: 'Stock validation passed',
                data: { productId, requestedQuantity: quantity }
            });
        } catch (stockError) {
            res.status(400).json({ 
                success: false, 
                message: stockError.message 
            });
        }
        
    } catch (error) {
        console.error('Error testing stock:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to test stock' 
        });
    }
}));

// Send notification for new order (for testing or manual triggers)
router.post('/:orderId/notify-sellers', asyncHandler(async (req, res) => {
    try {
        const orderId = req.params.orderId;
        
        // Get order details
        const { data: orderData, error: orderError } = await supabase
            .from('orders')
            .select(`
                id, user_id, total_price, order_status, created_at,
                order_items (
                    product_id,
                    products (
                        id, seller_id, name
                    )
                )
            `)
            .eq('id', orderId)
            .single();
            
        if (orderError || !orderData) {
            return res.status(404).json({ 
                success: false, 
                message: 'Order not found' 
            });
        }
        
        // Extract seller IDs and product info
        const sellerIds = [...new Set(
            orderData.order_items
                ?.map(item => item.products?.seller_id)
                .filter(Boolean) || []
        )];
        
        const products = orderData.order_items
            ?.map(item => item.products)
            .filter(Boolean) || [];
        
        if (sellerIds.length === 0) {
            return res.status(400).json({ 
                success: false, 
                message: 'No sellers found for this order' 
            });
        }
        
        // Send notifications
        await sendNewOrderNotifications(sellerIds, orderData, products);
        
        res.json({ 
            success: true, 
            message: 'Notifications sent to sellers', 
            data: { 
                orderId, 
                sellerCount: sellerIds.length,
                sellers: sellerIds 
            } 
        });
        
    } catch (error) {
        console.error('Error sending order notifications:', error);
        res.status(500).json({ 
            success: false, 
            message: error.message || 'Failed to send notifications' 
        });
    }
}));

// Get an order by ID (Supabase) - MUST BE LAST
router.get('/:id', asyncHandler(async (req, res) => {
    try {
        const orderID = req.params.id;
        
        // Validate UUID format
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRegex.test(orderID)) {
            return res.status(400).json({ 
                success: false, 
                message: "Invalid order ID format. Expected a valid UUID." 
            });
        }
        
        const order = await Order.findById(orderID);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }
        res.json({ success: true, message: "Order retrieved successfully.", data: order });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Update an order (Supabase)
router.put('/:id', asyncHandler(async (req, res) => {
    try {
        const orderID = req.params.id;
        const { orderStatus, trackingUrl } = req.body;
        if (!orderStatus && !trackingUrl) {
            return res.status(400).json({ success: false, message: "Nothing to update." });
        }

        const updateData = {};
        if (orderStatus) updateData.order_status = orderStatus;
        if (trackingUrl) updateData.tracking_url = trackingUrl;

        const updatedOrder = await Order.update(orderID, updateData);
        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        res.json({ success: true, message: "Order updated successfully.", data: updatedOrder });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Delete an order (Supabase)
router.delete('/:id', asyncHandler(async (req, res) => {
    try {
        const orderID = req.params.id;
        const ok = await Order.delete(orderID);
        if (!ok) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }
        res.json({ success: true, message: "Order deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

module.exports = router;