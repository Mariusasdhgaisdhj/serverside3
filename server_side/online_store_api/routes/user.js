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

// Debug endpoint to check all users and their roles
router.get('/debug-all-users', asyncHandler(async (req, res) => {
    try {
        const { data: allUsers } = await User.findAll(1, 1000);
        
        const usersByRole = {
            buyer: allUsers.filter(u => u.role === 'buyer'),
            seller: allUsers.filter(u => u.role === 'seller'),
            admin: allUsers.filter(u => u.role === 'admin')
        };
        
        res.json({
            success: true,
            message: "All users retrieved successfully",
            data: {
                total: allUsers.length,
                byRole: {
                    buyers: usersByRole.buyer.length,
                    sellers: usersByRole.seller.length,
                    admins: usersByRole.admin.length
                },
                sellers: usersByRole.seller.map(seller => ({
                    id: seller.id,
                    name: seller.name,
                    email: seller.email,
                    business_name: seller.business_name,
                    latitude: seller.latitude,
                    longitude: seller.longitude,
                    addressinfo: seller.addressinfo
                }))
            }
        });
    } catch (error) {
        console.error('Error fetching all users:', error);
        res.status(500).json({
            success: false,
            message: "Failed to fetch users",
            error: error.message
        });
    }
}));

// Create sample sellers for testing (development only)
router.post('/create-sample-sellers', asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ success: false, message: 'Not available in production' });
    }

    try {
        const sampleSellers = [
            {
                name: 'Juan Dela Cruz',
                email: 'juan@example.com',
                password: 'password123',
                role: 'seller',
                business_name: 'Davao Organic Farm',
                latitude: 7.1907,
                longitude: 125.4553,
                phone: '+63 912 345 6789',
                addressinfo: {
                    address: 'Davao City, Philippines',
                    latitude: 7.1907,
                    longitude: 125.4553,
                    products: ['Rice', 'Vegetables', 'Fruits']
                }
            },
            {
                name: 'Maria Santos',
                email: 'maria@example.com',
                password: 'password123',
                role: 'seller',
                business_name: 'Cagayan Valley Produce',
                latitude: 8.4542,
                longitude: 124.6319,
                phone: '+63 917 123 4567',
                addressinfo: {
                    address: 'Cagayan de Oro, Philippines',
                    latitude: 8.4542,
                    longitude: 124.6319,
                    products: ['Corn', 'Bananas', 'Coconut']
                }
            },
            {
                name: 'Pedro Garcia',
                email: 'pedro@example.com',
                password: 'password123',
                role: 'seller',
                business_name: 'Zamboanga Farm Supply',
                latitude: 6.9214,
                longitude: 122.0790,
                phone: '+63 918 987 6543',
                addressinfo: {
                    address: 'Zamboanga City, Philippines',
                    latitude: 6.9214,
                    longitude: 122.0790,
                    products: ['Seeds', 'Fertilizers', 'Tools']
                }
            },
            {
                name: 'Ana Rodriguez',
                email: 'ana@example.com',
                password: 'password123',
                role: 'seller',
                business_name: 'General Santos Fish Market',
                latitude: 6.1167,
                longitude: 125.1667,
                phone: '+63 919 456 7890',
                addressinfo: {
                    address: 'General Santos City, Philippines',
                    latitude: 6.1167,
                    longitude: 125.1667,
                    products: ['Fish', 'Seafood', 'Aquaculture']
                }
            },
            {
                name: 'Carlos Mendoza',
                email: 'carlos@example.com',
                password: 'password123',
                role: 'seller',
                business_name: 'Cotabato Rice Mill',
                latitude: 7.2167,
                longitude: 124.2500,
                phone: '+63 920 111 2222',
                addressinfo: {
                    address: 'Cotabato City, Philippines',
                    latitude: 7.2167,
                    longitude: 124.2500,
                    products: ['Rice', 'Grains', 'Milling Services']
                }
            }
        ];

        const createdSellers = [];
        for (const sellerData of sampleSellers) {
            try {
                const seller = await User.create(sellerData);
                createdSellers.push(seller);
            } catch (error) {
                console.log(`Failed to create seller ${sellerData.name}: ${error.message}`);
            }
        }

        res.json({ 
            success: true, 
            message: `Created ${createdSellers.length} sample sellers`, 
            data: createdSellers 
        });
    } catch (error) {
        console.error('Error creating sample sellers:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to create sample sellers.",
            error: error.message
        });
    }
}));

