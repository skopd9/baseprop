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
2. **Run** the following queries (replace placeholders):

```sql
-- Step 1: Find your user id
SELECT id, email
FROM auth.users
WHERE email = 'YOUR_EMAIL_HERE';

-- Step 2: Check memberships for your user
SELECT *
FROM organization_members
WHERE user_id = 'USER_ID_HERE';

-- Step 3: Check organizations tied to your memberships
SELECT o.*
FROM organizations o
JOIN organization_members om ON om.organization_id = o.id
WHERE om.user_id = 'USER_ID_HERE';
```

### Diagnostic Results:

The diagnostic script will tell you which scenario applies:

| Scenario | What It Means | Fix to Use |
|----------|---------------|------------|
| **Step 3 returns NO ROWS** | Membership record is missing | Restore the membership record via SQL |
| **Step 3 returns row with status ≠ 'active'** | Status field is wrong | Update membership status to `active` via SQL |
| **Step 2 returns NO ROWS** | Organization itself is missing | Contact support (serious issue) |
| **Step 5 returns FALSE** | RLS policies broken | Re-apply the RLS policies via SQL |

---

## Step 3: Apply the Fix

Based on the diagnostic results, apply the matching SQL fix in your Supabase SQL Editor. If you don’t have access to modify policies or memberships, contact the database administrator.

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

## Need Help?

If you're still having issues after following all steps:

1. Take a screenshot of the browser console errors
2. Copy the results from the diagnostic queries
3. Note which fix you tried
4. Check Supabase logs for more details

The most common cause is **scenario A** (deleted membership record), which requires restoring the membership record via SQL.




