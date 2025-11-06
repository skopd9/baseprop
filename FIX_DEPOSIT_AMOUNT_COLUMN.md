# Fix Deposit Amount Column - Migration Guide

## 🐛 Problem
The `deposit_amount` column was missing from the `tenants` table, causing 400 errors when trying to update tenant records.

## ✅ Solution
Created a migration that:
1. Adds the `deposit_amount` column
2. Adds the `deposit_weeks` column (if missing)
3. Creates an auto-calculation trigger that calculates `deposit_amount` from `monthly_rent` and `deposit_weeks`
4. Updates existing tenants with calculated deposit amounts

## 📋 How to Apply the Fix

### Step 1: Run the Migration
1. Go to your **Supabase Dashboard**
2. Navigate to **SQL Editor**
3. Open the file: `migrations/add_deposit_amount_column.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** or press `Ctrl+Enter`

### Step 2: Verify the Migration
Run this query to verify the columns exist:
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'tenants'
AND column_name IN ('deposit_amount', 'deposit_weeks')
ORDER BY column_name;
```

You should see:
- `deposit_amount` (DECIMAL(10,2))
- `deposit_weeks` (INTEGER, default 4)

### Step 3: Test the Auto-Calculation
Test that the trigger works:
```sql
-- Test insert
INSERT INTO tenants (name, monthly_rent, deposit_weeks)
VALUES ('Test Tenant', 1000, 4)
RETURNING id, name, monthly_rent, deposit_weeks, deposit_amount;

-- Should show: deposit_amount = 923.33 (1000 * 4 / 4.33)

-- Test update
UPDATE tenants
SET monthly_rent = 1200, deposit_weeks = 5
WHERE name = 'Test Tenant'
RETURNING monthly_rent, deposit_weeks, deposit_amount;

-- Should show: deposit_amount = 1385.68 (1200 * 5 / 4.33)

-- Clean up
DELETE FROM tenants WHERE name = 'Test Tenant';
```

## 🧮 Deposit Calculation Formula

The deposit is automatically calculated using:
```
deposit_amount = monthly_rent × (deposit_weeks / 4.33)
```

Where:
- `4.33` = average weeks per month (52 weeks / 12 months)
- UK maximum is **5 weeks** deposit
- Default is **4 weeks** deposit

### Examples:
- Monthly rent: £1,000, 4 weeks → Deposit: £923.33
- Monthly rent: £1,200, 5 weeks → Deposit: £1,385.68
- Monthly rent: £900, 3 weeks → Deposit: £622.63

## 🔄 How It Works

1. **When creating a tenant**: Set `monthly_rent` and `deposit_weeks`, and `deposit_amount` is auto-calculated
2. **When updating rent**: Change `monthly_rent` or `deposit_weeks`, and `deposit_amount` automatically updates
3. **Manual override**: You can still set `deposit_amount` explicitly if needed (e.g., for special cases)

## 📝 Code Changes

The code has been updated to:
- ✅ Not send `deposit_amount` when it's 0 (let trigger calculate)
- ✅ Only send `deposit_amount` for manual overrides
- ✅ Always send `deposit_weeks` when provided (1-5 weeks)
- ✅ Let the database trigger handle auto-calculation

## ✨ Benefits

1. **Automatic calculation** - No need to manually calculate deposits
2. **Consistency** - All deposits calculated the same way
3. **UK compliance** - Enforces 5-week maximum
4. **Flexibility** - Can still override for special cases

## 🧪 Testing

After running the migration:
1. Try editing a tenant in the UI
2. Change the monthly rent
3. Change the deposit weeks (1-5)
4. Save - the deposit amount should be automatically calculated
5. Check the database to verify the calculated amount

## ⚠️ Notes

- The trigger only calculates when both `monthly_rent` and `deposit_weeks` are set
- If `deposit_amount` is explicitly set to a non-zero value, it won't be overwritten
- Existing tenants will have their deposit_amount calculated on the first update

