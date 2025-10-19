#!/usr/bin/env node

/**
 * Check Supabase Storage Buckets
 * This script verifies that all required storage buckets exist
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing required environment variables:');
    console.error('   SUPABASE_URL:', supabaseUrl ? '✅' : '❌');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✅' : '❌');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkBuckets() {
    try {
        console.log('🔍 Checking Supabase Storage buckets...\n');
        
        const requiredBuckets = ['posters', 'product-images', 'category'];
        
        for (const bucketName of requiredBuckets) {
            try {
                const { data, error } = await supabase.storage.getBucket(bucketName);
                
                if (error) {
                    if (error.message.includes('not found')) {
                        console.log(`❌ Bucket '${bucketName}' does not exist`);
                        console.log(`   Create it in your Supabase dashboard: Storage > New bucket`);
                        console.log(`   Make it public for file access\n`);
                    } else {
                        console.error(`❌ Error checking bucket '${bucketName}':`, error.message);
                    }
                } else {
                    console.log(`✅ Bucket '${bucketName}' exists`);
                    console.log(`   Public: ${data.public ? 'Yes' : 'No'}`);
                    console.log(`   File size limit: ${data.file_size_limit || 'No limit'}\n`);
                }
            } catch (err) {
                console.error(`❌ Failed to check bucket '${bucketName}':`, err.message);
            }
        }
        
        console.log('📋 Summary:');
        console.log('   - All buckets should be PUBLIC for file access');
        console.log('   - Set appropriate file size limits (e.g., 5MB)');
        console.log('   - Configure CORS if needed for web access');
        
    } catch (error) {
        console.error('❌ Failed to check buckets:', error.message);
        process.exit(1);
    }
}

console.log('🌱 AgriReady3D Storage Bucket Checker');
console.log('=====================================\n');

checkBuckets().catch(console.error);
