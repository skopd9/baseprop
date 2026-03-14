import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatPostalCode,
  calculateMaxDeposit,
} from './formatters';
import {
  getComplianceRequirements,
  getCountryConfig,
  getCountryList,
  type CountryCode,
} from './countries';

describe('countries and formatters regression coverage', () => {
  it('filters UK compliance requirements by HMO flag', () => {
    const standard = getComplianceRequirements('UK', false).map(req => req.id);
    const hmo = getComplianceRequirements('UK', true).map(req => req.id);

    expect(standard).toContain('gas_safety');
    expect(standard).not.toContain('hmo_license');

    expect(hmo).toContain('gas_safety');
    expect(hmo).toContain('hmo_license');
    expect(hmo).toContain('fire_safety_hmo');
  });

  it('returns a stable country list with unique codes', () => {
    const codes = getCountryList().map(country => country.code);
    const uniqueCodes = new Set(codes);

    expect(uniqueCodes.size).toBe(codes.length);
    expect(codes).toEqual(expect.arrayContaining(['UK', 'GR', 'US', 'SA']));
  });

  it('falls back to the default config for unknown country values', () => {
    const config = getCountryConfig('ZZ' as CountryCode);
    expect(config.code).toBe('UK');
    expect(config.currency.symbol).toBe('£');
  });

  it('formats currency symbol placement per country', () => {
    const uk = formatCurrency(1234.5, 'UK');
    const greece = formatCurrency(1234.5, 'GR');

    expect(uk.startsWith('£')).toBe(true);
    expect(greece.endsWith('€')).toBe(true);
    expect(formatCurrency(null, 'UK')).toBe('-');
  });

  it('formats dates using country-specific ordering', () => {
    const sample = new Date('2026-03-14T12:00:00.000Z');

    expect(formatDate(sample, 'US')).toBe('03/14/2026');
    expect(formatDate(sample, 'UK')).toBe('14/03/2026');
    expect(formatDate('invalid-date', 'UK')).toBe('-');
  });

  it('normalizes postal codes and UK deposit ceiling calculations', () => {
    expect(formatPostalCode('sw1a1aa', 'UK')).toBe('SW1A 1AA');
    expect(formatPostalCode('123456789', 'US')).toBe('12345-6789');
    expect(calculateMaxDeposit(2000, 'UK')).toBe(2500);
    expect(calculateMaxDeposit(2000, 'US')).toBeNull();
  });
});
