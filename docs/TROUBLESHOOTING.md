# 🔧 Troubleshooting Database Schema Migration

## **Current Errors Analysis**

Based on your console errors, there are 3 main issues:

### **1. Database Schema Not Updated** ❌
```
"Could not find the 'units' column of 'properties' in the schema cache"
```
**Cause**: The new JSON schema hasn't been applied to your Supabase database yet.

### **2. CORS Connection Errors** ❌  
```
"Access to fetch at 'https://nsakmpovgatypfuaalokw.supabase.co/rest/v1/...' 
from origin 'http://127.0.0.1:5185' has been blocked by CORS policy"
```
**Cause**: Supabase connection/configuration issues.

### **3. Network/Authentication Errors** ❌
```
"Could not establish connection", "ERR_FAILED"
```
**Cause**: Invalid Supabase URL or API keys.

---

## **🚀 Step-by-Step Fix**

### **Step 1: Check Supabase Configuration**

1. **Check your `.env` file for Supabase credentials:**
```bash
# In your project root
cat .env

# Should contain:
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

2. **If missing, create `.env` file:**
```bash
# Go to your Supabase dashboard → Settings → API
# Copy URL and anon key, then create:

echo "VITE_SUPABASE_URL=https://your-actual-project-id.supabase.co" > .env
echo "VITE_SUPABASE_ANON_KEY=your-actual-anon-key" >> .env
```

### **Step 2: Apply New Database Schema**

1. **Go to Supabase Dashboard → SQL Editor**

2. **Run the new schema** (copy/paste from `turnkey_database_schema.sql`):
```sql
-- Drop existing tables
DROP TABLE IF EXISTS workstreams CASCADE;
DROP TABLE IF EXISTS workflow_instances CASCADE; 
DROP TABLE IF EXISTS asset_register_configs CASCADE;
DROP TABLE IF EXISTS properties CASCADE;

-- Create new tables with JSON structure
-- (Copy the full content from turnkey_database_schema.sql)
```

3. **Verify schema was applied:**
```sql
-- Check if new tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('properties', 'asset_register_configs');

-- Check properties table structure
\d properties
```

### **Step 3: Test Database Connection**

Create a simple test script:

```typescript
// test-db.ts
import { supabase } from './src/lib/supabase';

async function testConnection() {
  try {
    // Test basic connection
    const { data, error } = await supabase
      .from('properties')
      .select('count(*)')
      .single();
      
    if (error) {
      console.error('❌ Database connection failed:', error);
    } else {
      console.log('✅ Database connected successfully');
      console.log('Properties count:', data);
    }
    
    // Test asset_register_configs table
    const { data: configs, error: configError } = await supabase
      .from('asset_register_configs')
      .select('*')
      .limit(1);
      
    if (configError) {
      console.error('❌ asset_register_configs table missing:', configError);
    } else {
      console.log('✅ asset_register_configs table exists');
    }
    
  } catch (err) {
    console.error('❌ Connection test failed:', err);
  }
}

testConnection();
```

### **Step 4: Restart Development Server**

After updating `.env`:
```bash
# Stop current server (Ctrl+C)
# Then restart:
npm run dev
```

---

## **🎯 Quick Fixes**

### **Fix 1: If Supabase Not Set Up**
```bash
# 1. Go to https://supabase.com
# 2. Create new project  
# 3. Get URL + API key from Settings → API
# 4. Update .env file
# 5. Run schema in SQL Editor
```

### **Fix 2: If Schema Partially Applied**
```sql
-- Force clean slate
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Then run full turnkey_database_schema.sql
```

### **Fix 3: If CORS Issues Persist**
```sql
-- In Supabase SQL Editor, check RLS policies:
SELECT * FROM pg_policies WHERE tablename = 'properties';

-- If none exist, add basic policy:
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for everyone" ON properties FOR ALL USING (true);
```

---

## **🔍 Diagnostic Commands**

```bash
# Check if .env is loaded
echo $VITE_SUPABASE_URL

# Check network connectivity
curl -I https://your-project-id.supabase.co/rest/v1/

# Check browser console for exact error messages
# Look for: Network tab → failed requests
```

---

## **📋 Verification Checklist**

- [ ] `.env` file exists with correct Supabase URL/key
- [ ] New schema applied in Supabase SQL Editor  
- [ ] `properties` table has `property_data` JSONB column
- [ ] `asset_register_configs` table exists
- [ ] Development server restarted after .env changes
- [ ] Browser console shows successful database queries
- [ ] No CORS errors in Network tab

Once all items are checked, the JSON system should work perfectly! 🎉 