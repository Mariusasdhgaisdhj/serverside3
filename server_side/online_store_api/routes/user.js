const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const User = require('../model/user');

// Get all users
router.get('/', asyncHandler(async (req, res) => {
    try {
        const users = await User.find();
        res.json({ success: true, message: "Users retrieved successfully.", data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Search users by name (email)
router.get('/search', asyncHandler(async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ success: false, message: 'name query required' });
    const users = await User.find({ name: { $regex: new RegExp(name, 'i') } }).limit(10);
    res.json({ success: true, message: 'Users found', data: users });
}));

// login
router.post('/login', async (req, res) => {
    const { name, password } = req.body;

    try {
        // Check if the user exists
        const user = await User.findOne({ name });


        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid name or password." });
        }
        // Check if the password is correct
        if (user.password !== password) {
            return res.status(401).json({ success: false, message: "Invalid name or password." });
        }

        // Authentication successful
        res.status(200).json({ success: true, message: "Login successful.",data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});


// Get a user by ID
router.get('/:id', asyncHandler(async (req, res) => {
    try {
        const userID = req.params.id;
        const user = await User.findById(userID);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        res.json({ success: true, message: "User retrieved successfully.", data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Create a new user
router.post('/register', asyncHandler(async (req, res) => {
    const { name, password } = req.body;
    if (!name || !password) {
        return res.status(400).json({ success: false, message: "Name, and password are required." });
    }

    try {
        const user = new User({ name, password });
        const newUser = await user.save();
        res.json({ success: true, message: "User created successfully.", data: null });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Update a user
router.put('/:id', asyncHandler(async (req, res) => {
    try {
        const userID = req.params.id;
        const update = req.body || {};
        const updatedUser = await User.findByIdAndUpdate(userID, update, { new: true });

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        res.json({ success: true, message: "User updated successfully.", data: updatedUser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Upgrade buyer to seller (requires minimal credentials)
router.post('/:id/upgrade-to-seller', asyncHandler(async (req, res) => {
    const userID = req.params.id;
    const { businessName, phone, paypalEmail } = req.body || {};
    if (!businessName || !phone) {
        return res.status(400).json({ success: false, message: 'businessName and phone are required' });
    }
    const user = await User.findByIdAndUpdate(
        userID,
        { role: 'seller', sellerProfile: { businessName, phone, paypalEmail, verified: false } },
        { new: true }
    );
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'Upgraded to seller', data: user });
}));

// Delete a user
router.delete('/:id', asyncHandler(async (req, res) => {
    try {
        const userID = req.params.id;
        const deletedUser = await User.findByIdAndDelete(userID);
        if (!deletedUser) {
            return res.status(404).json({ success: false, message: "User not found." });
        }
        res.json({ success: true, message: "User deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Sync user from external auth (e.g., Supabase)
router.post('/sync-external', asyncHandler(async (req, res) => {
    const { externalAuthId, name } = req.body || {};
    if (!externalAuthId || !name) {
        return res.status(400).json({ success: false, message: 'externalAuthId and name required' });
    }
    let user = await User.findOne({ externalAuthId });
    if (!user) {
        user = await User.create({ externalAuthId, name, password: 'external' });
    }
    res.json({ success: true, message: 'User synced', data: user });
}));

// Promote a user to admin (protect this route in production)
router.post('/:id/promote-admin', asyncHandler(async (req, res) => {
    const userID = req.params.id;
    const user = await User.findByIdAndUpdate(userID, { role: 'admin' }, { new: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, message: 'Promoted to admin', data: user });
}));

module.exports = router;
