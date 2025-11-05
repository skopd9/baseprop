# ✅ HMO Occupancy Tracking - Successfully Applied via MCP

## What Was Done

Using the **Supabase MCP**, the occupancy tracking system has been successfully applied directly to your database!

## Migrations Applied

### 1. Updated Property Status Values ✅
**Migration:** `update_property_status_constraint`

Changed existing status values to match the new schema:
- `'active'` → `'vacant'` or `'occupied'` (based on whether units have tenants)
- `'disposed'` → `'sold'`
- Added support for `'partially_occupied'` status

**New Status Constraint:**
```sql
status IN ('vacant', 'occupied', 'partially_occupied', 'maintenance', 'sold')
```

### 2. Created Occupancy Tracking Functions ✅
**Migration:** `add_occupancy_tracking_functions`

Created three powerful functions:

#### `calculate_property_occupancy(property_uuid)`
Calculates detailed occupancy statistics for any property:
```json
{
  "type": "hmo",
  "total_capacity": 4,
  "occupied_count": 1,
  "vacant_count": 3,
  "vacancy_rate": 75.0,
  "occupancy_rate": 25.0,
  "occupancy_status": "partially_occupied"
}
```

#### `get_available_units(property_uuid)`
Returns all vacant units for a property that are ready to rent.

#### `update_property_occupancy_status()` (Trigger Function)
Automatically updates property status when:
- A tenant is assigned to a unit
- A tenant's lease ends or status changes
- A unit becomes available

### 3. Automatic Trigger ✅
Created trigger on `unit_tenants` table that fires on:
- `INSERT` - When a new tenant is assigned
- `UPDATE` - When tenant status changes
- `DELETE` - When a tenant-unit relationship ends

## How It Works with Your Schema

Your database uses the institutional multi-unit model:

### Tables Used
1. **`properties`** - Main property records
2. **`units`** - Individual rooms/units within properties (HMO rooms)
3. **`unit_tenants`** - Join table connecting tenants to specific units

### Example Flow

```
Property: 123 High Street
├── Unit 1 (Studio A)
│   └── Tenant: John Smith ✅ OCCUPIED
├── Unit 2 (Studio B)
│   └── (vacant) ❌ VACANT
├── Unit 3 (Studio C)
│   └── Tenant: Alice Jones ✅ OCCUPIED
└── Unit 4 (Studio D)
    └── (vacant) ❌ VACANT

Property Status: "partially_occupied" (2 of 4 units)
```

## What Happens Automatically Now

### Scenario 1: New Tenant Added
```sql
INSERT INTO unit_tenants (unit_id, tenant_id, status, ...)
VALUES (...);

-- Trigger fires automatically:
-- 1. Calculates: 3 of 4 units now occupied
-- 2. Updates property status to 'partially_occupied'
-- 3. Updates property.updated_at timestamp
```

### Scenario 2: Tenant Lease Ends
```sql
UPDATE unit_tenants 
SET status = 'expired'
WHERE id = '...';

-- Trigger fires automatically:
-- 1. Calculates: 2 of 4 units now occupied
-- 2. Property remains 'partially_occupied'
-- 3. Unit becomes available for new tenant
```

### Scenario 3: Last Tenant Leaves
```sql
DELETE FROM unit_tenants 
WHERE unit_id = '...' AND tenant_id = '...';

-- Trigger fires automatically:
-- 1. Calculates: 0 of 4 units occupied
-- 2. Updates property status to 'vacant'
-- 3. All units now available
```

## Testing Your Setup

### Check Current Property Occupancy

```sql
-- See all properties with their occupancy status
SELECT 
  property_reference,
  address,
  status,
  (SELECT COUNT(*) FROM units WHERE property_id = properties.id) as total_units,
  (SELECT COUNT(DISTINCT u.id) 
   FROM units u 
   JOIN unit_tenants ut ON u.id = ut.unit_id 
   WHERE u.property_id = properties.id AND ut.status = 'active') as occupied_units
FROM properties
ORDER BY status, property_reference;
```

### Calculate Occupancy for Specific Property

```sql
-- Replace with actual property ID
SELECT calculate_property_occupancy('your-property-id-here');
```

