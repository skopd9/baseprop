# HMO Occupancy Tracking Implementation Guide

## Overview

This guide explains the new occupancy tracking system for properties, particularly for HMOs (Houses in Multiple Occupation). The system now tracks which specific room/unit each tenant occupies and displays occupancy information like "1 of 4 occupied" for HMO properties.

## Features Implemented

### 1. Database Changes

#### New Column: `hmo_unit_name`
- Added to the `tenants` table
- Stores the name of the specific HMO unit/room a tenant occupies
- Must match a unit name in the property's `units` JSONB array
- NULL for non-HMO properties

#### Updated Property Status
- Property status now supports: `vacant`, `occupied`, `partially_occupied`, `maintenance`, `sold`
- `partially_occupied` is used for HMO properties where some (but not all) units are occupied

#### Database Functions
- **`calculate_property_occupancy(property_uuid)`**: Calculates occupancy stats for a property
- **`get_available_hmo_units(property_uuid)`**: Returns available (unoccupied) units in an HMO
- **Automatic Trigger**: Updates property occupancy status when tenants are added/removed/updated

### 2. TypeScript Types

#### Updated `PropertyStatus` Type
```typescript
export type PropertyStatus = 'vacant' | 'occupied' | 'partially_occupied' | 'maintenance' | 'sold';
```

#### New `PropertyOccupancy` Interface
```typescript
export interface PropertyOccupancy {
  type: 'standard' | 'hmo';
  totalCapacity: number;        // For HMO: number of units, for standard: 1
  occupiedCount: number;
  vacantCount?: number;         // Only for HMOs
  occupancyRate: number;        // Percentage
  vacancyRate: number;          // Percentage
  occupancyStatus: 'vacant' | 'occupied' | 'partially_occupied';
}
```

#### Updated `Tenant` Interface
```typescript
export interface Tenant {
  // ... existing fields
  hmoUnitName?: string;  // NEW: which unit/room this tenant occupies
}
```

### 3. Helper Functions (`src/utils/occupancyHelpers.ts`)

#### Core Functions

- **`calculatePropertyOccupancy(property, tenants)`**
  - Calculates occupancy information for any property
  - Returns `PropertyOccupancy` object with detailed stats
  
- **`getOccupancyDisplayText(occupancy)`**
  - Returns formatted display string
  - Examples: "Vacant", "Occupied", "1 of 4 occupied"
  
- **`getOccupancyShortText(occupancy)`**
  - Returns short format: "1/4" for HMOs, "1/1" for standard
  
- **`getOccupancyStatusColor(status)`**
  - Returns color theme for status badges
  - `vacant` → gray, `occupied` → green, `partially_occupied` → yellow
  
- **`getAvailableHMOUnits(property, tenants)`**
  - Returns array of available unit names
  - Useful for tenant assignment UI
  
- **`getOccupiedUnitsWithTenants(property, tenants)`**
  - Returns array of occupied units with tenant information
  - Format: `[{ unitName: string, tenant: Tenant }]`
  
- **`isHMOUnitAvailable(property, unitName, tenants)`**
  - Checks if a specific unit is available for assignment
  
- **`calculatePortfolioOccupancy(properties, tenants)`**
  - Portfolio-wide statistics
  - Includes HMO vs standard breakdowns

### 4. UI Updates

#### Properties Table (`ResidentialPropertiesTable.tsx`)

**Occupancy Column**
- Shows occupancy status with color-coded badges
- For HMOs: "Partially Occupied (1/4)" or "Fully Occupied (4/4)"
- For standard properties: "Occupied" or "Vacant"

**Status Filter**
- Added "Partially Occupied" as a filter option
- Filter by vacant, occupied, partially occupied, maintenance, or sold

**Visual Indicators**
- 🟢 Green badge: Fully Occupied
- 🔵 Blue badge: Partially Occupied (HMOs only)
- 🟡 Yellow badge: Vacant
- ⚫ Gray badge: Sold

### 5. Service Updates

#### SimplifiedTenantService (`src/services/SimplifiedTenantService.ts`)

When creating a tenant:
```typescript
{
  // ... other fields
  hmo_unit_name: tenantData.roomName || null,  // NEW
}
```

The service now:
- Assigns tenants to specific HMO units via `hmo_unit_name`
- Automatically triggers property occupancy recalculation
- Updates property status to `partially_occupied` if applicable

## How to Use

### 1. Apply the Database Migration

Run the migration to add the new column and functions:

```bash
# In Supabase SQL Editor or via CLI
psql your_database < migrations/add_hmo_occupancy_tracking.sql
```

Or in Supabase Dashboard:
1. Go to SQL Editor
2. Copy contents of `migrations/add_hmo_occupancy_tracking.sql`
3. Run the migration

### 2. Creating HMO Properties

When creating an HMO property, define units:

```typescript
{
  propertyType: 'hmo',
  isHMO: true,
  units: [
    { name: 'Room 1 - Master', area: 15, targetRent: 650 },
    { name: 'Room 2', area: 12, targetRent: 550 },
    { name: 'Room 3', area: 10, targetRent: 500 },
    { name: 'Room 4', area: 10, targetRent: 500 }
  ]
}
```

### 3. Assigning Tenants to HMO Units

When adding a tenant to an HMO:

```typescript
await SimplifiedTenantService.createSimplifiedTenant({
  name: 'John Smith',
  propertyId: property.id,
  roomName: 'Room 1 - Master',  // Must match a unit name
  monthlyRent: 650,
  // ... other fields
});
```

