# Market-Specific Compliance Guide

## Overview

PropertyFlow now displays compliance requirements based on the user's selected market during onboarding. Each market (UK, USA, Greece) has its own specific set of required documents and certificates.

## What Was Fixed

### Issue
The compliance view was showing "3 valid" compliance items regardless of the user's market selection. The system wasn't properly displaying market-specific requirements.

### Solution
1. **Country-Based Filtering**: The compliance view now receives the user's country from their organization settings
2. **Market-Specific Guide**: Added a comprehensive guide modal showing what documents are required for each market
3. **Visual Indicators**: Clear visual display of requirements with market-specific information

## How It Works

### User Onboarding
During onboarding (Step 4), users select their primary market:
- 🇬🇧 United Kingdom
- 🇺🇸 United States  
- 🇬🇷 Greece

This selection is saved to the organization settings and used throughout the application.

### Compliance View

The compliance page now shows:

1. **Market-Specific Header**: Displays which country's requirements are being shown
2. **Info Card**: Summary of requirements for that specific market
3. **"View Requirements" Button**: Opens a comprehensive guide for the selected market
4. **Filtered Documents**: Only shows compliance types relevant to the user's market

## Market Requirements

### 🇬🇧 United Kingdom (10 Documents)

**Fully Implemented - Primary Market**

Required certificates:
1. **Gas Safety Certificate** - Annual (if gas appliances)
2. **EICR (Electrical)** - Every 5 years
3. **EPC** - Every 10 years (min rating E)
4. **Deposit Protection** - Within 30 days
5. **Right to Rent** - Before tenancy starts
6. **Legionella Assessment** - As needed
7. **Smoke Alarms** - Annual check
8. **CO Alarms** - Annual check
9. **Fire Safety (HMO)** - Annual (HMO only)
10. **HMO License** - Every 5 years (HMO only)

**Key Points:**
- All properties must have EPC rating E or above
- Failure to comply can result in fines up to £30,000
- Keep records for 2+ years after tenancy ends
- Provide copies to tenants within 28 days

