#!/usr/bin/env node

/**
 * Database Migration Runner for PayoutInfo Column
 * This script runs the payoutinfo migration to add the missing payoutinfo column
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
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

async function runMigration() {
    try {
        console.log('🚀 Starting payoutinfo column migration...');
        
        // Read the migration SQL file
        const migrationPath = path.join(__dirname, 'database', 'migrations', 'add_payoutinfo_column.sql');
        const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
        
        console.log('📄 Migration SQL:');
        console.log(migrationSQL);
        console.log('\n');
        
        // Execute the migration
        console.log('⚡ Executing migration...');
        const { data, error } = await supabase.rpc('exec_sql', { sql: migrationSQL });
        
        if (error) {
            console.error('❌ Migration failed:', error);
            process.exit(1);
        }
        
        console.log('✅ Migration completed successfully!');
        console.log('📊 Result:', data);
        
        // Verify the column was added
        console.log('\n🔍 Verifying migration...');
        const { data: columns, error: verifyError } = await supabase
            .from('information_schema.columns')
            .select('column_name, data_type')
            .eq('table_name', 'users')
            .eq('column_name', 'payoutinfo');
        
        if (verifyError) {
            console.error('❌ Verification failed:', verifyError);
        } else {
            console.log('✅ Verification successful!');
            console.log('📋 Found columns:', columns);
        }
        
    } catch (error) {
        console.error('❌ Migration error:', error);
        process.exit(1);
    }
}

async function createExecSqlFunction() {
    try {
        console.log('🔧 Creating exec_sql function...');
        
        const createFunctionSQL = `
            CREATE OR REPLACE FUNCTION exec_sql(sql text)
            RETURNS text
            LANGUAGE plpgsql
            SECURITY DEFINER
            AS $$
            BEGIN
                EXECUTE sql;
                RETURN 'Success';
            END;
            $$;
        `;
        
        const { error } = await supabase.rpc('exec_sql', { sql: createFunctionSQL });
        
        if (error) {
            console.log('⚠️  Could not create exec_sql function:', error.message);
            return false;
        }
        
        console.log('✅ exec_sql function created successfully!');
        return true;
    } catch (error) {
        console.log('⚠️  Could not create exec_sql function:', error.message);
        return false;
    }
}

async function main() {
    console.log('🌱 AgriReady3D PayoutInfo Migration Tool');
    console.log('=======================================\n');
    
    // Try to create the exec_sql function first
    const functionCreated = await createExecSqlFunction();
    
    if (functionCreated) {
        await runMigration();
    } else {
        console.log('\n📋 Manual Migration Instructions:');
        console.log('1. Go to your Supabase dashboard');
        console.log('2. Navigate to SQL Editor');
        console.log('3. Run the following SQL:');
        console.log('\n' + '='.repeat(50));
        console.log(fs.readFileSync(path.join(__dirname, 'database', 'migrations', 'add_payoutinfo_column.sql'), 'utf8'));
        console.log('='.repeat(50));
    }
}

main().catch(console.error);