// Quick test seller creation (development only)
router.post('/create-test-seller', asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ success: false, message: 'Not available in production' });
    }

    try {
        const testSeller = {
            name: 'Test Seller',
            email: 'testseller@example.com',
            password: 'password123',
            role: 'seller',
            business_name: 'Test Farm',
            latitude: 7.1907,
            longitude: 125.4553,
            phone: '+63 912 345 6789',
            addressinfo: {
                address: 'Davao City, Philippines',
                latitude: 7.1907,
                longitude: 125.4553,
                products: ['Rice', 'Vegetables']
            }
        };

        const seller = await User.create(testSeller);
        
        res.json({ 
            success: true, 
            message: "Test seller created successfully", 
            data: seller 
        });
    } catch (error) {
        console.error('Error creating test seller:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to create test seller.",
            error: error.message
        });
    }
}));

// Update existing sellers with location data (development only)
router.post('/populate-seller-locations', asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ success: false, message: 'Not available in production' });
    }

    try {
        // Get all existing sellers
        const { data: sellers } = await User.findByRole('seller', 1, 1000);
        
        if (sellers.length === 0) {
            return res.json({ 
                success: true, 
                message: "No sellers found to update" 
            });
        }

        // Sample locations in Mindanao
        const mindanaoLocations = [
            { lat: 7.1907, lng: 125.4553, city: 'Davao City' },
            { lat: 8.4542, lng: 124.6319, city: 'Cagayan de Oro' },
            { lat: 6.9214, lng: 122.0790, city: 'Zamboanga City' },
            { lat: 6.1167, lng: 125.1667, city: 'General Santos City' },
            { lat: 7.2167, lng: 124.2500, city: 'Cotabato City' },
            { lat: 7.5000, lng: 125.7500, city: 'Tagum City' },
            { lat: 6.7500, lng: 125.3500, city: 'Digos City' },
            { lat: 8.2500, lng: 124.4000, city: 'Iligan City' }
        ];

        const updatedSellers = [];
        
        for (let i = 0; i < sellers.length; i++) {
            const seller = sellers[i];
            const location = mindanaoLocations[i % mindanaoLocations.length];
            
            // Update seller with location data
            const { data: updatedSeller, error } = await supabase
                .from('users')
                .update({
                    latitude: location.lat,
                    longitude: location.lng,
                    addressinfo: {
                        ...seller.addressinfo,
                        address: `${location.city}, Philippines`,
                        latitude: location.lat,
                        longitude: location.lng,
                        products: seller.addressinfo?.products || ['Agricultural Products']
                    }
                })
                .eq('id', seller.id)
                .select()
                .single();
            
            if (error) {
                console.error(`Error updating seller ${seller.id}:`, error);
            } else {
                updatedSellers.push({
                    id: updatedSeller.id,
                    name: updatedSeller.name,
                    business_name: updatedSeller.business_name,
                    latitude: updatedSeller.latitude,
                    longitude: updatedSeller.longitude,
                    city: location.city
                });
            }
        }

        res.json({ 
            success: true, 
            message: `Updated ${updatedSellers.length} sellers with location data`, 
            data: updatedSellers 
        });
    } catch (error) {
        console.error('Error populating seller locations:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to populate seller locations.",
            error: error.message
        });
    }
}));

// Run location migration (development only)
router.post('/migrate-location', asyncHandler(async (req, res) => {
    if (process.env.NODE_ENV === 'production') {
        return res.status(403).json({ success: false, message: 'Not available in production' });
    }

    try {
        // Add latitude and longitude columns
        await supabase.rpc('exec_sql', {
            sql: `
                ALTER TABLE users ADD COLUMN IF NOT EXISTS latitude DECIMAL(10, 8);
                ALTER TABLE users ADD COLUMN IF NOT EXISTS longitude DECIMAL(11, 8);
                CREATE INDEX IF NOT EXISTS idx_users_location ON users(latitude, longitude);
            `
        });

        res.json({ 
            success: true, 
            message: "Location columns added successfully" 
        });
    } catch (error) {
        console.error('Error running location migration:', error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to run location migration.",
            error: error.message
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
