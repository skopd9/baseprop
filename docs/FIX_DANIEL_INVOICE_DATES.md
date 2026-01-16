# Quick Fix: Daniel Nehme's Invoice Dates

## The Problem

Daniel's invoices currently show:
- Invoice Date = Due Date (both on 01 of each month)
- Should be: Invoice Date = 7 days **before** Due Date

Example:
- ❌ **Current**: Jan 2026 invoice dated 01 Jan 2026
- ✅ **Should be**: Jan 2026 invoice dated 25 Dec 2025

---

## The Solution (Choose One)

### Option A: Use the UI Button (Easiest) ⭐

1. Open **Invoice Manager**
2. Click on **Daniel Nehme** to open the side panel
3. Click the **"Details"** tab
4. Scroll down to **"Invoice Management"** section
5. Click **"Regenerate Invoices"** button
6. Confirm the action
7. Done! ✅

**What this does:**
- Deletes all existing invoices for Daniel
- Creates new invoices with correct dates (7 days before rent period)
- Preserves all tenant and payment information

---

### Option B: Run SQL Script (For All Tenants)

If you want to fix ALL tenants at once:

1. Go to Supabase Dashboard → SQL Editor
2. Run this query:

```sql
UPDATE invoices
SET 
  invoice_date = (period_start::date - INTERVAL '7 days')::date,
  updated_at = NOW()
WHERE 
  period_start IS NOT NULL
  AND invoice_date >= period_start;
```

3. Refresh the Invoice Manager

**What this does:**
- Updates ALL invoices in the database
- Changes invoice_date to be 7 days before period_start
- Keeps all other data intact

---

## Verify the Fix

After applying either option, check Daniel's schedule:

**Expected Results:**
| Period | Invoice Date | Due Date | Difference |
|--------|--------------|----------|------------|
| Dec 2025 | 24 Nov 2025 | 01 Dec 2025 | 7 days ✅ |
| Jan 2026 | 25 Dec 2025 | 01 Jan 2026 | 7 days ✅ |
| Feb 2026 | 25 Jan 2026 | 01 Feb 2026 | 7 days ✅ |
| Mar 2026 | 24 Feb 2026 | 01 Mar 2026 | 7 days ✅ |

---

## Why This Happened

The invoice dates were set incorrectly because:
1. The old system used `periodStart` as the invoice date
2. We just added a new setting: "Invoice Date Days Before Rent"
3. This setting only applies to **new** invoices
4. Existing invoices need to be updated manually (Option A or B above)

---

## For Future Invoices

All new invoices will automatically use the correct dates because:
- The setting is now in place: **7 days before rent period**
- New tenants will get correct invoice dates automatically
- You can change this setting in: Invoice Manager → Settings → Automation → "Invoice Date Configuration"

---

**Recommendation:** Use **Option A** (UI Button) - it's the safest and easiest method.

**Time to fix:** Less than 30 seconds ⚡
