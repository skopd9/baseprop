// Country-Specific Formatters
import { CountryCode, getCountryConfig, DEFAULT_COUNTRY } from './countries';

/**
 * Format currency according to country
 */
export function formatCurrency(
  amount: number | undefined | null,
  countryCode: CountryCode = DEFAULT_COUNTRY
): string {
  if (amount === null || amount === undefined) return '-';
  
  const country = getCountryConfig(countryCode);
  const formattedAmount = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  if (country.currency.position === 'before') {
    return `${country.currency.symbol}${formattedAmount}`;
  } else {
    return `${formattedAmount}${country.currency.symbol}`;
  }
}

/**
 * Format date according to country
 */
export function formatDate(
  date: string | Date | undefined | null,
  countryCode: CountryCode = DEFAULT_COUNTRY
): string {
  if (!date) return '-';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '-';

  const day = dateObj.getDate().toString().padStart(2, '0');
  const month = (dateObj.getMonth() + 1).toString().padStart(2, '0');
  const year = dateObj.getFullYear();
  
  // US format: MM/DD/YYYY
  if (countryCode === 'US') {
    return `${month}/${day}/${year}`;
  }
  
  // UK and Greece format: DD/MM/YYYY
  return `${day}/${month}/${year}`;
}

/**
 * Parse date string according to country format
 */
export function parseDate(
  dateString: string,
  countryCode: CountryCode = DEFAULT_COUNTRY
): Date | null {
  if (!dateString) return null;

  const parts = dateString.split('/');
  if (parts.length !== 3) return null;

  let day: number, month: number, year: number;

  if (countryCode === 'US') {
    // MM/DD/YYYY
    month = parseInt(parts[0], 10);
    day = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  } else {
    // DD/MM/YYYY for UK and Greece
    day = parseInt(parts[0], 10);
    month = parseInt(parts[1], 10);
    year = parseInt(parts[2], 10);
  }

  if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
  
  const date = new Date(year, month - 1, day);
  if (isNaN(date.getTime())) return null;
  
  return date;
}

/**
 * Format address according to country
 */
export function formatAddress(
  address: {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: string;
  },
  _countryCode: CountryCode = DEFAULT_COUNTRY,
  singleLine: boolean = false
): string {
  const parts: string[] = [];

  if (address.line1) parts.push(address.line1);
  if (address.line2) parts.push(address.line2);
  if (address.city) parts.push(address.city);
  if (address.state) parts.push(address.state);
  if (address.postalCode) parts.push(address.postalCode);
  if (address.country) parts.push(address.country);

  if (singleLine) {
    return parts.join(', ');
  } else {
    return parts.join('\n');
  }
}

/**
 * Format postcode/zip code according to country conventions
 */
export function formatPostalCode(
  postalCode: string | undefined | null,
  countryCode: CountryCode = DEFAULT_COUNTRY
): string {
  if (!postalCode) return '';

  const cleaned = postalCode.toUpperCase().replace(/\s/g, '');

  switch (countryCode) {
    case 'UK':
      // UK postcode format: SW1A 1AA
      if (cleaned.length >= 5) {
        const outward = cleaned.slice(0, -3);
        const inward = cleaned.slice(-3);
        return `${outward} ${inward}`;
      }
      return cleaned;

    case 'US':
      // US ZIP code format: 12345 or 12345-6789
      if (cleaned.length === 9) {
        return `${cleaned.slice(0, 5)}-${cleaned.slice(5)}`;
      }
      return cleaned;

    case 'GR':
      // Greece postal code: 5 digits
      return cleaned;

    default:
      return cleaned;
  }
}

/**
 * Get currency symbol for country
 */
export function getCurrencySymbol(countryCode: CountryCode = DEFAULT_COUNTRY): string {
  const country = getCountryConfig(countryCode);
  return country.currency.symbol;
}

/**
 * Get postal code label for country
 */
export function getPostalCodeLabel(countryCode: CountryCode = DEFAULT_COUNTRY): string {
  const country = getCountryConfig(countryCode);
  return country.terminology.postcode;
}

/**
 * Get date format placeholder for country
 */
export function getDateFormatPlaceholder(countryCode: CountryCode = DEFAULT_COUNTRY): string {
  const country = getCountryConfig(countryCode);
  return country.dateFormatPlaceholder;
}

/**
 * Format phone number (basic, can be enhanced per country)
 */
export function formatPhoneNumber(
  phone: string | undefined | null,
  countryCode: CountryCode = DEFAULT_COUNTRY
): string {
  if (!phone) return '';
  
  // Basic formatting - can be enhanced with country-specific logic
  const cleaned = phone.replace(/\D/g, '');
  
  switch (countryCode) {
    case 'UK':
      // UK format: +44 20 1234 5678 or 020 1234 5678
      if (cleaned.startsWith('44')) {
        return `+44 ${cleaned.slice(2, 4)} ${cleaned.slice(4, 8)} ${cleaned.slice(8)}`;
      } else if (cleaned.startsWith('0')) {
        return `${cleaned.slice(0, 3)} ${cleaned.slice(3, 7)} ${cleaned.slice(7)}`;
      }
      return phone;

    case 'US':
      // US format: (123) 456-7890
      if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 3)}) ${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
      }
      return phone;

    case 'GR':
      // Greece format: basic
      return phone;

    default:
      return phone;
  }
}

/**
 * Calculate maximum deposit based on country rules
 */
export function calculateMaxDeposit(
  monthlyRent: number,
  countryCode: CountryCode = DEFAULT_COUNTRY
): number | null {
  const country = getCountryConfig(countryCode);
  
  if (country.depositRules.maxWeeks) {
    // Convert weekly limit to monthly equivalent
    return (monthlyRent / 4) * country.depositRules.maxWeeks;
  }
  
  return null;
}

/**
 * Get deposit rules description
 */
export function getDepositRulesDescription(countryCode: CountryCode = DEFAULT_COUNTRY): string {
  const country = getCountryConfig(countryCode);
  return country.depositRules.description;
}

/**
 * Format rent frequency (for future multi-frequency support)
 */
export function formatRentFrequency(
  frequency: 'monthly' | 'weekly' | 'quarterly' | 'annual' = 'monthly'
): string {
  switch (frequency) {
    case 'monthly':
      return 'per month';
    case 'weekly':
      return 'per week';
    case 'quarterly':
      return 'per quarter';
    case 'annual':
      return 'per year';
    default:
      return '';
  }
}

/**
 * Format percentage
 */
export function formatPercentage(value: number | undefined | null): string {
  if (value === null || value === undefined) return '-';
  return `${value.toFixed(1)}%`;
}

/**
 * Format number with thousand separators
 */
export function formatNumber(value: number | undefined | null): string {
  if (value === null || value === undefined) return '-';
  return value.toLocaleString();
}

