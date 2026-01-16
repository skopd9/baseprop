# ✅ Country Code Display Fix

## Issue

Workspace country was showing as "Not Set" in the organization settings UI, even though the database had the correct values:
- **Resolute - UK**: country_code = "UK" ✓
- **hi**: country_code = "US" ✓
- **delete**: country_code = "GR" ✓

## Root Cause

The `getUserOrganizations()` function in `OrganizationService.ts` was not selecting the `country_code` column when fetching organizations. The SQL query was:

```typescript
.select(`
  role,
  joined_at,
  organizations (
    id,
    name,
    created_by,
    settings,        // ❌ country_code was missing here
    created_at,
    updated_at
  )
`)
```

## Fix Applied

Added `country_code` to the select statement:

```typescript
.select(`
  role,
  joined_at,
  organizations (
    id,
    name,
    created_by,
    country_code,    // ✅ Added
    settings,
    created_at,
    updated_at
  )
`)
```

## Files Modified

- ✅ `src/services/OrganizationService.ts` - Added `country_code` to getUserOrganizations query

## Result

Now when you refresh the app or switch workspaces, you should see:

### Resolute - UK
- 🇬🇧 **United Kingdom** (not "Not Set")
- Currency: GBP (£)

### hi
- 🇺🇸 **United States**
- Currency: USD ($)

### delete
- 🇬🇷 **Greece**
- Currency: EUR (€)

## Testing

1. **Refresh the page** or log out and back in
2. Go to **Workspace Settings**
3. Verify you see the country with flag icon (not "Not Set")
4. Switch between workspaces and verify each shows its correct country

## Additional Fixes in This Session

Also fixed inspections and repairs showing wrong workspace properties:
- Updated inspections `organization_id` to match their property's organization
- Updated repairs `organization_id` to match their property's organization
- Now properties only appear in their correct country workspace

---

**Status**: ✅ Fixed - Ready to test

