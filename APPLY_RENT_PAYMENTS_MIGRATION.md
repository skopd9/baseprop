# Apply Rent Payments Migration - Quick Guide

## Quick Steps

### 1. Open Supabase Dashboard
Go to: [https://supabase.com/dashboard](https://supabase.com/dashboard)

### 2. Navigate to SQL Editor
- Select your project
- Click **SQL Editor** in the left sidebar
- Click **New Query**

### 3. Run the Migration
Copy and paste the entire contents of this file into the SQL Editor:

📁 **File:** `migrations/create_rent_payments_table.sql`

### 4. Execute
Click **Run** button or press `Cmd/Ctrl + Enter`

---

## What This Migration Does

✅ Creates `rent_payments` table with:
- Payment tracking (amount, dates, status)
- Payment periods (monthly, quarterly, annual)
- Pro-rating support
- Invoice generation fields
- Full RLS security policies

✅ Sets up:
- Proper indexes for performance
- Row Level Security (RLS) policies
- Organization-based access control
- Auto-updating timestamps

---

## Verification

After running the migration, execute this query to verify:

```sql
-- Quick verification
SELECT 
  EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_name = 'rent_payments'
  ) as table_exists,
  (
    SELECT COUNT(*) 
    FROM pg_policies 
    WHERE tablename = 'rent_payments'
  ) as policies_count,
  (
    SELECT rowsecurity 
    FROM pg_tables 
    WHERE tablename = 'rent_payments'
  ) as rls_enabled;
```

Expected result:
- `table_exists`: true
- `policies_count`: 4
- `rls_enabled`: true

---

## Troubleshooting

### Error: "relation already exists"
✅ This is fine! The table already exists. No action needed.

### Error: "permission denied"
❌ You need to be the database owner or have CREATE TABLE permissions.

### Error: "tenant_id references missing table"
❌ You need to run the base schema migration first:
- Run `migrations/add_auth_and_organizations_FIXED.sql` first
- Then run this migration

---

## After Migration

1. **Refresh your application**
2. **Check the console** - should be clean (no 404 errors)
3. **Test rent tracking features**

---

Need help? Check `CONSOLE_ERRORS_FIXED.md` for detailed information.

