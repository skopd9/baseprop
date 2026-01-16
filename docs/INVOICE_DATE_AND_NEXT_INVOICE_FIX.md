# Invoice Date and "Next Invoice" Logic Fix

## Summary of Changes

Fixed three key issues with the invoice system:

1. ✅ Added setting to control invoice date (X days before rent period)
2. ✅ Fixed "next invoice" logic to show January 2026 (not March)
3. ✅ Fixed outstanding calculation to only count sent unpaid invoices
4. ✅ Moved tenant details to dedicated tab
5. ✅ Converted schedule to clean table format

---

## 1. Invoice Date Setting

### Problem
Previously, invoices were dated the same as the rent period start date (e.g., January 1st for January rent). This didn't match real-world practice where invoices are typically sent **before** the rent period begins.

### Solution
Added new setting: **"Invoice Date Days Before Rent"** (default: 7 days)

#### Example:
- Rent period: January 2026 (starts Jan 1)
- Invoice date: December 25, 2025 (7 days before)
- Due date: January 1, 2026 (or custom rent due day)

### Where to Configure
1. Open Invoice Manager
2. Click ⚙️ Settings
3. Go to "Automation" tab
4. Set "Days before rent period" (0-30 days)

---

## 2. Next Invoice Logic Fix

### Problem
The "next invoice" was incorrectly showing March 2026 when it should show January 2026 (since today is Dec 11, 2025).

### Root Cause
The system was checking `invoiceDate >= today` to find the next invoice. But with the new setting, an invoice for January rent would be dated Dec 25, 2025, which is after Dec 11, so it should appear.

The real issue was the logic was too simplistic - it should be based on the **rent period**, not the invoice date.

### Solution
Changed the "next invoice" logic to:
- Find the first **unpaid** invoice (not paid/cancelled)
- For a **current or future rent period** (based on `periodStart`)
- Sort by period start to get the earliest upcoming rent

This means:
- ✅ On Dec 11, 2025 → Next invoice is for **January 2026** rent
- ✅ Users can approve future invoices anytime
- ✅ Approval doesn't mean it will be sent immediately

---

## 3. Outstanding Amount Fix

### Problem
Daniel showing £4,500 outstanding when those invoices haven't been sent yet.

### Solution
Changed outstanding calculation from:
```typescript
// OLD: All unpaid invoices
invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled')
```

To:
```typescript
// NEW: Only SENT but unpaid invoices
invoices.filter(i => i.status === 'sent' && i.amountPaid < i.totalAmount)
```

Outstanding now only counts:
- Invoices that have been **sent to the tenant**
- That are **not fully paid**

Pending/approved invoices don't count as "outstanding" until sent.

---

## 4. Tenant Details Tab

### Change
Moved tenant information (email, lease period, rent amount, property) to its own dedicated "Details" tab instead of mixing it with the Schedule.

### Tabs Now:
1. **Overview** - Next invoice, overdue warnings, summary
2. **Details** - Tenant information (NEW)
3. **Recipients** - Email recipient management
4. **Schedule** - Invoice table with actions

---

## 5. Schedule as Table

### Change
Converted the card-based invoice list to a professional table with columns:

| Period | Invoice Date | Due Date | Amount | Status | Last Sent | Actions |
|--------|--------------|----------|---------|---------|-----------|---------|
| Jan 2026 | 25 Dec 2025 | 1 Jan 2026 | £1,500 | Pending Approval | - | Download, Approve |
| Feb 2026 | 25 Jan 2026 | 1 Feb 2026 | £1,500 | Approved | - | Download, Send, Mark Paid |

Benefits:
- Cleaner, more professional look
- Easier to scan multiple invoices
- Last sent date and recipients shown per invoice
- All actions accessible in one place

---

## Technical Changes

### Files Modified:

1. **`src/services/InvoiceService.ts`**
   - Added `invoiceDateDaysBeforeRent` to `InvoiceSettings` interface
   - Updated `saveInvoiceSettings()` to handle new field
   - Updated `transformSettingsFromDB()` to include new field
   - Modified `generateInvoiceSchedule()` to calculate invoice date as: `periodStart - invoiceDateDaysBeforeRent`

2. **`src/services/SimplifiedTenantService.ts`**
   - Updated tenant creation to fetch invoice settings
   - Pass `invoiceDateDaysBeforeRent` to `generateInvoiceSchedule()`

3. **`src/components/InvoiceManager.tsx`**
   - Fixed "next invoice" logic to use rent period (`periodStart`) instead of invoice date
   - Changed to find first unpaid invoice for current/future rent period

4. **`src/components/TenantInvoicePanel.tsx`**
   - Added new "Details" tab
   - Moved tenant information to Details tab
   - Converted Schedule from cards to table
   - Fixed outstanding calculation to only count sent unpaid invoices

