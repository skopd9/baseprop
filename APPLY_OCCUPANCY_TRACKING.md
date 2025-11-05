# Quick Start: Apply HMO Occupancy Tracking

## What This Does

Adds comprehensive occupancy tracking for HMO properties:
- ✅ Track which tenant occupies which room
- ✅ Show "1 of 4 occupied" for HMOs with partial occupancy
- ✅ Automatic occupancy status updates
- ✅ Filter properties by occupancy status
- ✅ Portfolio-wide occupancy statistics

## Step 1: Apply Database Migration

### Option A: Supabase Dashboard (Recommended)

1. Go to your Supabase project
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy the entire contents of `migrations/add_hmo_occupancy_tracking.sql`
5. Paste into the SQL editor
6. Click **Run** (bottom right)
7. Wait for success message

### Option B: Command Line

```bash
# If you have Supabase CLI installed
supabase db push

# Or use psql directly
psql YOUR_DATABASE_URL -f migrations/add_hmo_occupancy_tracking.sql
```

## Step 2: Verify Migration

Run this query in Supabase SQL Editor:

```sql
-- Check if new column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'tenants' 
  AND column_name = 'hmo_unit_name';

-- Should return:
-- column_name    | data_type
-- ---------------+-----------
-- hmo_unit_name  | text

-- Check if new functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN ('calculate_property_occupancy', 'get_available_hmo_units');

-- Should return both function names
```

## Step 3: Test with Sample Data

### Create a Test HMO Property

```sql
-- Insert a test HMO property
INSERT INTO properties (
  address,
  property_type,
  is_hmo,
  bedrooms,
  bathrooms,
  monthly_rent,
  status,
  units
) VALUES (
  '123 Test Street, London',
  'hmo',
  true,
  4,
  2,
  2200,
  'vacant',
  '[
    {"name": "Room 1 - Master", "area": 15, "targetRent": 650},
    {"name": "Room 2", "area": 12, "targetRent": 550},
    {"name": "Room 3", "area": 10, "targetRent": 500},
    {"name": "Room 4", "area": 10, "targetRent": 500}
  ]'::jsonb
) RETURNING id;
```

Copy the returned `id` for next step.

### Add a Test Tenant

```sql
-- Replace 'PROPERTY_ID_HERE' with the ID from previous step
INSERT INTO tenants (
  property_id,
  name,
  email,
  phone,
  status,
  hmo_unit_name,
  lease_start,
  lease_end,
  monthly_rent,
  deposit_amount
) VALUES (
  'PROPERTY_ID_HERE',
  'John Smith',
  'john@example.com',
  '07700900000',
  'active',
  'Room 1 - Master',
  CURRENT_DATE,
  CURRENT_DATE + INTERVAL '12 months',
  650,
  1950
);
```

### Check Occupancy

```sql
-- Calculate occupancy (replace with your property ID)
SELECT calculate_property_occupancy('PROPERTY_ID_HERE');

-- Should return something like:
-- {
--   "type": "hmo",
--   "total_capacity": 4,
--   "occupied_count": 1,
--   "vacant_count": 3,
--   "vacancy_rate": 75.0,
--   "occupancy_rate": 25.0,
--   "occupancy_status": "partially_occupied"
-- }

-- Check property status was updated automatically
SELECT address, status, tenant_count 
FROM properties 
WHERE id = 'PROPERTY_ID_HERE';

-- Should show:
-- status = 'partially_occupied'
-- tenant_count = 1
```

### Check Available Units

```sql
-- Get available units (replace with your property ID)
SELECT get_available_hmo_units('PROPERTY_ID_HERE');

-- Should return:
-- [
--   {"name": "Room 2", "area": 12, "targetRent": 550},
--   {"name": "Room 3", "area": 10, "targetRent": 500},
--   {"name": "Room 4", "area": 10, "targetRent": 500}
-- ]
```

## Step 4: Update Existing Data (Optional)

If you have existing HMO properties with tenants, you may want to assign them to specific units:

