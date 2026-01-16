# Restore Access to "Resolute - USA" Workspace

## Quick Start Guide

You've lost access to the "Resolute - USA" workspace after switching workspaces and logging out/in. Follow these steps to restore access.

---

## Step 1: Check Browser Console (FIRST!)

1. **Open your application** in the browser
2. **Open Developer Tools** (Press F12 or Right-click → Inspect)
3. **Go to the Console tab**
4. **Look for these specific logs:**
   - Search for `[getUserOrganizations]` 
   - Note how many organizations are returned
   - Look for any red error messages
   - Look for 500, 403, or 400 errors from Supabase

### What to Look For:

```
✅ GOOD: [getUserOrganizations] Query result: { userId: "...", count: 2, ... }
❌ BAD:  [getUserOrganizations] Query result: { userId: "...", count: 1, ... }  ← Missing workspace!
❌ BAD:  Failed to fetch organizations: infinite recursion detected
❌ BAD:  500 Internal Server Error
```

**Take a screenshot or note any errors you see!**

---

## Step 2: Run Diagnostic SQL

1. **Go to your Supabase Dashboard** → SQL Editor
2. **Open** [`diagnose_workspace_issue.sql`](diagnose_workspace_issue.sql)
3. **Replace** `'YOUR_EMAIL_HERE'` with your actual email in Step 1
4. **Run** Step 1 to get your User ID
5. **Copy** your User ID from the results
6. **Replace** all `'USER_ID_HERE'` placeholders with your actual User ID
7. **Run** each query step by step

### Diagnostic Results:

The diagnostic script will tell you which scenario applies:

| Scenario | What It Means | Fix to Use |
|----------|---------------|------------|
| **Step 3 returns NO ROWS** | Membership record is missing | Use `fix_option_a_restore_membership.sql` |
| **Step 3 returns row with status ≠ 'active'** | Status field is wrong | Use `fix_option_b_update_status.sql` |
| **Step 2 returns NO ROWS** | Organization itself is missing | Contact support (serious issue) |
| **Step 5 returns FALSE** | RLS policies broken | Use `fix_option_c_rls_policy.sql` |

---

## Step 3: Apply the Fix

Based on the diagnostic results, use the appropriate fix:

### Fix Option A: Restore Missing Membership

**Use when:** The membership record was completely deleted

1. Open [`fix_option_a_restore_membership.sql`](fix_option_a_restore_membership.sql)
2. Replace `'YOUR_USER_ID_HERE'` with your actual User ID (2 places)
3. Run the script in Supabase SQL Editor
4. Verify the success message

### Fix Option B: Update Status to Active

**Use when:** The membership exists but status is not 'active'

1. Open [`fix_option_b_update_status.sql`](fix_option_b_update_status.sql)
2. Replace `'YOUR_USER_ID_HERE'` with your actual User ID (3 places)
3. Run the script in Supabase SQL Editor
4. Verify status changed to 'active'

### Fix Option C: Re-apply RLS Policies

**Use when:** Membership exists but RLS functions return FALSE

1. Open [`fix_option_c_rls_policy.sql`](fix_option_c_rls_policy.sql)
2. Run the entire script in Supabase SQL Editor
3. Replace `'YOUR_USER_ID_HERE'` in the test queries at the end
4. Verify the test queries return TRUE

---

## Step 4: Verify the Fix

1. **Go back to your browser**
2. **Hard refresh** the page (Ctrl+Shift+R or Cmd+Shift+R)
3. **Clear localStorage** if needed:
   - Open Console (F12)
   - Run: `localStorage.clear()`
   - Refresh the page
4. **Check the workspace dropdown**
   - You should now see "Resolute - USA" in the list
5. **Select the workspace**
   - Click on "Resolute - USA" 
   - Verify it switches successfully
   - Verify your properties/data loads correctly

---

## Troubleshooting

### Still Not Showing?

1. **Check for caching issues:**
   ```javascript
   // Run in browser console
   localStorage.clear();
   sessionStorage.clear();
   location.reload();
   ```

2. **Verify the fix was applied:**
   - Re-run the diagnostic queries from Step 2
   - Confirm membership record exists with status = 'active'

3. **Check for multiple accounts:**
   - Make sure you're logged in with the correct email
   - Run in console: `await supabase.auth.getUser()` to see current user

### Error: "Cannot insert duplicate key"

This means the membership already exists. Use Fix Option B instead to update the status.

### Error: "Permission denied"

Your current user doesn't have permission to modify these tables directly. You may need to:
- Use the Supabase Service Role key (in dashboard settings)
- Or contact the database administrator

---

## Prevention

To prevent this from happening again:

1. **Don't manually delete organization_members records**
2. **Always use the "Leave Workspace" button** in settings if you want to leave
3. **Be careful with workspace switching** - ensure it completes before logging out

---

## Files Created

- [`diagnose_workspace_issue.sql`](diagnose_workspace_issue.sql) - Diagnostic queries
- [`fix_option_a_restore_membership.sql`](fix_option_a_restore_membership.sql) - Restore deleted membership
- [`fix_option_b_update_status.sql`](fix_option_b_update_status.sql) - Fix inactive status
- [`fix_option_c_rls_policy.sql`](fix_option_c_rls_policy.sql) - Re-apply RLS policies

---

## Need Help?

If you're still having issues after following all steps:

1. Take a screenshot of the browser console errors
2. Copy the results from the diagnostic queries
3. Note which fix you tried
4. Check Supabase logs for more details

The most common cause is **scenario A** (deleted membership record), which is fixed by running `fix_option_a_restore_membership.sql`.




