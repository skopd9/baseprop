# Property Edit Save Fix

## Issue
When editing properties in the property table and clicking "Save Changes", the changes weren't persisting. The system was throwing a **400 Bad Request** error when trying to save.

## Root Cause
There were TWO issues causing the 400 error:

1. **Invalid status values**: The code was trying to set `status: 'active'` but the database has a CHECK constraint that only allows: `'vacant'`, `'occupied'`, `'partially_occupied'`, `'maintenance'`, `'sold'`

2. **Wrong data structure**: The transform function wasn't reading from the `property_data` JSONB field correctly

### Actual Database Schema
The `properties` table only has these columns:
- `id` (uuid)
- `asset_register_id` (text)
- `name` (text)
- `address` (text)
- `property_data` (JSONB) ⭐ **All property details stored here**
- `status` (text)
- `created_at`, `updated_at` (timestamps)
- `module_id`, `organization_id` (uuids)
- `property_reference` (integer)

There are **NO** individual columns like `bedrooms`, `bathrooms`, `monthly_rent`, etc. All property details are stored in the `property_data` JSONB column.

### Database Status Constraint
The properties table has this CHECK constraint:
```sql
CHECK ((status = ANY (ARRAY['vacant'::text, 'occupied'::text, 'partially_occupied'::text, 'maintenance'::text, 'sold'::text])))
```

## Changes Made

### 1. Fixed Status Value Handling
**In `updateSimplifiedProperty`** (line 417-426): Removed invalid 'active' status
```typescript
if (updates.status) {
  // Database allows: 'vacant', 'occupied', 'partially_occupied', 'maintenance', 'sold'
  // Simplified uses: 'under_management', 'sold'
  if (updates.status === 'sold') {
    coreUpdates.status = 'sold';
  }
  // For 'under_management', don't change the core status field
  // The occupancy status is calculated dynamically based on tenants
}
```

**In `createSimplifiedProperty`** (line 154): Changed from 'active' to 'vacant'
```typescript
status: 'vacant', // New properties start as vacant
```

**In `markPropertyAsSold`** (line 258): Changed from 'disposed' to 'sold'
```typescript
status: 'sold', // Was incorrectly using 'disposed'
```

### 2. Fixed `transformToSimplifiedProperty` (lines 123-187 in simplifiedDataTransforms.ts)
Updated the transform function to correctly read from `property_data` JSONB:

```typescript
export const transformToSimplifiedProperty = (property: any, actualTenantCount?: number): SimplifiedProperty => {
  // Extract property data from JSONB field
  const propertyData = property.property_data || {};
  
  return {
    id: property.id,
    propertyReference: property.property_reference || 0,
    propertyName: propertyData.property_name || property.name,
    address: property.address,
    propertyType: getSimplifiedPropertyType(
      propertyData.property_type || 'residential', 
      propertyData.property_sub_type || 'flat'
    ),
    bedrooms: propertyData.bedrooms || 2,
    bathrooms: propertyData.bathrooms || 1,
    targetRent: propertyData.target_rent || propertyData.monthly_rent || 1500,
    purchasePrice: propertyData.purchase_price,
    // ... all other fields read from propertyData
  };
};
```

### 2. Fixed `updateSimplifiedProperty` (lines 362-430 in SimplifiedPropertyService.ts)
Updated to properly build the `property_data` JSONB object with all fields:

```typescript
const updatedPropertyData = {
  ...currentProperty.property_data,
  ...(updates.propertyName !== undefined && { property_name: updates.propertyName }),
  ...(updates.propertyType && { 
    property_sub_type: updates.propertyType,
    property_type: 'residential'
  }),
  ...(updates.bedrooms !== undefined && { bedrooms: updates.bedrooms }),
  ...(updates.bathrooms !== undefined && { bathrooms: updates.bathrooms }),
  ...(updates.targetRent !== undefined && { 
    target_rent: updates.targetRent,
    monthly_rent: updates.targetRent
  }),
  ...(updates.purchasePrice !== undefined && { purchase_price: updates.purchasePrice }),
  // ... all other fields
};

// Only update columns that actually exist in the schema
const coreUpdates = {
  property_data: updatedPropertyData,
  updated_at: new Date().toISOString(),
  ...(updates.address && { address: updates.address }),
  ...(updates.propertyName !== undefined && { name: updates.propertyName }),
  ...(updates.status && { status: updates.status === 'sold' ? 'sold' : 'active' })
};
```

### 3. Fixed Validation Function (line 244 in simplifiedDataTransforms.ts)
Fixed validation to check the correct field:

```typescript
// Before (incorrect):
if (property.monthlyRent < 0) {
  errors.push('Monthly rent cannot be negative');
}

// After (correct):
if (property.targetRent < 0) {
  errors.push('Target rent cannot be negative');
}
```

## Fields Now Persisting Correctly
✅ Property Name (custom names)
✅ Property Address  
✅ Property Type (house/flat/hmo)
✅ Bedrooms
✅ Bathrooms
✅ Target Rent
✅ Purchase Price
✅ Sales Price
✅ Total Area
✅ Year Built
✅ Furnished Status
✅ Parking Type
✅ Garden (yes/no)
✅ HMO Max Occupancy
✅ HMO License Required
✅ HMO License Number
✅ HMO License Expiry
✅ HMO Rooms/Units
✅ Property Status (under management/sold)

## Testing
To test the fix:
1. Open the Properties view
2. Click on any property to open the edit modal
3. Make changes to any field (e.g., change bedrooms from 2 to 3, or update rent amount)
4. Click "Save Changes"
5. **No more 400 errors!** ✅
6. Close the modal
7. Click on the same property again to verify changes persisted
8. Refresh the page and verify changes are still there

## Technical Details
- **All property details** are stored in the `property_data` JSONB column
- Only core fields (`name`, `address`, `status`) exist as regular columns
- The transform function extracts all fields from `property_data`
- Updates must write to `property_data` JSONB, not to non-existent columns

