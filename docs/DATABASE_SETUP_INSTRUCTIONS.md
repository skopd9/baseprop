# Database Setup Instructions

## ⚠️ IMPORTANT: Complete Setup Required

**If you're getting an "organization relationship" error when logging in**, you need to run BOTH migrations:

1. Base schema: `uk_landlord_schema.sql`
2. **Organizations & Auth**: `migrations/add_auth_and_organizations_FIXED.sql` ⚠️ Use FIXED version!

👉 **See `COMPLETE_DATABASE_SETUP.md` for the full step-by-step guide with both migrations.**

👉 **See `QUICK_FIX_CHECKLIST.md` for a 5-minute fix if you're getting the organization error.**

**What's the FIXED version?** The original migration had a bug where RLS policies were created before the tables they reference. The FIXED version corrects this.

---

## Quick Setup (No Production Data)

Since you have no production data, follow these simple steps to set up the clean UK-focused database:

### Step 1: Open Supabase SQL Editor

1. Go to your Supabase project: https://supabase.com/dashboard
2. Click on your project
3. Navigate to **SQL Editor** in the left sidebar

### Step 2: Run the New Schema

1. Open the file `uk_landlord_schema.sql` from your project root
2. Copy the entire contents
3. Paste into Supabase SQL Editor
4. Click **Run** (or press Cmd/Ctrl + Enter)

This will:
- ✅ Drop all old tables (safely, since no production data)
- ✅ Create 9 new simplified tables
- ✅ Add proper indexes
- ✅ Insert 3 sample properties (UK, Greece, USA)

### Step 3: Verify Setup

After running the schema, verify it worked by running this query:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

You should see these 9 tables:
- `agents`
- `compliance_certificates`
- `expenses`
- `inspections`
- `properties`
- `rent_payments`
- `repairs`
- `tenants`
- `user_preferences`

### Step 4: Verify Sample Data

```sql
-- Check sample properties
SELECT id, country_code, address, property_type, status 
FROM properties;
```

You should see 3 properties:
- UK property in Manchester
- Greece property in Athens  
- USA property in Austin

### ⚠️ Step 5: Run Organizations Migration (REQUIRED)

**Critical:** After running the base schema, you MUST also run the organizations migration:

1. Create a **New Query** in SQL Editor
2. Open file: `migrations/add_auth_and_organizations_FIXED.sql`
3. Copy all contents
4. Paste and click **Run**

This creates the authentication and multi-tenant organization support that the application requires.

**Without this step, you'll get "organization relationship" errors when logging in.**

**Note:** Use the FIXED version - it corrects a table ordering bug in the original migration where RLS policies referenced tables before they were created.

See `COMPLETE_DATABASE_SETUP.md` for detailed instructions.

## What Changed in the Database

### ❌ Removed Tables
- `asset_register_configs` - No longer needed
- `workflow_templates` - Removed complex workflow system
- `workflow_instances` - Simplified
- `workstreams` - Removed
- Module-related tables - No institutional features

### ✅ New/Updated Tables

#### 1. `user_preferences`
New table for storing user country and type preferences.

#### 2. `agents`
New table for letting agents/property managers.

#### 3. `properties`
Updated with:
- `country_code` field (UK/GR/US)
- `council_tax_band` (UK-specific)
- `council_tax_annual` (UK-specific)
- `is_hmo` flag
- `hmo_license_number`
- `hmo_license_expiry`
- `units` JSONB field for HMO rooms
- `agent_id` reference
- `agent_managed` flag

#### 4. `tenants`
Updated with:
- `country_code` field
- `right_to_rent_checked` (UK)
- `right_to_rent_check_date` (UK)
- `right_to_rent_expiry` (UK)
- `rent_due_day` field
- `deposit_scheme` (UK)
- `deposit_protected_date` (UK)
- `deposit_certificate_number` (UK)
- `found_via_agent_id` reference

#### 5. `compliance_certificates`
New table for all compliance tracking:
- Supports all 10 UK compliance types
- Country-specific compliance
- Certificate tracking
- Expiry reminders
- Contractor information

#### 6. `rent_payments`
Track monthly rent payments:
- Payment status
- Due dates
- Payment methods
- References

#### 7. `inspections`
Property inspection tracking:
- Different inspection types
- Scheduling
- Findings and issues
- Follow-up tracking

#### 8. `repairs`
Maintenance and repair management:
- Priority levels
- Contractor details
- Cost tracking
- Status workflow

#### 9. `expenses`
Property expense tracking:
- Categories
- Tax deductibility
- Receipt storage
- Linked to repairs

## Troubleshooting

### Error: "relation does not exist"
This means the old tables are still referenced somewhere. This is expected and will be fixed when you start the app with the new schema.

### Error: "permission denied"
Make sure you're using the Supabase SQL Editor with admin privileges, not a restricted API key.

### Error: "column does not exist"
Some old code might still reference old column names. Check the services files and update them to use new column names.

## Next Steps After Database Setup

1. **Update Environment Variables** (if needed)
   Your `.env` should have:
   ```env
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

2. **Clear Browser Cache**
   Old data structures might be cached. Clear your browser cache or use incognito mode.

3. **Restart Development Server**
   ```bash
   npm run dev
   ```

4. **Test Core Features**
   - Add a property
   - Add a tenant
   - Add compliance certificate
   - Track rent payment
   - Log an expense

## Migration Script (If You Change Your Mind)

If you later realize you had data you wanted to keep, you can restore from Supabase backup:
1. Go to Settings → Database → Backups
2. Restore to a point before running the schema
3. Contact support for migration assistance

---

**Ready to go!** Your database is now clean, simple, and UK-focused. 🎉

