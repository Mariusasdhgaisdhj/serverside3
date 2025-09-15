const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const Order = require('../models/order');

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
            orders = orders.filter((o) => {
                const items = Array.isArray(o.order_items) ? o.order_items : [];
                return items.some((it) => it.products && it.products.seller_id === sellerId);
            });
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