### Find Available Units

```sql
-- Replace with actual property ID
SELECT * FROM get_available_units('your-property-id-here');
```

### Test the Trigger

```sql
-- 1. Find a vacant unit
SELECT id, unit_number, property_id 
FROM units 
WHERE status = 'available' 
LIMIT 1;

-- 2. Add a test tenant assignment (replace IDs)
INSERT INTO unit_tenants (
  unit_id, 
  tenant_id, 
  status, 
  lease_start_date,
  rent_amount
) VALUES (
  'your-unit-id',
  'your-tenant-id',
  'active',
  CURRENT_DATE,
  1000
);

-- 3. Check if property status updated
SELECT id, address, status 
FROM properties 
WHERE id = 'your-property-id';
```

## UI Integration

The frontend code is already prepared and will automatically work with this database structure:

### Properties Table
Will now show:
- 🟢 **"Fully Occupied (4/4)"** - All units have tenants
- 🔵 **"Partially Occupied (2/4)"** - Some units vacant
- 🟡 **"Vacant"** - No tenants

### Status Filters
Can filter by:
- Occupied
- Partially Occupied (new!)
- Vacant
- Maintenance
- Sold

### Occupancy Helper Functions
The TypeScript helpers in `src/utils/occupancyHelpers.ts` will work with this data:

```typescript
// Calculate occupancy from units/unit_tenants
const occupancy = calculatePropertyOccupancy(property, tenants);

// Get display text
const text = getOccupancyDisplayText(occupancy);
// Returns: "Partially Occupied (2/4)"

// Get color for badge
const color = getOccupancyStatusColor(occupancy.occupancyStatus);
// Returns: "yellow" for partially occupied
```

## Migrations Applied Successfully ✅

Both migrations were applied via MCP:

1. ✅ `update_property_status_constraint` - Updated status values and constraint
2. ✅ `add_occupancy_tracking_functions` - Created functions and trigger

## What's Different from the Original Plan

**Original Plan:** Add `hmo_unit_name` column to `tenants` table

**Actual Implementation:** Used your existing `units` and `unit_tenants` structure

**Why:** Your database already has a better structure for multi-unit properties! The `units` table represents individual rooms, and `unit_tenants` properly links tenants to specific units.

**Benefits:**
- ✅ More flexible - supports commercial multi-unit properties too
- ✅ Better data integrity - enforced via foreign keys
- ✅ Easier queries - clearer relationships
- ✅ Scalable - works for any property type

## Next Steps

1. **Refresh your app** - The changes are live in the database

2. **Test in UI:**
   ```bash
   npm run dev
   ```
   
3. **Check a multi-unit property** - Look for properties with multiple units in the Properties table

4. **Add a tenant to a unit** - See the occupancy update automatically

5. **Use filters** - Try filtering by "Partially Occupied"

## Verification Query

Run this to see the results:

```sql
-- Properties with their occupancy
SELECT 
  p.property_reference,
  p.address,
  p.status as property_status,
  COUNT(u.id) as total_units,
  COUNT(DISTINCT CASE WHEN ut.status = 'active' THEN u.id END) as occupied_units,
  calculate_property_occupancy(p.id)->>'occupancy_status' as calculated_status
FROM properties p
LEFT JOIN units u ON u.property_id = p.id
LEFT JOIN unit_tenants ut ON ut.unit_id = u.id
GROUP BY p.id, p.property_reference, p.address, p.status
HAVING COUNT(u.id) > 0
ORDER BY p.property_reference;
```

## Success! 🎉

Your database now has:
- ✅ Updated property status values
- ✅ `partially_occupied` status support
- ✅ Automatic occupancy calculation
- ✅ Automatic status updates via trigger
- ✅ Helper functions for queries
- ✅ Full HMO occupancy tracking

The system will automatically maintain accurate occupancy information as tenants are added, removed, or their status changes!

## Support

If you encounter any issues:
1. Check that `unit_tenants` have `status = 'active'` for current tenants
2. Verify units are linked to correct properties
3. Run `calculate_property_occupancy(property_id)` manually to recalculate
4. Check the [full documentation](./OCCUPANCY_TRACKING_GUIDE.md)

