# Complete Database Setup Guide

## Overview

This guide will walk you through setting up your Supabase database with all required tables, relationships, and authentication support.

**Important:** You must run these migrations in the correct order for the application to work properly.

## Prerequisites

1. A Supabase project (create one at https://supabase.com/dashboard)
2. Access to your Supabase SQL Editor
3. Your Supabase project URL and anon key

## Setup Steps

### Step 1: Access Supabase SQL Editor

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query** to create a new query window

### Step 2: Run Base Schema Migration

This creates the core property management tables.

1. Open the file `uk_landlord_schema.sql` from your project root
2. Copy the entire contents
3. Paste into the Supabase SQL Editor
4. Click **Run** (or press Cmd/Ctrl + Enter)

**What this creates:**
- ✅ `properties` - Rental properties
- ✅ `tenants` - Tenant information
- ✅ `rent_payments` - Rent tracking
- ✅ `compliance_certificates` - Safety certificates
- ✅ `inspections` - Property inspections
- ✅ `repairs` - Maintenance requests
- ✅ `expenses` - Property expenses
- ✅ `agents` - Letting agents/property managers
- ✅ `user_preferences` - User settings

### Step 3: Run Organizations & Auth Migration

**This step is critical** - it creates the authentication and multi-tenant organization support.

**⚠️ IMPORTANT:** Use the FIXED version of the migration to avoid errors.

1. Create a **New Query** in the SQL Editor
2. Open the file `migrations/add_auth_and_organizations_FIXED.sql` from your project
3. Copy the entire contents
4. Paste into the new query window
5. Click **Run** (or press Cmd/Ctrl + Enter)

**Why the FIXED version?** The original migration has a bug where RLS policies reference tables before they're created. The FIXED version corrects the table creation order.

**What this creates:**
- ✅ `user_profiles` - Extended user data linked to auth.users
- ✅ `organizations` - Multi-tenant organization support
- ✅ `organization_members` - User-organization relationships (with foreign key to organizations)
- ✅ `organization_invitations` - Team invitation system
- ✅ Adds `organization_id` column to all existing tables
- ✅ Sets up Row Level Security (RLS) for data isolation
- ✅ Creates helper functions for organization management

**Critical relationship established:**
```sql
organization_members.organization_id → organizations.id
```

This relationship is required for the application's organization queries to work.

### Step 4: Verify Setup

Run these verification queries in the SQL Editor:

#### Check All Tables Exist

```sql
-- Should return 13 tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected tables:
- agents
- compliance_certificates
- expenses
- inspections
- **organization_invitations**
- **organization_members**
- **organizations**
- properties
- rent_payments
- repairs
- tenants
- **user_preferences**
- **user_profiles**

#### Verify Organization Relationship

```sql
-- This should return the foreign key relationship
SELECT
    tc.constraint_name, 
    tc.table_name, 
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name 
FROM information_schema.table_constraints AS tc 
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY' 
AND tc.table_name = 'organization_members'
AND ccu.table_name = 'organizations';
```

You should see a result showing the `organization_id` column in `organization_members` references the `id` column in `organizations`.

#### Verify RLS is Enabled

```sql
-- Check that Row Level Security is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND rowsecurity = true
ORDER BY tablename;
```

All tables should have `rowsecurity = true`.

### Step 5: Configure Supabase Auth (Magic Links)

1. In Supabase Dashboard, go to **Authentication** → **Email Templates**
2. Find **Magic Link** template
3. You can use the default template or customize it
4. Make sure **Enable Email Confirmations** is turned ON in **Authentication** → **Settings**

### Step 6: Update Environment Variables

Make sure your `.env` file (or `.env.local`) contains:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

You can find these values in:
- Supabase Dashboard → Settings → API

### Step 7: Test the Application

1. **Clear browser cache** (or use incognito mode)
2. **Restart your development server:**
   ```bash
   npm run dev
   ```
3. **Test authentication:**
   - Try logging in with magic link
   - Check for the organization error - it should be gone!
4. **Test core features:**
   - Create an organization (should happen automatically on first login)
   - Add a property
   - Add a tenant
   - Track rent payment

## Troubleshooting

### Error: "Could not find a relationship between 'organization_members' and 'organizations'"

**Cause:** The organizations migration hasn't been run yet.

**Solution:** 
- Run Step 3 above (`migrations/add_auth_and_organizations.sql`)
- Verify the relationship exists using the verification query in Step 4

### Error: "relation 'organizations' does not exist"

**Cause:** The organizations migration hasn't been run.

**Solution:** Run `migrations/add_auth_and_organizations.sql` in SQL Editor.

### Error: "permission denied for table organizations"

**Cause:** Row Level Security is blocking access.

**Solution:** 
- Make sure you're logged in to the application
- Verify RLS policies exist (they're created by the migration)
- Check that your user has an active organization membership

### Error: "new row violates row-level security policy"

**Cause:** Trying to insert data without an organization_id or without proper organization membership.

**Solution:**
- Make sure you have an organization created
- Ensure the organization_id is set when creating properties/tenants
- Verify your user is an active member of the organization

### Tables Already Exist Error

If you see "table already exists" errors when running migrations:

**For base schema (`uk_landlord_schema.sql`):**
- The script starts with DROP TABLE commands, so it should handle existing tables
- If you still get errors, you may have dependencies - drop tables manually in reverse order

**For organizations migration:**
- Comment out the CREATE TABLE statements for tables that already exist
- Keep the ALTER TABLE statements to add missing columns
- Keep all RLS policy creation statements

## Data Migration (If You Have Existing Data)

If you already have properties and tenants in your database from before:

```sql
-- 1. Create a default organization for existing data
INSERT INTO organizations (name, created_by, settings)
VALUES ('Default Organization', (SELECT id FROM auth.users LIMIT 1), '{}')
RETURNING id;

-- 2. Update existing properties with the organization_id
UPDATE properties 
SET organization_id = 'paste-organization-id-from-above'
WHERE organization_id IS NULL;

-- 3. Update existing tenants with the organization_id
UPDATE tenants 
SET organization_id = 'paste-organization-id-from-above'
WHERE organization_id IS NULL;

-- 4. Add yourself as an owner of the organization
INSERT INTO organization_members (organization_id, user_id, role, status, joined_at)
VALUES (
  'paste-organization-id-from-above',
  auth.uid(),
  'owner',
  'active',
  NOW()
);
```

## Next Steps

Once your database is set up:

1. **Read the feature guides:**
   - `SUPABASE_AUTH_IMPLEMENTATION.md` - Authentication details
   - `EXPENSES_FEATURE_GUIDE.md` - Expense tracking
   - `HMO_FUNCTIONALITY_GUIDE.md` - HMO property management
   - `UK_COMPLIANCE_GUIDE.md` - UK compliance requirements

2. **Seed demo data (optional):**
   ```bash
   npm run seed
   ```

3. **Start building:**
   - Add your properties
   - Invite team members
   - Track rent payments
   - Manage compliance

## Architecture Notes

### Multi-Tenant Design

The application uses organization-based multi-tenancy:
- Each user can belong to multiple organizations
- Each organization owns its properties, tenants, etc.
- RLS ensures users only see data from their organizations
- Data isolation is enforced at the database level

### Authentication Flow

1. User enters email → Magic link sent
2. User clicks link → Authenticated
3. System checks for organizations
4. If no organization exists → Create one automatically
5. User gains access to their organization's data

---

**Setup Complete!** 🎉

Your database now has full authentication, multi-tenant organization support, and all property management features enabled.