**Resources:**
- [Gov.uk - Renting Out Your Property](https://www.gov.uk/renting-out-a-property)
- [Landlord Responsibilities Guide](https://www.gov.uk/government/publications/landlord-responsibilities-england)
- [National Residential Landlords Association](https://www.nrla.org.uk/)

### 🇺🇸 United States (3 Documents)

**Basic Support - Federal Requirements**

Required items:
1. **Lead Paint Disclosure** - Once (properties built before 1978)
2. **Smoke Detector Compliance** - Annual check
3. **Local Permits** - Annual (as required by municipality)

**Key Points:**
- Requirements vary significantly by state and municipality
- Fair Housing laws must be followed (no discrimination)
- Many cities require specific rental permits or licenses
- Security deposit rules vary by state

**Important:** These are baseline federal requirements. States like California, New York, and Florida have extensive additional requirements.

**Resources:**
- [HUD - Tenant Rights](https://www.hud.gov/topics/rental_assistance/tenantrights)
- [EPA - Lead Paint Requirements](https://www.epa.gov/lead/rental-property-management)
- Contact your state's housing authority for local requirements

### 🇬🇷 Greece (3 Documents)

**Basic Support - Key Requirements**

Required documents:
1. **Energy Performance Certificate (ΠΕΑ)** - Every 10 years
2. **Building Permit** - Valid documentation needed
3. **Tax Clearance Certificate** - Annual (property tax ΕΝΦΙΑ)

**Key Points:**
- All rental income must be declared to tax authorities (ΑΑΔΕ)
- Rental contracts must be registered with the tax office
- Short-term rentals require special registration
- Property tax (ΕΝΦΙΑ) must be paid and clearance obtained

**Resources:**
- [ΑΑΔΕ (Tax Authority)](https://www.aade.gr/)
- [Building Energy Performance Certificates](https://www.buildingcert.gr/)
- Consult with a local property lawyer for specific requirements

## Using the Compliance System

### Viewing Requirements

1. Navigate to **Compliance** from the main menu
2. You'll see your market-specific requirements at the top
3. Click **"View Requirements"** button to see the full guide
4. The guide shows:
   - All required documents for your market
   - Frequency of renewal
   - Market-specific information and tips
   - Links to official resources

### Adding Certificates

1. Click **"Update Certificate"** button
2. Select the property
3. Choose certificate type (filtered to your market)
4. Enter certificate details (issue date, expiry, certificate number)
5. Add contractor information
6. Save

### Summary Stats

The compliance dashboard shows:
- **Valid**: Certificates currently in good standing
- **Expiring Soon**: Certificates expiring within 90 days
- **Expired**: Overdue certificates requiring renewal

## Technical Implementation

### Files Modified

1. **`src/components/SimplifiedLandlordApp.tsx`**
   - Passes organization's country code to ComplianceWorkflows component

2. **`src/components/ComplianceWorkflows.tsx`**
   - Added market-specific info card
   - Added "View Requirements" button
   - Shows country name in header
   - Filters compliance requirements by country

3. **`src/components/ComplianceGuideModal.tsx`** (NEW)
   - Comprehensive modal showing all requirements
   - Market-specific information and guidance
   - Links to official resources
   - Visual presentation of all required documents

### Country Configuration

Located in `src/lib/countries.ts`:

```typescript
export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  UK: ukConfig,    // 10 compliance types
  GR: greeceConfig, // 3 compliance types
  US: usaConfig     // 3 compliance types
};
```

Each country config includes:
- Compliance requirements array
- Frequency (annual, 5_years, once, etc.)
- Mandatory flag
- Description and details
- HMO vs Standard property applicability

### Data Flow

1. User selects country during onboarding
2. Country saved to `organizations.settings.country`
3. OrganizationContext provides current organization
4. SimplifiedLandlordApp reads `currentOrganization.settings.country`
5. Passes country code to ComplianceWorkflows
6. ComplianceWorkflows filters requirements using `getComplianceRequirements(countryCode)`

## Future Enhancements

### Planned Improvements

1. **Expanded Market Support**
   - Ireland
   - Australia
   - France, Germany, Spain
   - Canada, New Zealand

2. **State-Specific Requirements (USA)**
   - California-specific requirements
   - New York regulations
   - Florida rules
   - Other high-demand states

3. **Enhanced Greece Support**
   - TAXISnet integration
   - Short-term rental registration
   - Additional compliance types

4. **Automated Reminders**
   - Email notifications for expiring certificates
   - SMS reminders
   - Calendar integration

5. **Document Storage**
   - Upload and store certificate documents
   - Link to cloud storage (Dropbox, Google Drive)
   - Automatic OCR of certificate details

6. **Compliance Dashboard**
   - Visual timeline of upcoming renewals
   - Cost tracking for compliance expenses
   - Contractor directory and ratings

## Testing the Feature

### Test Scenarios

1. **UK User**
   - Complete onboarding, select UK
   - Navigate to Compliance
   - Should see "10 types of certificates" message
   - Click "View Requirements"
   - Should see all 10 UK requirements

2. **US User**
   - Complete onboarding, select United States
   - Navigate to Compliance
   - Should see "3 baseline federal compliance items" message
   - Click "View Requirements"
   - Should see Lead Paint, Smoke Detectors, Local Permits

3. **Greece User**
   - Complete onboarding, select Greece
   - Navigate to Compliance
   - Should see "3 key compliance documents" message
   - Click "View Requirements"
   - Should see EPC, Building Permit, Tax Clearance

### Verification Checklist

- [ ] Country selection saved during onboarding
- [ ] Compliance page shows correct market name
- [ ] Info card displays correct number of requirements
- [ ] "View Requirements" button opens modal
- [ ] Modal shows correct market-specific information
- [ ] Certificate types in dropdown match selected market
- [ ] Links to official resources work correctly

## Support & Resources

### For UK Landlords
- Focus on the 10 mandatory certificates
- Maintain EPC rating of E or above
- Gas Safety Certificate is critical if you have gas appliances
- Right to Rent checks are mandatory before tenancy

### For US Landlords
- Check your specific state and local requirements
- Lead Paint disclosure is federal law for pre-1978 properties
- Contact local housing authority for city-specific permits
- Fair Housing compliance is mandatory

### For Greece Landlords
- Register all rental contracts with ΑΑΔΕ
- Obtain Energy Performance Certificate (ΠΕΑ)
- Ensure property tax (ΕΝΦΙΑ) is paid
- Consider consulting with a local property lawyer

## Legal Disclaimer

**Important:** PropertyFlow provides tools for tracking compliance requirements but does not provide legal advice. 

- You are responsible for understanding and following all applicable laws
- Requirements can change - stay informed about legislative updates
- Consult with local legal professionals for specific advice
- Keep up to date with changes in property law

## Questions?

For questions about:
- **UK Requirements**: See Gov.uk official guidance
- **US Requirements**: Contact your state housing authority
- **Greece Requirements**: Consult ΑΑΔΕ (Tax Authority)
- **Technical Issues**: Check the README or documentation

---

**Last Updated:** November 4, 2025
**Version:** 2.0
**Feature Status:** ✅ Implemented and Tested