```sql
-- List your HMO properties
SELECT id, address, units, tenant_count 
FROM properties 
WHERE is_hmo = true;

-- For each HMO with tenants, update tenant assignments
-- Example: Assign first tenant to first unit
UPDATE tenants 
SET hmo_unit_name = 'Room 1'  -- Use actual unit name from property.units
WHERE property_id = 'YOUR_HMO_PROPERTY_ID'
  AND hmo_unit_name IS NULL
  AND status = 'active'
LIMIT 1;

-- Repeat for other tenants and units
```

## Step 5: Test in UI

1. Restart your development server:
   ```bash
   npm run dev
   ```

2. Navigate to Properties view

3. Look for the **Occupancy** column

4. For HMOs, you should now see:
   - "Vacant" (0 tenants)
   - "Partially Occupied (1/4)" (some units occupied)
   - "Fully Occupied (4/4)" (all units occupied)

5. Try the status filter:
   - Filter by "Partially Occupied" to see HMOs with vacancies

## Step 6: Add a New Tenant to HMO

When adding a tenant through the UI:

1. Click **Add Tenant**
2. Select an HMO property
3. The modal should show available rooms/units
4. Select a specific room
5. Complete tenant details
6. Save

The property's occupancy status will update automatically!

## What Gets Updated

### Database
- ✅ New `hmo_unit_name` column in `tenants` table
- ✅ Property status now includes `partially_occupied`
- ✅ Database functions for occupancy calculations
- ✅ Automatic triggers to update status

### TypeScript
- ✅ Updated type definitions
- ✅ New occupancy helper functions
- ✅ Service methods support HMO unit assignment

### UI
- ✅ Properties table shows occupancy (e.g., "1 of 4 occupied")
- ✅ Filter by occupancy status
- ✅ Color-coded status badges
- ✅ Tenant assignment to specific units

## Rollback (If Needed)

If you need to undo the migration:

```sql
-- Remove trigger
DROP TRIGGER IF EXISTS trigger_update_property_occupancy ON tenants;
DROP FUNCTION IF EXISTS update_property_occupancy_status();

-- Remove functions
DROP FUNCTION IF EXISTS get_available_hmo_units(UUID);
DROP FUNCTION IF EXISTS calculate_property_occupancy(UUID);

-- Remove column
ALTER TABLE tenants DROP COLUMN IF EXISTS hmo_unit_name;

-- Remove index
DROP INDEX IF EXISTS idx_tenants_hmo_unit;

-- Restore old status constraint
ALTER TABLE properties DROP CONSTRAINT IF EXISTS properties_status_check;
ALTER TABLE properties 
ADD CONSTRAINT properties_status_check 
CHECK (status IN ('vacant', 'occupied', 'maintenance', 'sold'));
```

## Troubleshooting

### Migration fails

**Error: "column already exists"**
- The migration may have been partially applied
- Check existing columns and skip those steps

**Error: "permission denied"**
- Make sure you're using an admin/owner account
- Check RLS policies aren't blocking the changes

### Occupancy not updating

1. Check the trigger is active:
   ```sql
   SELECT tgname, tgenabled 
   FROM pg_trigger 
   WHERE tgname = 'trigger_update_property_occupancy';
   ```

2. Manually trigger update:
   ```sql
   SELECT calculate_property_occupancy('your-property-id');
   ```

### UI not showing changes

1. Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
2. Check browser console for errors
3. Verify data in database directly

## Next Steps

- Read the full [OCCUPANCY_TRACKING_GUIDE.md](./OCCUPANCY_TRACKING_GUIDE.md) for detailed usage
- Test with your actual HMO properties
- Update existing tenant assignments
- Explore portfolio-wide occupancy reports

## Success Criteria

You'll know it's working when:

✅ HMO properties show "X of Y occupied" in the table
✅ Adding a tenant updates occupancy automatically  
✅ Filter by "Partially Occupied" shows HMOs with vacancies
✅ Property status badge is blue for partial occupancy
✅ No errors in browser console or database logs

## Questions?

- Check [OCCUPANCY_TRACKING_GUIDE.md](./OCCUPANCY_TRACKING_GUIDE.md) for detailed documentation
- Review migration SQL comments for explanations
- Test in a non-production environment first

