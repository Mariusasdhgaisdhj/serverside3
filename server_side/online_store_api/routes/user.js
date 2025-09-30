const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const User = require('../models/user');

// Get all users
router.get('/', asyncHandler(async (req, res) => {
    try {
        const users = await User.findAll();
        res.json({ success: true, message: "Users retrieved successfully.", data: users });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch users. Please check your database connection.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}));

// Search users by name (email)
router.get('/search', asyncHandler(async (req, res) => {
    const { name } = req.query;
    if (!name) return res.status(400).json({ success: false, message: 'name query required' });
    try {
        const users = await User.searchByName(name);
        res.json({ success: true, message: 'Users found', data: users });
    } catch (error) {
        console.error('Error searching users:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to search users. Please check your database connection.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}));

// login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ success: false, message: "Email and password are required." });
    }

    try {
        // Check if the user exists by email
        const user = await User.findByEmail(email);

        if (!user) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }
        
        // Check if the password is correct
        if (user.password !== password) {
            return res.status(401).json({ success: false, message: "Invalid email or password." });
        }

        // Authentication successful
        res.status(200).json({ success: true, message: "Login successful.", data: user });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to login. Please check your database connection.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
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
        
        // Add updated_at timestamp
        update.updated_at = new Date().toISOString();
        
        const updatedUser = await User.update(userID, update);

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
    
    try {
        // Update user to seller with business information
        const updateData = {
            role: 'seller',
            business_name: businessName,
            phone: phone,
            paypal_email: paypalEmail || null,
            verified: false,
            updated_at: new Date().toISOString()
        };
        
        const user = await User.update(userID, updateData);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        
        res.json({ success: true, message: 'Upgraded to seller', data: user });
    } catch (error) {
        console.error('Error upgrading user to seller:', error);
        res.status(500).json({ success: false, message: 'Failed to upgrade user to seller' });
    }
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
    const { externalAuthId, name, email } = req.body || {};
    if (!externalAuthId || !name) {
        return res.status(400).json({ success: false, message: 'externalAuthId and name required' });
    }
    
    // Ensure email is provided and not null
    if (!email || email === 'null' || email === '') {
        return res.status(400).json({ success: false, message: 'Valid email is required' });
    }
    
    try {
        console.log('=== User Sync Debug ===');
        console.log('External Auth ID:', externalAuthId);
        console.log('Name:', name);
        console.log('Email:', email);
        
        // Find by external id or email
        console.log('Looking for existing user...');
        let user = await User.findByExternalIdOrEmail(externalAuthId, email);
        console.log('Found user:', user ? 'Yes' : 'No');
        
        if (!user) {
            console.log('Creating new user...');
            // Create new user with validated data
            user = await User.create({ 
                external_auth_id: externalAuthId, 
                name, 
                email, 
                password: 'external' 
            });
            console.log('User created successfully');
        } else {
            console.log('Updating existing user...');
            // Update existing user while preserving addressinfo
            const updateData = {
                external_auth_id: externalAuthId, 
                name, 
                email
            };
            
            // Preserve existing addressinfo if it exists
            if (user.addressinfo) {
                updateData.addressinfo = user.addressinfo;
            }
            
            user = await User.update(user.id, updateData);
            console.log('User updated successfully');
        }
        
        console.log('Sync completed successfully');
        res.json({ success: true, message: 'User synced successfully', data: user });
    } catch (error) {
        console.error('Error syncing user:', error);
        console.error('Error details:', error.message);
        res.status(500).json({ 
            success: false, 
            message: "Failed to sync user. Please check your database connection.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}));

// Promote a user to admin (protect this route in production)
router.post('/:id/promote-admin', asyncHandler(async (req, res) => {
    const userID = req.params.id;
    
    try {
        const updateData = {
            role: 'admin',
            updated_at: new Date().toISOString()
        };
        
        const user = await User.update(userID, updateData);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        
        res.json({ success: true, message: 'Promoted to admin', data: user });
    } catch (error) {
        console.error('Error promoting user to admin:', error);
        res.status(500).json({ success: false, message: 'Failed to promote user to admin' });
    }
}));

module.exports = router;
