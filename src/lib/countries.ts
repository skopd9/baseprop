// Multi-Country Support for Property Management System
// UK (Primary), Greece and USA (Placeholders)

export type CountryCode = 'UK' | 'GR' | 'US';

export interface ComplianceRequirement {
  id: string;
  name: string;
  description: string;
  frequency: 'annual' | 'biennial' | '5_years' | '10_years' | 'once' | 'as_needed';
  mandatory: boolean;
  appliesToHMO?: boolean;
  appliesToStandard?: boolean;
}

export interface CountryConfig {
  code: CountryCode;
  name: string;
  currency: {
    symbol: string;
    code: string;
    position: 'before' | 'after'; // e.g., £100 vs 100€
  };
  dateFormat: string; // Display format
  dateFormatPlaceholder: string; // For input placeholders
  addressFormat: {
    line1Label: string;
    line2Label: string;
    cityLabel: string;
    stateLabel: string;
    postalCodeLabel: string;
    countryLabel: string;
  };
  terminology: {
    landlord: string;
    tenant: string;
    rent: string;
    deposit: string;
    agent: string;
    propertyTax: string;
    postcode: string;
  };
  depositRules: {
    maxWeeks?: number; // e.g., 5 weeks for UK
    description: string;
  };
  compliance: ComplianceRequirement[];
}

// UK Configuration (Primary - Fully Implemented)
const ukConfig: CountryConfig = {
  code: 'UK',
  name: 'United Kingdom',
  currency: {
    symbol: '£',
    code: 'GBP',
    position: 'before'
  },
  dateFormat: 'DD/MM/YYYY',
  dateFormatPlaceholder: 'dd/mm/yyyy',
  addressFormat: {
    line1Label: 'Address Line 1',
    line2Label: 'Address Line 2',
    cityLabel: 'Town/City',
    stateLabel: 'County',
    postalCodeLabel: 'Postcode',
    countryLabel: 'Country'
  },
  terminology: {
    landlord: 'Landlord',
    tenant: 'Tenant',
    rent: 'Rent',
    deposit: 'Deposit',
    agent: 'Letting Agent',
    propertyTax: 'Council Tax',
    postcode: 'Postcode'
  },
  depositRules: {
    maxWeeks: 5,
    description: 'Maximum 5 weeks rent (Tenant Fees Act 2019)'
  },
  compliance: [
    {
      id: 'gas_safety',
      name: 'Gas Safety Certificate',
      description: 'Annual gas safety check by Gas Safe registered engineer',
      frequency: 'annual',
      mandatory: true,
      appliesToStandard: true,
      appliesToHMO: true
    },
    {
      id: 'eicr',
      name: 'EICR (Electrical Installation Condition Report)',
      description: 'Electrical safety inspection',
      frequency: '5_years',
      mandatory: true,
      appliesToStandard: true,
      appliesToHMO: true
    },
    {
      id: 'epc',
      name: 'EPC (Energy Performance Certificate)',
      description: 'Energy efficiency rating, minimum E required',
      frequency: '10_years',
      mandatory: true,
      appliesToStandard: true,
      appliesToHMO: true
    },
    {
      id: 'deposit_protection',
      name: 'Deposit Protection',
      description: 'Protect tenant deposit in government-approved scheme within 30 days',
      frequency: 'once',
      mandatory: true,
      appliesToStandard: true,
      appliesToHMO: true
    },
    {
      id: 'right_to_rent',
      name: 'Right to Rent Check',
      description: 'Verify tenant has legal right to rent in the UK',
      frequency: 'once',
      mandatory: true,
      appliesToStandard: true,
      appliesToHMO: true
    },
    {
      id: 'legionella',
      name: 'Legionella Risk Assessment',
      description: 'Water safety risk assessment',
      frequency: 'as_needed',
      mandatory: true,
      appliesToStandard: true,
      appliesToHMO: true
    },
    {
      id: 'smoke_alarms',
      name: 'Smoke Alarm Certificate',
      description: 'Working smoke alarms on every floor',
      frequency: 'annual',
      mandatory: true,
      appliesToStandard: true,
      appliesToHMO: true
    },
    {
      id: 'co_alarms',
      name: 'Carbon Monoxide Alarm Certificate',
      description: 'CO alarms in rooms with solid fuel appliances',
      frequency: 'annual',
      mandatory: true,
      appliesToStandard: true,
      appliesToHMO: true
    },
    {
      id: 'fire_safety_hmo',
      name: 'Fire Safety Certificate (HMO)',
      description: 'Enhanced fire safety measures for HMOs',
      frequency: 'annual',
      mandatory: true,
      appliesToHMO: true,
      appliesToStandard: false
    },
    {
      id: 'hmo_license',
      name: 'HMO License',
      description: 'Mandatory license for Houses in Multiple Occupation',
      frequency: '5_years',
      mandatory: true,
      appliesToHMO: true,
      appliesToStandard: false
    }
  ]
};

