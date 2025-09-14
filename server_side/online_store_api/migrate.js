const { MongoClient } = require('mongodb');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// MongoDB connection
const mongoUrl = process.env.MONGO_URL;
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!mongoUrl || !supabaseUrl || !supabaseKey) {
  console.error('❌ Missing required environment variables:');
  console.error('   MONGO_URL:', mongoUrl ? '✅' : '❌');
  console.error('   SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
  console.error('   SUPABASE_ANON_KEY:', supabaseKey ? '✅' : '❌');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Helper function to convert MongoDB ObjectId to UUID
function objectIdToUuid(objectId) {
  return objectId.toString();
}

// Helper function to convert MongoDB date to ISO string
function convertDate(date) {
  if (!date) return new Date().toISOString();
  return new Date(date).toISOString();
}

async function migrateData() {
  const client = new MongoClient(mongoUrl);
  
  try {
    console.log('🔄 Connecting to MongoDB...');
    await client.connect();
    console.log('✅ Connected to MongoDB');
    
    const db = client.db();
    
    // Test Supabase connection
    console.log('🔄 Testing Supabase connection...');
    const { error: testError } = await supabase
      .from('users')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Supabase connection failed:', testError.message);
      return;
    }
    console.log('✅ Connected to Supabase');
    
    // Migrate Users
    console.log('\n🔄 Migrating users...');
    const users = await db.collection('users').find({}).toArray();
    console.log(`   Found ${users.length} users`);
    
    for (const user of users) {
      try {
        const userData = {
          id: objectIdToUuid(user._id),
          external_auth_id: user.externalAuthId || null,
          name: user.name,
          email: user.email,
          password: user.password,
          role: user.role || 'buyer',
          business_name: user.sellerProfile?.businessName || null,
          phone: user.sellerProfile?.phone || null,
          paypal_email: user.sellerProfile?.paypalEmail || null,
          verified: user.sellerProfile?.verified || false,
          created_at: convertDate(user.createdAt),
          updated_at: convertDate(user.updatedAt)
        };
        
        const { error } = await supabase
          .from('users')
          .upsert(userData, { onConflict: 'id' });
        
        if (error) {
          console.error(`   ❌ Error migrating user ${user.email}:`, error.message);
        } else {
          console.log(`   ✅ Migrated user: ${user.email}`);
        }
      } catch (err) {
        console.error(`   ❌ Error processing user ${user._id}:`, err.message);
      }
    }
    
    // Migrate Categories
    console.log('\n🔄 Migrating categories...');
    const categories = await db.collection('categories').find({}).toArray();
    console.log(`   Found ${categories.length} categories`);
    
    for (const category of categories) {
      try {
        const categoryData = {
          id: objectIdToUuid(category._id),
          name: category.name,
          image: category.image,
          created_at: convertDate(category.createdAt),
          updated_at: convertDate(category.updatedAt)
        };
        
        const { error } = await supabase
          .from('categories')
          .upsert(categoryData, { onConflict: 'id' });
        
        if (error) {
          console.error(`   ❌ Error migrating category ${category.name}:`, error.message);
        } else {
          console.log(`   ✅ Migrated category: ${category.name}`);
        }
      } catch (err) {
        console.error(`   ❌ Error processing category ${category._id}:`, err.message);
      }
    }
    
    // Migrate SubCategories
    console.log('\n🔄 Migrating subcategories...');
    const subcategories = await db.collection('subcategories').find({}).toArray();
    console.log(`   Found ${subcategories.length} subcategories`);
    
    for (const subcategory of subcategories) {
      try {
        const subcategoryData = {
          id: objectIdToUuid(subcategory._id),
          name: subcategory.name,
          category_id: objectIdToUuid(subcategory.categoryId),
          created_at: convertDate(subcategory.createdAt),
          updated_at: convertDate(subcategory.updatedAt)
        };
        
        const { error } = await supabase
          .from('subcategories')
          .upsert(subcategoryData, { onConflict: 'id' });
        
        if (error) {
          console.error(`   ❌ Error migrating subcategory ${subcategory.name}:`, error.message);
        } else {
          console.log(`   ✅ Migrated subcategory: ${subcategory.name}`);
        }
      } catch (err) {
        console.error(`   ❌ Error processing subcategory ${subcategory._id}:`, err.message);
      }
    }
    
    // Migrate Brands
    console.log('\n🔄 Migrating brands...');
    const brands = await db.collection('brands').find({}).toArray();
    console.log(`   Found ${brands.length} brands`);
    
    for (const brand of brands) {
      try {
        const brandData = {
          id: objectIdToUuid(brand._id),
          name: brand.name,
          subcategory_id: objectIdToUuid(brand.subcategoryId),
          created_at: convertDate(brand.createdAt),
          updated_at: convertDate(brand.updatedAt)
        };
        
        const { error } = await supabase
          .from('brands')
          .upsert(brandData, { onConflict: 'id' });
        
        if (error) {
          console.error(`   ❌ Error migrating brand ${brand.name}:`, error.message);
        } else {
          console.log(`   ✅ Migrated brand: ${brand.name}`);
        }
      } catch (err) {
        console.error(`   ❌ Error processing brand ${brand._id}:`, err.message);
      }
    }
    
    console.log('\n🎉 Migration completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('   1. Test your API endpoints');
    console.log('   2. Update your Flutter app with Supabase credentials');
    console.log('   3. Remove MONGO_URL from Vercel environment variables');
    console.log('   4. Deploy the updated code to Vercel');
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run migration
console.log('🚀 Starting MongoDB to Supabase migration...\n');
migrateData().catch(console.error);
