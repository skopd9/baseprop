# Database Cleanup - Complete ✅

## What's Been Done

### 1. Created New Schema ✅
**File:** `uk_landlord_schema.sql`
- 9 simplified tables (down from 10+ complex tables)
- UK-focused with multi-country support
- Proper indexes and relationships
- Sample data (UK, Greece, USA properties)

### 2. Updated Code to Work with New Schema ✅

**Updated Files:**
- `src/utils/simplifiedDataTransforms.ts` - Transform functions now use regular columns instead of JSONB
- `src/services/SimplifiedPropertyService.ts` - Queries updated for new schema

**Key Changes:**
- **OLD:** `property_data->>'field_name'` (JSONB queries)
- **NEW:** Direct column access: `property.field_name`

### 3. Services Updated ✅

**SimplifiedPropertyService:**
- Removed `.eq('property_data->>is_simplified_demo', 'true')` filter
- Updated tenant counting to use `property_id` column directly
- Now fetches all properties from new schema

**Transform Functions:**
- `transformToSimplifiedProperty()` - Uses new columns: `is_hmo`, `hmo_license_number`, `square_meters`, etc.
- `transformToSimplifiedTenant()` - Uses new columns: `lease_start`, `lease_end`, `monthly_rent`, `status`, etc.

## What You Need to Do Now

### Step 1: Apply the New Database Schema

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Copy the contents of `uk_landlord_schema.sql`
4. Paste and **Run**

This will:
- ✅ Drop old tables
- ✅ Create 9 new tables
- ✅ Add indexes
- ✅ Insert 3 sample properties

### Step 2: Verify Database Setup

Run this query in Supabase SQL Editor:

```sql
-- Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Expected tables:
- `agents`
- `compliance_certificates`
- `expenses`
- `inspections`
- `properties`
- `rent_payments`
- `repairs`
- `tenants`
- `user_preferences`

### Step 3: Verify Sample Data

```sql
-- Check sample properties
SELECT id, country_code, address, property_type, status, is_hmo
FROM properties;
```

You should see:
- 🇬🇧 UK property in Manchester
- 🇬🇷 Greece property in Athens
- 🇺🇸 USA property in Austin

### Step 4: Test the Application

```bash
# Restart dev server
npm run dev
```

Then test:
1. ✅ Dashboard loads
2. ✅ Properties view shows sample properties
3. ✅ Add a new property
4. ✅ Add a tenant
5. ✅ Add a compliance certificate

## Database Schema Changes Summary

### ❌ Removed Tables
- `asset_register_configs` - No longer needed (removed complex field configuration system)
- `workflow_templates` - Removed template customization
- `workflow_instances` (old complex version)
- `workstreams` - Removed complex workflow system
- Module-related tables - No institutional features

### ✅ New Tables

**1. user_preferences**
- Store user country and type (direct_landlord, agent_using_landlord, property_manager)

**2. agents**
- Letting agents and property managers
- Services provided, fees, contracts

**3. properties** (Simplified)
```sql
Key columns:
- country_code (UK/GR/US)
- is_hmo, hmo_license_number, hmo_license_expiry
- council_tax_band, council_tax_annual (UK)
- agent_id, agent_managed
- units (JSONB for HMO rooms)
```

**4. tenants** (Simplified)
```sql
Key columns:
- country_code (UK/GR/US)
- right_to_rent_checked, right_to_rent_check_date (UK)
- deposit_scheme, deposit_protected_date, deposit_certificate_number (UK)
- found_via_agent_id
```

**5. compliance_certificates** (New)
- Tracks all 10 UK compliance types
- Country-specific compliance
- Expiry tracking and reminders

**6. rent_payments** (New)
- Payment status tracking
- Due dates and amounts
- Payment methods

**7. inspections** (Simplified)
- Inspection types and scheduling
- Findings and follow-ups

**8. repairs** (Simplified)
- Priority levels
- Contractor tracking
- Cost tracking

**9. expenses** (Simplified)
- Expense categories
- Tax deductibility
- Receipt storage

## Troubleshooting

### ❌ Issue: "relation does not exist"
**Solution:** You haven't run the new schema yet. Run `uk_landlord_schema.sql` in Supabase.

### ❌ Issue: "column does not exist"
**Solution:** Old code still referencing old columns. Check if there are other services not yet updated.

### ❌ Issue: No data showing up
**Solution:** 
1. Check if schema was applied successfully
2. Verify sample data exists: `SELECT * FROM properties;`
3. Check browser console for errors
4. Clear browser cache

### ❌ Issue: TypeScript errors
**Solution:** Types are updated in `src/types/index.ts`. Restart your IDE/editor.

## What's Different in the Code

### OLD Way (JSONB):
```typescript
// OLD: Complex JSONB queries
.eq('property_data->>is_simplified_demo', 'true')
.select('property_data')

// OLD: Accessing nested data
const bedrooms = property.property_data?.bedrooms;
```

### NEW Way (Regular Columns):
```typescript
// NEW: Simple column queries
.select('*')

// NEW: Direct column access
const bedrooms = property.bedrooms;
```

## Benefits of New Schema

1. **Simpler** - Direct column access, no JSONB parsing
2. **Faster** - Indexed columns perform better than JSONB queries
3. **Type-Safe** - Clear column types, better TypeScript support
4. **UK-Focused** - Built-in UK compliance fields
5. **Multi-Country Ready** - Country code on each record
6. **Agent Support** - Built-in agent tracking
7. **HMO Support** - Proper HMO fields and licensing

## Next Steps

After database is running:
1. Add country selector to property/tenant forms
2. Add user type selector in settings
3. Integrate country-specific formatters in display components
4. Test all CRUD operations
5. Test compliance tracking
6. Test rent/expense tracking

---

**Ready to apply the new database schema!** 🚀

Follow the steps above and your database will be clean, simple, and UK-focused.

