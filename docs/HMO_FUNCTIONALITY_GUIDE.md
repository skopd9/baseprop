# HMO (House in Multiple Occupation) Functionality Guide

## Overview

The landlord demo now includes comprehensive support for HMO (House in Multiple Occupation) properties. When users select HMO as the property type, they must add individual units with specific details including name, area, and target rent - ensuring consistency with real-world HMO management requirements.

## Key Features

### 1. Enhanced Property Creation Modal

When "HMO (House in Multiple Occupation)" is selected as the property type:

- **Units/Rooms Section**: Appears automatically
- **Required Fields per Unit**:
  - **Name**: e.g., "Room 1 - Master", "Studio A", "Bedroom 2"
  - **Area**: Square meters (required, minimum 1 sqm)
  - **Target Rent**: Monthly rent in £ (required, minimum £1)

### 2. Automatic Rent Calculation

- **Total Property Rent**: Automatically calculated from sum of all unit rents
- **Main Rent Field**: Becomes read-only and shows calculated total
- **Real-time Updates**: Total updates as you add/modify units
- **Visual Summary**: Shows total rent and total area at bottom of units section

### 3. Comprehensive Validation

- **Unit Requirements**: HMO properties must have at least one unit
- **Field Validation**: All units must have valid name, area, and rent
- **Business Logic**: Prevents creation of incomplete HMO properties

### 4. Enhanced Table Display

HMO properties are clearly distinguished in the properties table:

- **Bed/Bath Column**: Shows "X units" instead of just bedrooms/bathrooms
- **Rent Column**: Displays average rent per unit
- **Visual Indicators**: Purple icon for HMO properties

## User Experience Flow

### Creating an HMO Property

1. **Select Property Type**: Choose "HMO (House in Multiple Occupation)"
2. **Basic Details**: Enter address, bedrooms, bathrooms, purchase price
3. **Add Units**: Click "+ Add Unit" to create individual rooms
4. **Unit Details**: For each unit, specify:
   - Descriptive name (e.g., "Master Bedroom", "Studio 1")
   - Area in square meters
   - Target monthly rent
5. **Review Summary**: Check total rent and area calculations
6. **Create Property**: System validates all fields and creates property

### Unit Management

- **Add Units**: Click "+ Add Unit" button
- **Remove Units**: Click "Remove" button on each unit card
- **Edit Details**: Modify name, area, or rent inline
- **Visual Feedback**: Each unit displayed in its own card with clear labels

### Rent Calculation Example

```
Room 1 - Master: 15 sqm, £450/month
Room 2 - Double: 12 sqm, £400/month  
Room 3 - Single: 10 sqm, £350/month
Room 4 - Double: 13 sqm, £420/month
Room 5 - Single: 9 sqm, £320/month

Total Target Rent: £1,940/month
Total Area: 59 sqm
```

## Technical Implementation

### Data Structure

```typescript
interface SimplifiedProperty {
  // ... other fields
  propertyType: 'house' | 'flat' | 'hmo';
  targetRent: number; // Total calculated rent for HMO
  unitDetails?: Array<{
    name: string;
    area: number;
    targetRent: number;
  }>;
}
```

### Database Storage

```json
{
  "property_data": {
    "property_sub_type": "hmo",
    "target_rent": 1940,
    "unit_details": [
      {
        "name": "Room 1 - Master",
        "area": 15,
        "targetRent": 450
      }
      // ... more units
    ]
  }
}
```

### Validation Rules

1. **HMO Properties**: Must have at least one unit defined
2. **Unit Names**: Cannot be empty or whitespace only
3. **Unit Areas**: Must be positive numbers (minimum 1 sqm)
4. **Unit Rents**: Must be positive numbers (minimum £1)
5. **Total Rent**: Automatically calculated, cannot be manually edited

## Demo Data

The system includes a realistic HMO example:

- **Property**: 78 High Street, Leeds LS1 4PQ
- **Type**: 5-bedroom HMO with 2 bathrooms
- **Units**: 5 individual rooms with varying sizes and rents
- **Tenants**: 3 tenants assigned to specific rooms
- **Total Rent**: £1,800/month from all units combined

## Benefits

### For Property Managers

1. **Accurate Rent Tracking**: Individual unit rents vs. total property rent
2. **Space Management**: Track area utilization per unit
3. **Tenant Assignment**: Assign tenants to specific rooms
4. **Financial Planning**: Clear breakdown of income per unit

### For System Consistency

1. **Data Integrity**: All HMO properties have complete unit information
2. **Validation**: Prevents incomplete or invalid HMO setups
3. **Reporting**: Accurate rent calculations and occupancy tracking
4. **User Experience**: Clear, guided process for HMO creation

## Comparison: Before vs After

### Before Enhancement
- HMO properties treated same as regular properties
- No unit-specific information
- Manual rent entry without validation
- Limited visibility into unit breakdown

### After Enhancement
- Dedicated HMO workflow with unit management
- Required unit details (name, area, rent)
- Automatic rent calculation from units
- Clear visual indicators and summaries
- Comprehensive validation and error handling

## Future Enhancements

Potential improvements for HMO functionality:

1. **Unit Occupancy Tracking**: Visual indicators for occupied vs vacant units
2. **Rent Roll Reports**: Detailed breakdowns by unit
3. **Unit Photos**: Attach images to individual units
4. **Maintenance Tracking**: Unit-specific maintenance requests
5. **Lease Management**: Individual leases per unit
6. **Utility Allocation**: Split utilities across units
7. **HMO Licensing**: Track license requirements and renewals

## Testing

Run the HMO functionality test:
```bash
node test_hmo_functionality.cjs
```

This test verifies:
- Enhanced property creation modal
- Data structure support
- Service layer integration
- Demo data examples
- Table display enhancements
- Validation logic

## Conclusion

The HMO functionality provides a comprehensive, consistent approach to managing House in Multiple Occupation properties. By requiring detailed unit information including names, areas, and target rents, the system ensures accurate rent tracking and provides property managers with the granular control they need for effective HMO management.

The implementation maintains consistency with the existing property management workflow while adding the specialized features required for multi-unit properties. This creates a seamless experience whether managing single-family homes, flats, or complex HMO properties.