// Greece Configuration (Placeholder)
const greeceConfig: CountryConfig = {
  code: 'GR',
  name: 'Greece',
  currency: {
    symbol: '€',
    code: 'EUR',
    position: 'after'
  },
  dateFormat: 'DD/MM/YYYY',
  dateFormatPlaceholder: 'dd/mm/yyyy',
  addressFormat: {
    line1Label: 'Address Line 1',
    line2Label: 'Address Line 2',
    cityLabel: 'City',
    stateLabel: 'Region',
    postalCodeLabel: 'Postal Code',
    countryLabel: 'Country'
  },
  terminology: {
    landlord: 'Landlord (Ιδιοκτήτης)',
    tenant: 'Tenant (Ενοικιαστής)',
    rent: 'Rent (Ενοίκιο)',
    deposit: 'Deposit (Εγγύηση)',
    agent: 'Estate Agent (Μεσίτης)',
    propertyTax: 'Property Tax (ΕΝΦΙΑ)',
    postcode: 'Postal Code (Ταχ. Κώδικας)'
  },
  depositRules: {
    description: 'Typically 1-2 months rent'
  },
  compliance: [
    {
      id: 'epc_greece',
      name: 'Energy Performance Certificate',
      description: 'Energy efficiency certificate required for rental properties',
      frequency: '10_years',
      mandatory: true,
      appliesToStandard: true,
      appliesToHMO: true
    },
    {
      id: 'building_permit',
      name: 'Building Permit',
      description: 'Valid building permit documentation',
      frequency: 'as_needed',
      mandatory: true,
      appliesToStandard: true,
      appliesToHMO: true
    },
    {
      id: 'tax_clearance',
      name: 'Tax Clearance Certificate',
      description: 'Property tax clearance',
      frequency: 'annual',
      mandatory: true,
      appliesToStandard: true,
      appliesToHMO: true
    }
  ]
};

// USA Configuration (Placeholder)
const usaConfig: CountryConfig = {
  code: 'US',
  name: 'United States',
  currency: {
    symbol: '$',
    code: 'USD',
    position: 'before'
  },
  dateFormat: 'MM/DD/YYYY',
  dateFormatPlaceholder: 'mm/dd/yyyy',
  addressFormat: {
    line1Label: 'Street Address',
    line2Label: 'Apartment/Unit',
    cityLabel: 'City',
    stateLabel: 'State',
    postalCodeLabel: 'ZIP Code',
    countryLabel: 'Country'
  },
  terminology: {
    landlord: 'Landlord',
    tenant: 'Tenant',
    rent: 'Rent',
    deposit: 'Security Deposit',
    agent: 'Realtor/Property Manager',
    propertyTax: 'Property Tax',
    postcode: 'ZIP Code'
  },
  depositRules: {
    description: 'Varies by state, typically 1-2 months rent'
  },
  compliance: [
    {
      id: 'lead_paint',
      name: 'Lead Paint Disclosure',
      description: 'Required for properties built before 1978',
      frequency: 'once',
      mandatory: true,
      appliesToStandard: true,
      appliesToHMO: true
    },
    {
      id: 'smoke_detectors_us',
      name: 'Smoke Detector Compliance',
      description: 'Working smoke detectors as per local code',
      frequency: 'annual',
      mandatory: true,
      appliesToStandard: true,
      appliesToHMO: true
    },
    {
      id: 'local_permits',
      name: 'Local Permits',
      description: 'Rental permits as required by municipality',
      frequency: 'annual',
      mandatory: false,
      appliesToStandard: true,
      appliesToHMO: true
    }
  ]
};

// Country configurations map
export const COUNTRIES: Record<CountryCode, CountryConfig> = {
  UK: ukConfig,
  GR: greeceConfig,
  US: usaConfig
};

// Default country
export const DEFAULT_COUNTRY: CountryCode = 'UK';

// Helper functions
export function getCountryConfig(countryCode: CountryCode = DEFAULT_COUNTRY): CountryConfig {
  return COUNTRIES[countryCode] || COUNTRIES[DEFAULT_COUNTRY];
}

export function getCountryName(countryCode: CountryCode): string {
  return COUNTRIES[countryCode]?.name || 'United Kingdom';
}

export function getCountryCurrency(countryCode: CountryCode): string {
  return COUNTRIES[countryCode]?.currency.symbol || '£';
}

export function getCountryList(): { code: CountryCode; name: string }[] {
  return Object.values(COUNTRIES).map(country => ({
    code: country.code,
    name: country.name
  }));
}

export function getComplianceRequirements(
  countryCode: CountryCode,
  isHMO: boolean = false
): ComplianceRequirement[] {
  const country = getCountryConfig(countryCode);
  return country.compliance.filter(req => 
    isHMO ? req.appliesToHMO : req.appliesToStandard
  );
}