### 4. Displaying Occupancy Information

```typescript
import { calculatePropertyOccupancy, getOccupancyDisplayText } from '../utils/occupancyHelpers';

const occupancy = calculatePropertyOccupancy(property, tenants);
const displayText = getOccupancyDisplayText(occupancy);

// displayText will be:
// - "Vacant" (0 occupied)
// - "1 of 4 occupied" (partially occupied HMO)
// - "Fully Occupied" (all units occupied)
```

### 5. Getting Available Units

```typescript
import { getAvailableHMOUnits } from '../utils/occupancyHelpers';

const availableUnits = getAvailableHMOUnits(property, tenants);
// Returns: ['Room 2', 'Room 3', 'Room 4'] (if Room 1 is occupied)
```

## Examples

### Example 1: 4-Room HMO with 1 Tenant

```
Property: 123 High Street
Type: HMO
Units: Room 1, Room 2, Room 3, Room 4
Tenants: 
  - John Smith (Room 1)

Occupancy Display: "Partially Occupied (1/4)"
Status Badge: Blue
Available Units: Room 2, Room 3, Room 4
```

### Example 2: Fully Occupied HMO

```
Property: 456 Main Street  
Type: HMO
Units: Studio A, Studio B, Studio C
Tenants:
  - Alice Jones (Studio A)
  - Bob Smith (Studio B)
  - Carol White (Studio C)

Occupancy Display: "Fully Occupied (3/3)"
Status Badge: Green
Available Units: (none)
```

### Example 3: Standard Property

```
Property: 789 Oak Avenue
Type: House
Tenants: 
  - Family Smith

Occupancy Display: "Occupied"
Status Badge: Green
```

## Benefits

### For Landlords
- **Clear visibility**: See at a glance which HMO units are occupied
- **Better planning**: Easily identify vacant rooms for marketing
- **Accurate reporting**: Portfolio-wide occupancy statistics
- **Tenant management**: Track which tenant is in which room

### For Property Managers
- **Efficient operations**: Quickly assign new tenants to available rooms
- **Revenue tracking**: Monitor rent by individual room
- **Compliance**: Maintain accurate records of occupancy for licensing

### For Tenants
- **Transparency**: Clear information about which room they occupy
- **Documentation**: Accurate lease information tied to specific units

## Database Schema Reference

### Tenants Table

```sql
CREATE TABLE tenants (
  -- ... existing columns
  hmo_unit_name TEXT,  -- NEW: which HMO unit this tenant occupies
  -- ... rest of columns
);

CREATE INDEX idx_tenants_hmo_unit 
ON tenants(property_id, hmo_unit_name) 
WHERE hmo_unit_name IS NOT NULL;
```

### Properties Table

```sql
CREATE TABLE properties (
  -- ... existing columns
  status TEXT CHECK (status IN ('vacant', 'occupied', 'partially_occupied', 'maintenance', 'sold')),
  is_hmo BOOLEAN DEFAULT false,
  units JSONB,  -- [{name, area, targetRent}, ...]
  tenant_count INTEGER DEFAULT 0,
  -- ... rest of columns
);
```

## Automatic Triggers

The system includes automatic triggers that:

1. **Update property occupancy status** when tenants are:
   - Added
   - Removed
   - Status changed (active/inactive)
   - Moved to different units

2. **Maintain tenant_count** automatically
   - Counts active tenants for the property
   - Updates in real-time

3. **Prevent invalid assignments**
   - Validates HMO unit names against property units
   - Ensures data integrity

## Troubleshooting

### Issue: Occupancy showing incorrectly

**Check:**
1. Tenants have `status = 'active'`
2. `hmo_unit_name` matches exactly a unit name in property's `units` array
3. Case sensitivity - unit names are case-sensitive

**Solution:**
```sql
-- Check tenants for a property
SELECT id, name, hmo_unit_name, status
FROM tenants 
WHERE property_id = 'your-property-id';

-- Check property units
SELECT id, address, units
FROM properties
WHERE id = 'your-property-id';
```

### Issue: Available units not showing

**Check:**
1. Property has `is_hmo = true`
2. Property has `units` defined (not NULL or empty)
3. Active tenants assigned to those units

**Solution:**
```sql
-- Get available units for a property
SELECT * FROM get_available_hmo_units('your-property-id');
```

### Issue: Property status not updating

**Check:**
1. Trigger is enabled
2. No errors in database logs

**Solution:**
```sql
-- Manually recalculate occupancy
SELECT calculate_property_occupancy('your-property-id');

-- Check trigger status
SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_property_occupancy';
```

## Next Steps

### Potential Enhancements

1. **Room availability calendar**
   - Show when rooms become available (lease end dates)
   - Advance booking system

2. **Occupancy history**
   - Track historical occupancy rates
   - Generate occupancy reports over time

3. **Multi-tenant rooms**
   - Support for rooms with multiple tenants (e.g., couples)
   - Shared rooms in student HMOs

4. **Rent optimization**
   - Suggest rent adjustments based on occupancy
   - Highlight underperforming units

5. **Automated marketing**
   - Automatically list vacant rooms on platforms
   - Send notifications when rooms become available

## Support

For questions or issues:
1. Check this guide first
2. Review the database migration script
3. Test with sample data in development
4. Check Supabase logs for errors

## Version History

- **v1.0.0** (Current) - Initial implementation
  - HMO unit tracking
  - Occupancy calculation
  - UI updates
  - Database triggers

