const express = require('express');
const router = express.Router();
const asyncHandler = require('express-async-handler');
const Notification = require('../models/notification');
const OneSignal = require('onesignal-node');
const dotenv = require('dotenv');
dotenv.config();


const client = new OneSignal.Client(process.env.ONE_SIGNAL_APP_ID, process.env.ONE_SIGNAL_REST_API_KEY);

router.post('/send-notification', asyncHandler(async (req, res) => {
    const { title, description, imageUrl } = req.body;

    const notificationBody = {
        contents: {
            'en': description
        },
        headings: {
            'en': title
        },
        included_segments: ['All'],
        ...(imageUrl && { big_picture: imageUrl })
    };

    const response = await client.createNotification(notificationBody);
    const notificationId = response.body.id;
    console.log('Notification sent to all users:', notificationId);
    const notification = new Notification({ notificationId, title,description,imageUrl });
    const newNotification = await notification.save();
    res.json({ success: true, message: 'Notification sent successfully', data: null });
}));

router.get('/track-notification/:id', asyncHandler(async (req, res) => {
    const  notificationId  =req.params.id;

    const response = await client.viewNotification(notificationId);
    const androidStats = response.body.platform_delivery_stats;

    const result = {
        platform: 'Android',
        success_delivery: androidStats.android.successful,
        failed_delivery: androidStats.android.failed,
        errored_delivery: androidStats.android.errored,
        opened_notification: androidStats.android.converted
    };
    console.log('Notification details:', androidStats);
    res.json({ success: true, message: 'success', data: result });
}));


router.get('/all-notification', asyncHandler(async (req, res) => {
    try {
        const notifications = await Notification.find({}).sort({ _id: -1 });
        res.json({ success: true, message: "Notifications retrieved successfully.", data: notifications });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));


router.delete('/delete-notification/:id', asyncHandler(async (req, res) => {
    const notificationID = req.params.id;
    try {
        const notification = await Notification.findByIdAndDelete(notificationID);
        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found." });
        }
        res.json({ success: true, message: "Notification deleted successfully.",data:null });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Send comment notification to specific user
router.post('/comment', asyncHandler(async (req, res) => {
    try {
        const { type, post_id, post_title, commenter_id, post_author_id, message } = req.body;
        
        // Get the post author's OneSignal player ID (you'll need to store this when users register)
        // For now, we'll send to all users - you can refine this to target specific users
        const notificationBody = {
            contents: {
                'en': message
            },
            headings: {
                'en': 'New Comment'
            },
            included_segments: ['All'], // Change this to target specific user when you have their player ID
            data: {
                type: type,
                post_id: post_id,
                post_title: post_title,
                commenter_id: commenter_id,
                post_author_id: post_author_id
            }
        };

        const response = await client.createNotification(notificationBody);
        console.log('Comment notification sent:', response.body.id);
        
        res.json({ 
            success: true, 
            message: 'Comment notification sent successfully', 
            data: { notificationId: response.body.id }
        });
    } catch (error) {
        console.error('Error sending comment notification:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to send comment notification',
            error: error.message
        });
    }
}));

module.exports = router;