5. **`src/components/InvoiceTemplateSettings.tsx`**
   - Added "Invoice Date Configuration" section in Automation tab
   - Added input for "Days before rent period" setting
   - Added real-time example showing calculated invoice date

6. **`migrations/add_invoice_date_days_before_rent_setting.sql`** (NEW)
   - Creates `invoice_settings` table if not exists
   - Adds `invoice_date_days_before_rent` column
   - Sets up RLS policies

---

## Database Migration

Run the migration to add the new setting column:

```bash
# Apply via Supabase Dashboard or CLI
supabase db push migrations/add_invoice_date_days_before_rent_setting.sql
```

Or via the Supabase dashboard:
1. Go to SQL Editor
2. Run the migration file
3. Verify the column exists in `invoice_settings`

---

## Testing Steps

1. **Test Invoice Date Setting:**
   ```
   1. Go to Invoice Manager → Settings → Automation
   2. Set "Days before rent period" to 7
   3. Save settings
   4. Create new tenant with Jan 2026 lease start
   5. Check generated invoices - invoice date should be Dec 25, 2025
   ```

2. **Test Next Invoice Logic:**
   ```
   1. View Daniel Nehme in Invoice Manager
   2. Verify "Next Invoice" shows January 2026 (not March)
   3. Check the "Next" badge appears on January invoice
   ```

3. **Test Outstanding Amount:**
   ```
   1. View Daniel Nehme - outstanding should be £0 (or correct amount)
   2. Approve and send an invoice
   3. Outstanding should now include that sent invoice
   4. Mark as paid - outstanding should decrease
   ```

4. **Test Tenant Details Tab:**
   ```
   1. Click on any tenant
   2. Verify "Details" tab exists
   3. Check it shows email, lease period, rent, property
   ```

5. **Test Schedule Table:**
   ```
   1. Go to Schedule tab
   2. Verify table layout with all columns
   3. Check "Last Sent" shows date and recipients
   4. Test all action buttons (Download, Approve, Send, Mark Paid)
   ```

---

## Notes

- Default value for invoice date offset: **7 days**
- Users can approve all future invoices (doesn't send them)
- Approval workflow: Draft → Pending Approval → Approved → Sent → Paid
- Outstanding only counts invoices in "Sent" status

---

## How to Fix Existing Invoices

The new setting only applies to **newly created invoices**. Existing invoices need to be updated. You have **3 options**:

### Option 1: Regenerate Per Tenant (Recommended for Individual Tenants)
1. Open Invoice Manager
2. Click on the tenant (e.g., Daniel Nehme)
3. Go to the "Details" tab
4. Click "Regenerate Invoices" button
5. Confirm - this will delete and recreate all invoices with correct dates

**Note:** This only affects unapproved/unpaid invoices. Already paid invoices will be recreated but marked correctly.

### Option 2: SQL Update (For All Tenants at Once)
Run the script `scripts/update_existing_invoice_dates.sql` in your database:

```sql
-- Update all invoices to have invoice_date 7 days before period_start
UPDATE invoices
SET 
  invoice_date = (period_start::date - INTERVAL '7 days')::date,
  updated_at = NOW()
WHERE 
  period_start IS NOT NULL
  AND invoice_date >= period_start;
```

This is faster if you have many tenants with incorrect dates.

### Option 3: Wait for Natural Regeneration
New tenants or updated tenant leases will automatically use the correct invoice dates.

---

## Quick Fix for Daniel Nehme

To fix Daniel's invoices right now:

1. **Using UI:**
   - Click on Daniel in Invoice Manager
   - Go to "Details" tab
   - Click "Regenerate Invoices"
   - Done! ✅

2. **Using SQL:**
   ```sql
   UPDATE invoices
   SET 
     invoice_date = (period_start::date - INTERVAL '7 days')::date,
     updated_at = NOW()
   WHERE 
     tenant_id = (SELECT id FROM tenants WHERE name LIKE '%Daniel Nehme%')
     AND period_start IS NOT NULL;
   ```

After this, you should see:
- Dec 2025: Invoice Date: 24 Nov 2025, Due Date: 01 Dec 2025
- Jan 2026: Invoice Date: 25 Dec 2025, Due Date: 01 Jan 2026
- Feb 2026: Invoice Date: 25 Jan 2026, Due Date: 01 Feb 2026

---

**Status:** ✅ Complete and ready for testing
**Date:** December 11, 2025

**Files Added:**
- `src/components/RegenerateInvoicesButton.tsx` - UI button to regenerate invoices
- `scripts/update_existing_invoice_dates.sql` - SQL script to update all invoices at once
