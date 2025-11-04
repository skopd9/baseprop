# How to Clean Up the Wrong Database

## What Happened?

In previous chats, landlord property management tables and policies were accidentally created in your **nutrition tracking database** instead of your **landlord database**.

## What Was Created in the Wrong Database?

**Tables:**
- `user_profiles`
- `organizations`
- `organization_members`
- `organization_invitations`
- `properties`
- `tenants`
- `rent_payments`

**Migrations Applied:**
- `fix_infinite_recursion_in_organization_policies`
- `comprehensive_fix_all_rls_policies`

**Status:** All tables are empty (0 rows), so they can be safely deleted.

## Steps to Clean Up

### Step 1: Run the Cleanup Script

1. **Open Supabase Dashboard** for your **nutrition database**
2. Go to **SQL Editor**
3. Open the file: `migrations/cleanup_wrong_database.sql`
4. Copy the entire content
5. Paste into SQL Editor
6. Click **Run**

### Step 2: Verify Cleanup

The script includes verification queries at the end. After running, you should see:

✅ **Tables check:** 0 rows (all landlord tables removed)
✅ **Policies check:** 0 rows (all landlord policies removed)
✅ **Functions check:** 0 rows (all helper functions removed)

### Step 3: Reconnect MCP to Correct Database

1. Find your **landlord database** connection details
2. Update your MCP configuration to point to the correct Supabase project
3. Verify connection by listing tables (should see nutrition tables gone, or different tables)

## After Cleanup - Next Steps

Once you've cleaned up and reconnected to the **correct landlord database**, you can proceed with the original task:

### Database Cleanup for Landlord App

**Tables to REMOVE:**
- `alpha_list` - No longer needed
- `asset_register_config` - Not needed
- `chat_messages` - Not needed
- `email_notifications` - Not needed
- `modules` - Old version, delete entire table
- `personal_change_log` - Not needed
- `user_module_access` - Keep for future (view/edit permissions)
- `user_persona_assignments` - Not needed
- `user_persona` - Old structure, remove
- `waitlist` - No longer needed
- `workflow_instances` - Not needed
- `workflow_templates` - Not needed
- `work_streams` - Not needed

**Tables to KEEP:**
- `user_profiles` - Needed
- `organizations` - Needed
- `organization_members` - Needed
- `organization_invitations` - Needed
- `properties` - Needed
- `tenants` - Needed
- `units` - Needed
- `rent_payments` - Needed
- `inspections` - Needed (needs org_id and user_id added)
- `expenses` - Needed (needs org_id and user_id added)

**Tables to UPDATE:**
- `expenses` - Add `organization_id` and `user_id` columns
- `inspections` - Add `organization_id` and `user_id` columns

## Questions About Roles-Based Access Control (RBAC)

You mentioned not understanding the RBAC system. Here's how it works:

### Current System

**Organizations Table:**
- Represents a company/landlord entity
- Has a `created_by` field (the owner)

**Organization_Members Table:**
- Links users to organizations
- Each member has a `role`: 'owner' or 'member'
- `status`: 'pending' or 'active'

**How Access Works:**
1. User logs in → Gets their `user_id`
2. System looks up which organizations they belong to in `organization_members`
3. Row Level Security (RLS) policies only show data for their organizations
4. All properties, tenants, expenses belong to an organization
5. Users can only see/edit data for organizations they're members of

**Why Organizations vs Organization_Members:**
- **Organizations:** The company itself (name, settings)
- **Organization_Members:** The relationship between users and companies (who works for which company, with what role)

One company can have multiple members. One user can belong to multiple companies.

## Ready to Proceed?

Once you:
1. ✅ Run cleanup script on nutrition database
2. ✅ Verify cleanup successful
3. ✅ Reconnect MCP to correct landlord database

We can then create a new migration to:
- Drop unnecessary tables
- Add `organization_id` and `user_id` to expenses and inspections
- Clean up the database structure

Let me know when you're ready!


