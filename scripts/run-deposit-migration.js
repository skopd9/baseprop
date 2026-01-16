/**
 * Script to run the deposit_amount migration
 * This script connects to Supabase and runs the migration SQL
 * 
 * Usage: node scripts/run-deposit-migration.js
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get Supabase credentials from environment
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase credentials!');
  console.error('Please set:');
  console.error('  - VITE_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY)');
  process.exit(1);
}

// Create Supabase client with service role key for admin operations
const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration() {
  try {
    console.log('📋 Reading migration file...');
    const migrationPath = join(__dirname, '../migrations/add_deposit_amount_column.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    console.log('🚀 Running migration...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    // Split the SQL into individual statements
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));

    // Execute each statement
    for (let i = 0; i < statements.length; i++) {
      const statement = statements[i];
      if (statement.trim().length === 0) continue;
      
      console.log(`\n📝 Executing statement ${i + 1}/${statements.length}...`);
      
      try {
        // Use RPC to execute raw SQL (if available) or use the REST API
        // Note: Supabase JS client doesn't support raw SQL execution directly
        // We'll need to use the REST API with the service role key
        
        const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': supabaseServiceKey,
            'Authorization': `Bearer ${supabaseServiceKey}`,
          },
          body: JSON.stringify({ sql: statement }),
        });

        if (!response.ok) {
          // Try alternative: direct SQL execution via pg REST API
          console.log('⚠️  RPC method not available, trying direct SQL...');
          throw new Error('RPC not available');
        }
        
        console.log('✅ Statement executed successfully');
      } catch (error) {
        console.error('❌ Error executing statement:', error.message);
        console.error('📄 Statement:', statement.substring(0, 100) + '...');
        console.error('\n💡 Note: You may need to run this migration manually in Supabase SQL Editor');
        console.error('   File location: migrations/add_deposit_amount_column.sql');
        throw error;
      }
    }

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ Migration completed successfully!');
    
    // Verify the migration
    console.log('\n🔍 Verifying migration...');
    const { data, error } = await supabase
      .from('tenants')
      .select('id, name, monthly_rent, deposit_weeks, deposit_amount')
      .limit(1);

    if (error) {
      console.error('⚠️  Could not verify migration:', error.message);
    } else if (data && data.length > 0) {
      console.log('✅ Verification successful! Sample tenant data:');
      console.log(JSON.stringify(data[0], null, 2));
    }

  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    console.error('\n💡 Alternative: Run the migration manually in Supabase SQL Editor');
    console.error('   1. Go to Supabase Dashboard → SQL Editor');
    console.error('   2. Open: migrations/add_deposit_amount_column.sql');
    console.error('   3. Copy and paste the SQL');
    console.error('   4. Click Run');
    process.exit(1);
  }
}

// Run the migration
runMigration();

