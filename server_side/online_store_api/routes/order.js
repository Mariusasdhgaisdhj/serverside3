const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const Order = require('../models/order');

// Get all orders
router.get('/', asyncHandler(async (req, res) => {
    try {
        const { sellerId } = req.query;
        
        if (sellerId) {
            // Get orders for a specific seller
            const orders = await Order.find()
                .populate('couponCode', 'id couponCode discountType discountAmount')
                .populate('userID', 'id name')
                .populate({
                    path: 'items.productID',
                    populate: { path: 'sellerId' }
                })
                .sort({ _id: -1 });
            
            // Filter orders that contain products from this seller
            const sellerOrders = orders.filter(order => 
                order.items.some(item => 
                    item.productID && 
                    item.productID.sellerId && 
                    item.productID.sellerId._id.toString() === sellerId
                )
            );
            
            res.json({ success: true, message: "Seller orders retrieved successfully.", data: sellerOrders });
        } else {
            // Get all orders (existing logic)
            const orders = await Order.find()
                .populate('couponCode', 'id couponCode discountType discountAmount')
                .populate('userID', 'id name')
                .sort({ _id: -1 });
            res.json({ success: true, message: "Orders retrieved successfully.", data: orders });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));


router.get('/orderByUserId/:userId', asyncHandler(async (req, res) => {
    try {
        const userId = req.params.userId;
        const orders = await Order.find({ userID: userId })
            .populate('couponCode', 'id couponCode discountType discountAmount')
            .populate('userID', 'id name')
            .sort({ _id: -1 });
        res.json({ success: true, message: "Orders retrieved successfully.", data: orders });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));


// Get an order by ID
router.get('/:id', asyncHandler(async (req, res) => {
    try {
        const orderID = req.params.id;
        const order = await Order.findById(orderID)
        .populate('couponCode', 'id couponCode discountType discountAmount')
        .populate('userID', 'id name');
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
        const orderData = {
            user_id: userID,
            order_status: orderStatus || 'pending',
            total_price: totalPrice,
            payment_method: paymentMethod,
            coupon_id: couponCode,
            tracking_url: trackingUrl,
            order_total: orderTotal
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

// Update an order
router.put('/:id', asyncHandler(async (req, res) => {
    try {
        const orderID = req.params.id;
        const { orderStatus, trackingUrl } = req.body;
        if (!orderStatus) {
            return res.status(400).json({ success: false, message: "Order Status required." });
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            orderID,
            { orderStatus, trackingUrl },
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }

        res.json({ success: true, message: "Order updated successfully.", data: null });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Delete an order
router.delete('/:id', asyncHandler(async (req, res) => {
    try {
        const orderID = req.params.id;
        const deletedOrder = await Order.findByIdAndDelete(orderID);
        if (!deletedOrder) {
            return res.status(404).json({ success: false, message: "Order not found." });
        }
        res.json({ success: true, message: "Order deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Update order status
router.post('/:id/status', asyncHandler(async (req, res) => {
    try {
        const orderID = req.params.id;
        const { orderStatus } = req.body;
        
        if (!orderStatus) {
            return res.status(400).json({ success: false, message: "Order Status is required." });
        }

        const updatedOrder = await Order.findByIdAndUpdate(
            orderID,
            { orderStatus },
            { new: true }
        );

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
