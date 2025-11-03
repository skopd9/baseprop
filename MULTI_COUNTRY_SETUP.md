# Multi-Country Setup Guide

## Overview

PropertyFlow supports property management across multiple countries, with the United Kingdom as the primary, fully-featured market. Greece and USA are currently supported as placeholders with basic functionality that can be expanded based on demand.

## 🌍 Supported Countries

### United Kingdom (Primary - Fully Implemented)
**Status:** ✅ Full Support  
**Currency:** £ GBP  
**Date Format:** DD/MM/YYYY

**Full feature set including:**
- Complete compliance tracking (10 certificate types)
- UK-specific terminology (postcode, council tax, letting agent)
- UK deposit rules (5 weeks max)
- HMO support with licensing
- UK legal requirements integration
- Links to UK government resources

[→ See UK Compliance Guide](./UK_COMPLIANCE_GUIDE.md)

### Greece (Placeholder)
**Status:** 🟡 Basic Support  
**Currency:** € EUR  
**Date Format:** DD/MM/YYYY

**Current features:**
- Basic property management
- Basic tenant management
- 3 compliance types (EPC, Building Permit, Tax Clearance)
- Greek terminology support

**Future expansion planned:**
- Greek rental law specifics
- TAXISnet integration potential
- Greek lease templates
- Additional compliance requirements

### United States (Placeholder)
**Status:** 🟡 Basic Support  
**Currency:** $ USD  
**Date Format:** MM/DD/YYYY

**Current features:**
- Basic property management
- Basic tenant management
- 3 compliance types (Lead Paint, Smoke Detectors, Local Permits)
- US terminology (ZIP code, property tax)

**Future expansion planned:**
- State-specific requirements
- Fair Housing compliance
- Section 8 support
- State tax reporting

## 🚀 Getting Started

### First-Time Setup

1. **Select Your Primary Country**
   - When you first log in, you'll be asked to select your country
   - This will be your default country for all operations
   - You can change this later in Settings

2. **Add Your First Property**
   - Go to Properties → Add Property
   - Country will default to your primary country
   - Fill in country-specific fields

3. **Configure Compliance**
   - Review compliance requirements for your country
   - Add existing certificates
   - Set up renewal reminders

### Changing Your Country

**To change your default country:**
1. Go to Settings → Preferences
2. Select "Country"
3. Choose your new default country
4. Save changes

**Note:** This only changes the default for new properties. Existing properties retain their country setting.

## 🏗️ Country-Specific Features

### United Kingdom

#### Address Format
```
Address Line 1: 123 High Street
Address Line 2: Flat 4
Town/City: Manchester
County: Greater Manchester
Postcode: M1 2AB
```

#### Property Fields
- Council Tax Band (A-H)
- Council Tax Amount (Annual)
- EPC Rating (A-G, minimum E required)
- HMO License Number (if applicable)
- HMO License Expiry

#### Tenant Fields
- Right to Rent Check Status
- Right to Rent Check Date
- Right to Rent Expiry (for limited leave)
- Deposit Protection Scheme
- Deposit Certificate Number

#### Compliance Requirements
1. **Gas Safety Certificate** - Annual
2. **EICR** - Every 5 years
3. **EPC** - Every 10 years (min rating E)
4. **Deposit Protection** - Within 30 days
5. **Right to Rent** - Before tenancy
6. **Legionella Assessment** - Before tenancy
7. **Smoke Alarms** - Ongoing
8. **CO Alarms** - Ongoing
9. **Fire Safety (HMO)** - Annual
10. **HMO License** - Every 5 years

#### UK-Specific Terms
- Landlord (not lessor)
- Tenant (not renter)
- Letting Agent (not realtor)
- Council Tax (not property tax)
- Postcode (not ZIP code)
- Deposit (max 5 weeks rent)

### Greece

#### Address Format
```
Address Line 1: Aristotelous 45
Address Line 2: 3rd Floor
City: Athens
Region: Attica
Postal Code: 10431
```

#### Property Fields
- Building Permit Number
- Tax Identification Number (AFM)
- Energy Certificate Rating

#### Compliance Requirements
1. **Energy Performance Certificate**
2. **Building Permit** - Valid documentation
3. **Tax Clearance** - Annual property tax clearance

#### Greece-Specific Terms
- Landlord (Ιδιοκτήτης - Idiokti̱ti̱s)
- Tenant (Ενοικιαστής - Enoikiastí̱s)
- Rent (Ενοίκιο - Enoíkio)
- Deposit (Εγγύηση - Engýi̱si̱)
- Property Tax (ΕΝΦΙΑ - ENFIA)

### United States

#### Address Format
```
Street Address: 789 Main Street
Apartment/Unit: Apt 4B
City: Austin
State: Texas
ZIP Code: 78701
```

#### Property Fields
- Property Tax (Annual)
- HOA Fees (if applicable)
- Lead Paint Disclosure Required (pre-1978 buildings)

#### Compliance Requirements
1. **Lead Paint Disclosure** - For properties built before 1978
2. **Smoke Detector Compliance** - As per local code
3. **Local Permits** - Varies by municipality

**Note:** Requirements vary significantly by state and locality. Consult local regulations.

#### US-Specific Terms
- Landlord (or lessor)
- Tenant (or renter)
- Realtor/Property Manager
- Property Tax (not council tax)
- ZIP Code (not postcode)
- Security Deposit

