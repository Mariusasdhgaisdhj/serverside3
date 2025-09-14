const express = require('express');
const router = express.Router();
const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');
const asyncHandler = require('express-async-handler');

// This is a temporary migration endpoint for Vercel
// Remove this after migration is complete
router.post('/run', asyncHandler(async (req, res) => {
  try {
    const mongoUrl = process.env.MONGO_URL;
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_ANON_KEY;

    if (!mongoUrl || !supabaseUrl || !supabaseKey) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required environment variables' 
      });
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const client = new MongoClient(mongoUrl);
    
    await client.connect();
    console.log('Connected to MongoDB');
    
    const db = client.db();
    
    // Simple migration for testing - migrate users only
    const users = await db.collection('users').find({}).limit(10).toArray();
    let migratedCount = 0;
    
    for (const user of users) {
      try {
        const userData = {
          id: user._id.toString(),
          external_auth_id: user.externalAuthId || null,
          name: user.name,
          email: user.email,
          password: user.password,
          role: user.role || 'buyer',
          business_name: user.sellerProfile?.businessName || null,
          phone: user.sellerProfile?.phone || null,
          paypal_email: user.sellerProfile?.paypalEmail || null,
          verified: user.sellerProfile?.verified || false,
          created_at: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
          updated_at: user.updatedAt ? new Date(user.updatedAt).toISOString() : new Date().toISOString()
        };
        
        const { error } = await supabase
          .from('users')
          .upsert(userData, { onConflict: 'id' });
        
        if (!error) {
          migratedCount++;
        }
      } catch (err) {
        console.error('Error migrating user:', user._id, err);
      }
    }
    
    await client.close();
    
    res.json({ 
      success: true, 
      message: `Migration completed. Migrated ${migratedCount} users.`,
      data: { migratedCount }
    });
    
  } catch (error) {
    console.error('Migration error:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Migration failed: ' + error.message 
    });
  }
}));

module.exports = router;
