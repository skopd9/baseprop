import { useOrganization } from '../contexts/OrganizationContext';
import { CountryCode } from '../types';
import { formatCurrency as formatCurrencyUtil, getCurrencySymbol } from '../lib/formatters';

/**
 * Hook to get current organization's currency information
 */
export function useCurrency() {
  const { currentOrganization } = useOrganization();
  
  // Get country code from organization, default to UK
  const countryCode: CountryCode = (currentOrganization?.country_code as CountryCode) || 'UK';
  
  /**
   * Format currency amount using workspace country
   */
  const formatCurrency = (amount: number | undefined | null): string => {
    return formatCurrencyUtil(amount, countryCode);
  };
  
  /**
   * Get currency symbol for workspace (£, $, €)
   */
  const currencySymbol = getCurrencySymbol(countryCode);
  
  /**
   * Get currency code (GBP, USD, EUR)
   */
  const currencyCode = countryCode === 'UK' ? 'GBP' : countryCode === 'US' ? 'USD' : 'EUR';
  
  return {
    countryCode,
    currencySymbol,
    currencyCode,
    formatCurrency,
  };
}

