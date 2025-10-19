const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const Order = require('../models/order');
const OneSignal = require('onesignal-node');
const nodemailer = require('nodemailer');
const dotenv = require('dotenv');
dotenv.config();

// Initialize OneSignal client
const oneSignalClient = new OneSignal.Client(process.env.ONE_SIGNAL_APP_ID, process.env.ONE_SIGNAL_REST_API_KEY);

// Initialize email transporter
const emailTransporter = nodemailer.createTransporter({
    service: 'gmail', // or your preferred email service
    auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASSWORD // Your email password or app password
    }
});

// Function to send cancellation notifications
async function sendCancellationNotifications(order, reason, cancelledBy) {
    const orderId = order._id || order.id;
    const buyerName = order.userID?.name || 'Customer';
    const buyerEmail = order.userID?.email;
    const orderTotal = order.totalPrice || 0;
    
    // Prepare notification content
    const notificationTitle = 'Order Cancelled';
    const notificationMessage = `Your order #${orderId.slice(0, 8)} has been cancelled. Reason: ${reason}`;
    
    // 1. Send Push Notification via OneSignal
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
    
    // 2. Send Email Notification
    if (buyerEmail) {
        try {
            const emailHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Order Cancelled</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                        .content { background: white; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
                        .order-details { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
                        .button { display: inline-block; background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Order Cancelled</h1>
                            <p>We're sorry to inform you that your order has been cancelled.</p>
                        </div>
                        
                        <div class="content">
                            <h2>Order Details</h2>
                            <div class="order-details">
                                <p><strong>Order ID:</strong> #${orderId}</p>
                                <p><strong>Order Total:</strong> ₱${orderTotal.toLocaleString()}</p>
                                <p><strong>Cancellation Reason:</strong> ${reason}</p>
                                <p><strong>Cancelled By:</strong> ${cancelledBy || 'Admin'}</p>
                                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                            </div>
                            
                            <h3>What happens next?</h3>
                            <ul>
                                <li>If payment was made, you will receive a refund within 3-5 business days</li>
                                <li>You can place a new order anytime</li>
                                <li>Contact our support team if you have any questions</li>
                            </ul>
                            
                            <p>We apologize for any inconvenience caused.</p>
                            
                            <a href="${process.env.FRONTEND_URL || 'https://yourapp.com'}" class="button">Visit Our Store</a>
                        </div>
                        
                        <div class="footer">
                            <p>Thank you for choosing our service!</p>
                            <p>If you have any questions, please contact our support team.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
            
            const mailOptions = {
                from: `"${process.env.APP_NAME || 'AgriReady'}" <${process.env.EMAIL_USER}>`,
                to: buyerEmail,
                subject: `Order #${orderId.slice(0, 8)} Cancelled - ${process.env.APP_NAME || 'AgriReady'}`,
                html: emailHtml
            };
            
            await emailTransporter.sendMail(mailOptions);
            console.log('Email notification sent to:', buyerEmail);
        } catch (emailError) {
            console.error('Failed to send email notification:', emailError);
        }
    } else {
        console.log('No email address found for buyer, skipping email notification');
    }
}

// Function to send refund notifications
async function sendRefundNotifications(order, amount, reason, adminId) {
    const orderId = order._id || order.id;
    const buyerName = order.userID?.name || 'Customer';
    const buyerEmail = order.userID?.email;
    const orderTotal = order.totalPrice || 0;
    
    // Prepare notification content
    const notificationTitle = 'Refund Processed';
    const notificationMessage = `Your refund of ₱${parseFloat(amount).toLocaleString()} for order #${orderId.slice(0, 8)} has been processed.`;
    
    // 1. Send Push Notification via OneSignal
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
    
    // 2. Send Email Notification
    if (buyerEmail) {
        try {
            const emailHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <title>Refund Processed</title>
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .header { background: #e8f5e8; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                        .content { background: white; padding: 20px; border: 1px solid #ddd; border-radius: 8px; }
                        .refund-details { background: #f0f8f0; padding: 15px; border-radius: 5px; margin: 15px 0; }
                        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
                        .button { display: inline-block; background: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; margin: 10px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>Refund Processed</h1>
                            <p>Great news! Your refund has been processed successfully.</p>
                        </div>
                        
                        <div class="content">
                            <h2>Refund Details</h2>
                            <div class="refund-details">
                                <p><strong>Order ID:</strong> #${orderId}</p>
                                <p><strong>Refund Amount:</strong> ₱${parseFloat(amount).toLocaleString()}</p>
                                <p><strong>Reason:</strong> ${reason || 'Admin initiated refund'}</p>
                                <p><strong>Processed By:</strong> ${adminId || 'Admin'}</p>
                                <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                            </div>
                            
                            <h3>What happens next?</h3>
                            <ul>
                                <li>Your refund will be credited to your original payment method within 3-5 business days</li>
                                <li>You will receive a confirmation email from your payment provider</li>
                                <li>You can place a new order anytime</li>
                            </ul>
                            
                            <p>Thank you for your patience and understanding.</p>
                            
                            <a href="${process.env.FRONTEND_URL || 'https://yourapp.com'}" class="button">Shop Again</a>
                        </div>
                        
                        <div class="footer">
                            <p>Thank you for choosing our service!</p>
                            <p>If you have any questions, please contact our support team.</p>
                        </div>
                    </div>
                </body>
                </html>
            `;
            
            const mailOptions = {
                from: `"${process.env.APP_NAME || 'AgriReady'}" <${process.env.EMAIL_USER}>`,
                to: buyerEmail,
                subject: `Refund Processed - Order #${orderId.slice(0, 8)} - ${process.env.APP_NAME || 'AgriReady'}`,
                html: emailHtml
            };
            
            await emailTransporter.sendMail(mailOptions);
            console.log('Refund email notification sent to:', buyerEmail);
        } catch (emailError) {
            console.error('Failed to send refund email notification:', emailError);
        }
    } else {
        console.log('No email address found for buyer, skipping refund email notification');
    }
}

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


// Get an order by ID (Supabase)
router.get('/:id', asyncHandler(async (req, res) => {
    try {
        const orderID = req.params.id;
        const order = await Order.findById(orderID);
        if (!order) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }
        res.json({ success: true, message: "Order retrieved successfully.", data: order });
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
        // Validate that user is not trying to buy their own products
        const { supabase } = require('../config/supabase');
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
            const { supabase } = require('../config/supabase');
            const productIds = Array.isArray(items) ? items.map((it) => it.productID).filter(Boolean) : [];
            if (productIds.length > 0) {
                const { data: proRows, error: proErr } = await supabase
                    .from('products')
                    .select('id, seller_id')
                    .in('id', productIds);
                if (!proErr && Array.isArray(proRows)) {
                    const uniqueSellerIds = [...new Set(proRows.map((p) => p.seller_id).filter(Boolean))];
                    if (uniqueSellerIds.length > 0) {
                        const { Conversation } = require('../models/message');
                        for (const sellerId of uniqueSellerIds) {
                            await Conversation.getOrCreate(userID, sellerId);
                        }
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

        // Verify the user owns this order
        if (order.userID.toString() !== userId) {
            return res.status(403).json({ success: false, message: "You can only cancel your own orders." });
        }

        // Check if order can be cancelled
        const currentStatus = order.orderStatus?.toLowerCase();
        const cancellableStatuses = ['pending', 'paid', 'processing'];
        
        if (!cancellableStatuses.includes(currentStatus)) {
            return res.status(400).json({ 
                success: false, 
                message: `Order cannot be cancelled. Current status: ${currentStatus}. Orders can only be cancelled when status is pending, paid, or processing.` 
            });
        }

        // Update order status to cancelled
        const updatedOrder = await Order.updateStatus(orderID, 'cancelled');
        
        if (!updatedOrder) {
            return res.status(500).json({ success: false, message: "Failed to cancel order." });
        }

        // Log the cancellation for audit purposes
        console.log(`Order ${orderID} cancelled by ${cancelledBy || 'buyer'}. Reason: ${reason}`);

        // Send notifications to buyer (both push and email)
        try {
            await sendCancellationNotifications(order, reason, cancelledBy);
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

        // Send refund notifications to buyer
        try {
            await sendRefundNotifications(order, amount, reason, adminId);
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
                const order = await Order.findByPaymentId(paymentId);
                
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

module.exports = router;
