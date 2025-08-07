const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkSchema() {
  try {
    // Check workflow_templates table
    console.log('🔍 Checking workflow_templates table...');
    const { data: templates, error: templatesError } = await supabase
      .from('workflow_templates')
      .select('*')
      .limit(1);
    
    if (templatesError) {
      console.log('❌ workflow_templates error:', templatesError.message);
    } else if (templates && templates.length > 0) {
      console.log('📋 workflow_templates columns:', Object.keys(templates[0]));
    } else {
      console.log('📝 workflow_templates table exists but is empty');
      
      // Try to get table info from information_schema
      const { data: schemaInfo, error: schemaError } = await supabase
        .rpc('get_table_columns', { table_name: 'workflow_templates' });
      
      if (!schemaError && schemaInfo) {
        console.log('📋 Schema info:', schemaInfo);
      }
    }

    // Check if modules table exists
    console.log('\n🔍 Checking if modules table exists...');
    const { data: modules, error: modulesError } = await supabase
      .from('modules')
      .select('*')
      .limit(1);
    
    if (modulesError) {
      console.log('❌ modules table error:', modulesError.message);
      console.log('➡️  Need to run the migration first');
    } else {
      console.log('✅ modules table exists');
    }

  } catch (err) {
    console.error('❌ General error:', err.message);
  }
}

checkSchema();