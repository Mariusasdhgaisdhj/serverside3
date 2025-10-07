const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const User = require('../models/user');
const { uploadCategory } = require('../uploadFile');
const { supabase } = require('../config/supabase');

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
    const { name, password, email } = req.body || {};
    if (!name || !password) {
        return res.status(400).json({ success: false, message: "Name and password are required." });
    }

    try {
        const newUser = await User.create({ name, password, email });
        res.json({ success: true, message: "User created successfully.", data: newUser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
}));

// Create a Supabase Auth user (admin) and ensure a matching row exists in users table
router.post('/create-auth', asyncHandler(async (req, res) => {
    const { email, password, name, role } = req.body || {};
    if (!email || !password || !name) {
        return res.status(400).json({ success: false, message: 'email, password and name are required' });
    }

    try {
        // 1) Create auth user using service role
        const { data: created, error: authErr } = await supabase.auth.admin.createUser({
            email: String(email).toLowerCase().trim(),
            password: String(password),
            email_confirm: true,
            user_metadata: { name }
        });
        if (authErr) return res.status(400).json({ success: false, message: authErr.message });

        const authUser = created?.user;
        if (!authUser) return res.status(500).json({ success: false, message: 'Failed to create auth user' });

        // 2) Upsert into users table
        const insertPayload = {
            id: authUser.id,
            name,
            email: String(email).toLowerCase().trim(),
            role: role || 'buyer',
            password, // NOTE: for demo only; in production remove storing plain password
        };

        const { data: row, error: upsertErr } = await supabase
            .from('users')
            .upsert(insertPayload, { onConflict: 'id' })
            .select('*')
            .single();
        if (upsertErr) return res.status(500).json({ success: false, message: upsertErr.message });

        return res.json({ success: true, message: 'Auth user created', data: row });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
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

// Delete a user (cascade user-related data)
router.delete('/:id', asyncHandler(async (req, res) => {
    const userID = req.params.id;
    try {
        // Use Supabase to cascade-delete related data in safe order
        // Note: Some tables may already have ON DELETE CASCADE constraints
        // We still attempt manual cleanup for robustness.
        const tablesToDeleteByUserId = [
            { table: 'post_views', column: 'user_id' },
            { table: 'comments', column: 'user_id' },
            { table: 'notifications', column: 'user_id' },
            { table: 'messages', column: 'sender_id' },
            { table: 'messages', column: 'receiver_id' },
            { table: 'orders', column: 'user_id' },
            { table: 'posts', column: 'user_id' },
        ];

        // Delete product images first for products owned by this user (as seller)
        // Find product ids owned by user
        const { data: userProducts, error: productsErr } = await supabase
            .from('products')
            .select('id')
            .eq('seller_id', userID);
        if (productsErr) {
            console.warn('Warning: failed to list user products before deletion:', productsErr.message);
        }
        const productIds = (userProducts || []).map((p) => p.id);
        if (productIds.length > 0) {
            // Delete product_images referencing those products
            const { error: delImgsErr } = await supabase
                .from('product_images')
                .delete()
                .in('product_id', productIds);
            if (delImgsErr) {
                console.warn('Warning: failed to delete product images for user products:', delImgsErr.message);
            }
            // Delete the products themselves
            const { error: delProdsErr } = await supabase
                .from('products')
                .delete()
                .eq('seller_id', userID);
            if (delProdsErr) {
                console.warn('Warning: failed to delete products for user:', delProdsErr.message);
            }
        }

        // Delete rows in other tables linked by user_id
        for (const { table, column } of tablesToDeleteByUserId) {
            const { error } = await supabase.from(table).delete().eq(column, userID);
            if (error) {
                console.warn(`Warning: failed to delete from ${table} by ${column}:`, error.message);
            }
        }

        // Finally delete the user row
        // Prefer model method if available, fallback to direct supabase delete
        try {
            if (typeof User.delete === 'function') {
                await User.delete(userID);
            } else if (typeof User.findByIdAndDelete === 'function') {
                await User.findByIdAndDelete(userID);
            } else {
                const { error: userDelErr } = await supabase.from('users').delete().eq('id', userID);
                if (userDelErr) throw userDelErr;
            }
        } catch (e) {
            // If user already deleted via cascades, continue
            console.warn('User delete fallback warning:', e?.message || e);
        }

        res.json({ success: true, message: 'User and related data deleted successfully.' });
    } catch (error) {
        console.error('Delete user cascade error:', error);
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
// Avatar upload
router.post('/:id/avatar', asyncHandler(async (req, res) => {
  const userID = req.params.id;
  await new Promise((resolve) => uploadCategory.single('img')(req, res, resolve));
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({ success: false, message: 'Image file is required (img)' });
    }
    const ext = (req.file.originalname.split('.').pop() || 'jpg').toLowerCase();
    const fileName = `${Date.now()}_${Math.floor(Math.random()*1000)}.${ext}`;
    const filePath = `avatars/${fileName}`;

    const { error: upErr } = await supabase
      .storage
      .from('product-images')
      .upload(filePath, req.file.buffer, { contentType: req.file.mimetype, upsert: false });
    if (upErr) return res.status(500).json({ success: false, message: `Upload failed: ${upErr.message}` });

    const { data: pub } = supabase.storage.from('product-images').getPublicUrl(filePath);
    const url = pub?.publicUrl;
    if (!url) return res.status(500).json({ success: false, message: 'Failed to get public URL' });

    // Optionally persist on user immediately
    try {
      await User.update(userID, { profilepicture: url, updated_at: new Date().toISOString() });
    } catch (_) {}

    res.json({ success: true, message: 'Avatar uploaded', data: { url } });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
}));
