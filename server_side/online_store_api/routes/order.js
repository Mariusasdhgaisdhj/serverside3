const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const Order = require('../models/order');

// Get all orders (Supabase)
router.get('/', asyncHandler(async (req, res) => {
    try {
        const { page = 1, limit = 50, status, paymentMethod, dateFrom, dateTo } = req.query;

        const filters = {
            status: status || undefined,
            paymentMethod: paymentMethod || undefined,
            startDate: dateFrom || undefined,
            endDate: dateTo || undefined,
        };

        const { data, total } = await Order.findAll(filters, Number(page), Number(limit));

        res.json({ success: true, message: "Orders retrieved successfully.", data });
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
        trackingUrl 
    } = req.body;
    
    if (!userID || !items || !totalPrice || !shippingAddress || !paymentMethod || !orderTotal) {
        return res.status(400).json({ 
            success: false, 
            message: "User ID, items, totalPrice, shippingAddress, paymentMethod, and orderTotal are required." 
        });
    }

    try {
        // Create the order
        // Map nested totals to flat columns
        const orderData = {
            user_id: userID,
            order_status: orderStatus || 'pending',
            total_price: totalPrice,
            payment_method: paymentMethod,
            coupon_id: couponCode,
            tracking_url: trackingUrl,
            subtotal: orderTotal?.subtotal,
            discount: orderTotal?.discount,
            total: orderTotal?.total
        };

        const order = await Order.create(orderData);
        
        // Add order items
        await Order.addItems(order.id, items);
        
        // Add shipping address
        await Order.addShippingAddress(order.id, shippingAddress);
        
        // Add billing address if provided
        if (billingAddress) {
            await Order.addBillingAddress(order.id, billingAddress);
        }
        
        res.json({ 
            success: true, 
            message: "Order created successfully.", 
            data: { orderId: order.id } 
        });
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

module.exports = router;