## 💰 Currency and Formatting

### Currency Display

**UK:**
- Format: £1,234.56
- Symbol before amount
- Comma as thousand separator
- Decimal point for pence

**Greece:**
- Format: 1.234,56€
- Symbol after amount
- Dot as thousand separator
- Comma for cents

**USA:**
- Format: $1,234.56
- Symbol before amount
- Comma as thousand separator
- Decimal point for cents

### Date Formats

**UK & Greece:**
- Format: DD/MM/YYYY
- Example: 25/12/2024
- Input placeholder: dd/mm/yyyy

**USA:**
- Format: MM/DD/YYYY
- Example: 12/25/2024
- Input placeholder: mm/dd/yyyy

### Phone Numbers

**UK:**
- Format: 020 1234 5678 or +44 20 1234 5678
- Country code: +44

**Greece:**
- Format: 21 1234 5678 or +30 21 1234 5678
- Country code: +30

**USA:**
- Format: (512) 123-4567 or +1 512 123 4567
- Country code: +1

## 🔧 Technical Implementation

### For Developers

PropertyFlow uses a country configuration system located in `src/lib/countries.ts`:

```typescript
import { CountryCode, getCountryConfig } from '../lib/countries';

// Get config for a specific country
const ukConfig = getCountryConfig('UK');

// Access country-specific data
const currencySymbol = ukConfig.currency.symbol; // £
const dateFormat = ukConfig.dateFormat; // DD/MM/YYYY
const compliance = ukConfig.compliance; // Array of requirements
```

### Formatters

Country-specific formatters in `src/lib/formatters.ts`:

```typescript
import { formatCurrency, formatDate, formatPostalCode } from '../lib/formatters';

// Currency formatting
formatCurrency(1200.50, 'UK'); // £1,200.50
formatCurrency(1200.50, 'GR'); // 1.200,50€
formatCurrency(1200.50, 'US'); // $1,200.50

// Date formatting
formatDate('2024-12-25', 'UK'); // 25/12/2024
formatDate('2024-12-25', 'US'); // 12/25/2024

// Postal code formatting
formatPostalCode('SW1A1AA', 'UK'); // SW1A 1AA
formatPostalCode('78701', 'US'); // 78701
```

## 📝 Adding a New Country

### Step 1: Update Country Configuration

Edit `src/lib/countries.ts`:

```typescript
const newCountryConfig: CountryConfig = {
  code: 'XX',
  name: 'New Country',
  currency: {
    symbol: '$',
    code: 'XXX',
    position: 'before'
  },
  dateFormat: 'DD/MM/YYYY',
  // ... rest of config
};
```

### Step 2: Add Compliance Requirements

Define country-specific compliance:

```typescript
compliance: [
  {
    id: 'country_specific_cert',
    name: 'Country Certificate',
    description: 'Description',
    frequency: 'annual',
    mandatory: true,
    appliesToStandard: true,
    appliesToHMO: true
  }
]
```

### Step 3: Update Types

Add compliance types to `src/types/index.ts`:

```typescript
export type NewCountryComplianceType =
  | 'cert_type_1'
  | 'cert_type_2';
```

### Step 4: Update UI Components

Update forms and displays to handle new country:
- Add country to selection dropdowns
- Update form validation
- Add country-specific help text

### Step 5: Test Thoroughly

- Test property creation
- Test tenant creation
- Test compliance tracking
- Verify formatting (currency, dates, etc.)
- Check all user-facing text

## 🚦 Country Expansion Roadmap

### Phase 1: Current (UK Primary)
- ✅ UK fully implemented
- ✅ Greece basic support
- ✅ USA basic support

### Phase 2: Near-term
- 🔄 Expand Greece compliance
- 🔄 Expand USA state-specific features
- 🔄 Add Ireland
- 🔄 Add Australia

### Phase 3: Future
- ⏳ France
- ⏳ Germany
- ⏳ Spain
- ⏳ Canada
- ⏳ New Zealand

*Based on user demand and market research*

## 🤝 Contributing Country-Specific Knowledge

If you have expertise in landlord regulations for a specific country:

1. **Compliance Requirements**
   - What certificates are required?
   - How often must they be renewed?
   - What are the penalties for non-compliance?

2. **Legal Terminology**
   - Proper terms for landlord/tenant
   - Deposit/rent terminology
   - Tax and fee names

3. **Standard Practices**
   - Typical lease terms
   - Standard deposit amounts
   - Common property types

4. **Local Resources**
   - Government websites
   - Regulatory bodies
   - Landlord associations

**Contact:** Submit via GitHub issues or email support@propertyflow.com

## ⚠️ Important Notes

### Legal Compliance
- PropertyFlow provides tools for tracking compliance
- You are responsible for understanding and following local laws
- Consult with local legal professionals
- Keep up to date with law changes

### Data Storage
- All data is stored with country indicators
- Reports filter by country appropriately
- Multi-country portfolios supported

### Support Levels
- **UK:** Full customer support
- **Greece:** Basic support, expanding
- **USA:** Basic support, expanding
- **Other:** Contact us for custom requirements

## 📞 Support

For country-specific questions or feature requests:
- Email: support@propertyflow.com
- Documentation: [docs.propertyflow.com](https://docs.propertyflow.com)
- Community Forum: [community.propertyflow.com](https://community.propertyflow.com)

---

**Last Updated:** October 2025

