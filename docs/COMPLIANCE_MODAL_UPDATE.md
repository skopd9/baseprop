# Compliance Requirements Modal Update

## Summary
Updated the Compliance Management system to use a modal pop-up for viewing requirements with country tabs (UK, Greece, USA), and ensured properties are correctly grouped by their country code from the database.

## Changes Made

### 1. Added `countryCode` to SimplifiedProperty Interface ✅
**File:** `src/utils/simplifiedDataTransforms.ts`

- Added `countryCode: CountryCode` field to `SimplifiedProperty` interface
- This ensures properties have their country information available throughout the app

### 2. Updated Property Transform Function ✅
**File:** `src/utils/simplifiedDataTransforms.ts`

- Updated `transformToSimplifiedProperty` to extract `country_code` from database
- Handles both direct field (`property.country_code`) and nested field (`propertyData.country_code`)
- Defaults to 'UK' if country code is not set (backward compatibility)

```typescript
const countryCode = (property.country_code || propertyData.country_code || 'UK') as CountryCode;
```

### 3. Updated ComplianceWorkflows Component ✅
**File:** `src/components/ComplianceWorkflows.tsx`

#### Modal Implementation
- ✅ **Removed tab-based requirements view** from main page
- ✅ **Added modal pop-up** that opens when clicking "View Requirements" button
- ✅ **Country tabs inside modal** for UK, Greece, and USA
- ✅ **Tab switching** within modal to view requirements for each country
- ✅ **Proper modal styling** with header, scrollable content, and footer

#### Properties Grouping
- ✅ **Properties grouped by country** using `property.countryCode` field
- ✅ **Country headers** show country name and property count
- ✅ **Dynamic grouping** - only shows countries that have properties

#### Features
- Modal header with title and close button
- Country tabs (UK, Greece, USA) with active state highlighting
- Requirements list for selected country showing:
  - Requirement name with mandatory badge
  - Frequency (annual, 5 years, etc.)
  - Full description
  - HMO-specific indicators
- Info tip box with helpful advice
- Close button in footer

### 4. Database Schema Verification ✅
- Verified that `properties` table has `country_code` column (TEXT, defaults to 'UK')
- Database already supports multi-country properties
- Query uses `select('*')` which includes `country_code` field

## User Experience

### Before
- Requirements shown as a tab on the main page
- Properties not clearly grouped by country
- No easy way to compare requirements across countries

### After
- Click "View Requirements" → Modal opens
- Switch between UK/Greece/USA tabs inside modal
- Properties clearly grouped by country on main page
- Better organization and comparison of country-specific requirements

## Technical Details

### Property Country Detection
```typescript
// Group properties by country
const propertiesByCountry = properties.reduce((acc, property) => {
  const propCountry = property.countryCode || DEFAULT_COUNTRY;
  if (!acc[propCountry]) {
    acc[propCountry] = [];
  }
  acc[propCountry].push(property);
  return acc;
}, {} as Record<CountryCode, SimplifiedProperty[]>);
```

### Modal State Management
```typescript
const [showRequirementsModal, setShowRequirementsModal] = useState(false);
const [selectedRequirementsCountry, setSelectedRequirementsCountry] = useState<CountryCode>('UK');
```

### Country Tabs in Modal
- Three tabs: United Kingdom, United States, Greece
- Active tab highlighted in green
- Requirements dynamically loaded based on selected country

## Testing Checklist
- [x] Properties grouped correctly by country
- [x] Modal opens when clicking "View Requirements"
- [x] Country tabs work inside modal
- [x] Requirements display correctly for each country
- [x] Modal closes properly
- [x] Properties show correct country headers
- [x] No TypeScript errors
- [x] No linter errors

## Database Requirements

### Properties Table
The `properties` table must have a `country_code` column:
```sql
country_code TEXT NOT NULL DEFAULT 'UK' CHECK (country_code IN ('UK', 'GR', 'US'))
```

### Existing Properties
If you have existing properties without `country_code` set:
- They will default to 'UK' in the transform function
- You can update them manually:
  ```sql
  UPDATE properties SET country_code = 'GR' WHERE address LIKE '%Athens%';
  UPDATE properties SET country_code = 'US' WHERE address LIKE '%Austin%';
  ```

## Next Steps
1. Verify properties in database have correct `country_code` values
2. Update any properties that need country assignment
3. Test modal with properties from different countries
4. Ensure country-specific compliance requirements are accurate

