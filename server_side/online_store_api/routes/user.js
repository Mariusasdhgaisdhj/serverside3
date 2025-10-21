const express = require('express');
const asyncHandler = require('express-async-handler');
const router = express.Router();
const User = require('../models/user');
const { uploadCategory } = require('../uploadFile');
const { supabase } = require('../config/supabase');

// Get all users
router.get('/', asyncHandler(async (req, res) => {
    try {
        // Use findAllNoLimit to get all users without pagination
        const users = await User.findAllNoLimit();
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

// Get all sellers (for map display)
router.get('/sellers', asyncHandler(async (req, res) => {
    try {
        const { data: sellers, total } = await User.findByRole('seller', 1, 1000); // Get up to 1000 sellers
        
        console.log('Raw sellers from database:', JSON.stringify(sellers, null, 2));
        console.log('Total sellers found:', sellers.length);
        
        // Check if sellers have latitude/longitude in addressinfo or direct fields
        const sellersWithLocation = sellers.filter(seller => {
            // Check for direct latitude/longitude fields
            let lat = parseFloat(seller.latitude);
            let lng = parseFloat(seller.longitude);
            
            // If not found in direct fields, check addressinfo JSONB
            if (isNaN(lat) || isNaN(lng)) {
                if (seller.addressinfo && typeof seller.addressinfo === 'object') {
                    lat = parseFloat(seller.addressinfo.latitude);
                    lng = parseFloat(seller.addressinfo.longitude);
                }
            }
            
            return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        }).map(seller => {
            // Extract coordinates from either direct fields or addressinfo
            let lat = parseFloat(seller.latitude);
            let lng = parseFloat(seller.longitude);
            
            if (isNaN(lat) || isNaN(lng)) {
                if (seller.addressinfo && typeof seller.addressinfo === 'object') {
                    lat = parseFloat(seller.addressinfo.latitude);
                    lng = parseFloat(seller.addressinfo.longitude);
                }
            }
            
            return {
                ...seller,
                latitude: lat,
                longitude: lng,
                // Ensure we have the fields expected by the frontend
                businessName: seller.business_name || seller.businessName || seller.name,
                products: seller.products || [],
                imageUrl: seller.profile_image || seller.imageUrl || null,
            };
        });

        console.log('Filtered sellers with location:', JSON.stringify(sellersWithLocation, null, 2));

        res.json({ 
            success: true, 
            message: "Sellers retrieved successfully.", 
            data: sellersWithLocation,
            total: sellersWithLocation.length,
            debug: {
                totalSellers: sellers.length,
                sellersWithLocation: sellersWithLocation.length
            }
        });
    } catch (error) {
        console.error('Error fetching sellers:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch sellers. Please check your database connection.",
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
    }
}));

// Get all users with location data (for map display - includes all roles)
router.get('/with-location', asyncHandler(async (req, res) => {
    try {
        const { data: users, total } = await User.findAll(1, 1000);
        
        console.log('All users from database:', JSON.stringify(users, null, 2));
        console.log('Total users found:', users.length);
        
        // Filter users with valid coordinates
        const usersWithLocation = users.filter(user => {
            // Check for direct latitude/longitude fields
            let lat = parseFloat(user.latitude);
            let lng = parseFloat(user.longitude);
            
            // If not found in direct fields, check addressinfo JSONB
            if (isNaN(lat) || isNaN(lng)) {
                if (user.addressinfo && typeof user.addressinfo === 'object') {
                    lat = parseFloat(user.addressinfo.latitude);
                    lng = parseFloat(user.addressinfo.longitude);
                }
            }
            
            return !isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0;
        }).map(user => {
            // Extract coordinates from either direct fields or addressinfo
            let lat = parseFloat(user.latitude);
            let lng = parseFloat(user.longitude);
            
            if (isNaN(lat) || isNaN(lng)) {
                if (user.addressinfo && typeof user.addressinfo === 'object') {
                    lat = parseFloat(user.addressinfo.latitude);
                    lng = parseFloat(user.addressinfo.longitude);
                }
            }
            
            return {
                ...user,
                latitude: lat,
                longitude: lng,
                // Ensure we have the fields expected by the frontend
                businessName: user.business_name || user.businessName || user.name,
                products: user.addressinfo?.products || [],
                imageUrl: user.profile_image || user.imageUrl || null,
            };
        });

        console.log('Users with location:', JSON.stringify(usersWithLocation, null, 2));

        res.json({ 
            success: true, 
            message: "Users with location retrieved successfully.", 
            data: usersWithLocation,
            total: usersWithLocation.length,
            debug: {
                totalUsers: users.length,
                usersWithLocation: usersWithLocation.length
            }
        });
    } catch (error) {
        console.error('Error fetching users with location:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to fetch users with location.",
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
router.post('/login', asyncHandler(async (req, res) => {
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
}));

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

// User requests to become a seller (pending approval)
router.post('/:id/request-seller', asyncHandler(async (req, res) => {
    const userID = req.params.id;
    const { businessName, phone, paypalEmail } = req.body || {};
    try {
        const updateData = {
            seller_request: 'pending',
            business_name: businessName || null,
            phone: phone || null,
            paypal_email: paypalEmail || null,
            updated_at: new Date().toISOString(),
        };
        const user = await User.update(userID, updateData);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });
        // Optional: notify admins via notifications table if you track admin IDs
        return res.json({ success: true, message: 'Seller request submitted', data: user });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
}));

// Admin approves seller request -> set role to seller and notify user
router.post('/:id/approve-seller', asyncHandler(async (req, res) => {
    const userID = req.params.id;
    try {
        const user = await User.update(userID, {
            role: 'seller',
            seller_request: 'approved',
            verified: false,
            updated_at: new Date().toISOString(),
        });
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // Create in-app notification for the user
        try {
            await supabase.from('notifications').insert({
                user_id: userID,
                title: 'Seller Request Approved',
                message: 'Your request to become a seller has been approved. You can now start selling.',
                type: 'seller_approved',
                is_read: false,
            });
        } catch (_) {}

        return res.json({ success: true, message: 'Seller approved', data: user });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
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
        // Treat this as a request requiring admin approval (backwards compatible endpoint)
        const updateData = {
            seller_request: 'pending',
            business_name: businessName,
            phone: phone,
            paypal_email: paypalEmail || null,
            updated_at: new Date().toISOString(),
        };

        const user = await User.update(userID, updateData);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // Optional: notify admins here
        return res.json({ success: true, message: 'Seller request submitted', data: user });
    } catch (error) {
        console.error('Error submitting seller request:', error);
        res.status(500).json({ success: false, message: 'Failed to submit seller request' });
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

module.exports = router;