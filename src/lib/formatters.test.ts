import { describe, expect, it } from 'vitest';
import { formatDate, formatPostalCode, parseDate } from './formatters';

describe('parseDate', () => {
  it('parses UK-style dates as DD/MM/YYYY', () => {
    const result = parseDate('31/12/2025', 'UK');

    expect(result).not.toBeNull();
    expect(result?.getFullYear()).toBe(2025);
    expect(result?.getMonth()).toBe(11);
    expect(result?.getDate()).toBe(31);
  });

  it('parses US-style dates as MM/DD/YYYY', () => {
    const result = parseDate('12/31/2025', 'US');

    expect(result).not.toBeNull();
    expect(result?.getFullYear()).toBe(2025);
    expect(result?.getMonth()).toBe(11);
    expect(result?.getDate()).toBe(31);
  });

  it('returns null for impossible calendar dates', () => {
    expect(parseDate('31/02/2025', 'UK')).toBeNull();
    expect(parseDate('02/30/2025', 'US')).toBeNull();
  });
});

describe('date and postcode formatting', () => {
  it('returns a placeholder for invalid date input', () => {
    expect(formatDate('not-a-date', 'UK')).toBe('-');
  });

  it('formats UK and US postal codes consistently', () => {
    expect(formatPostalCode('sw1a1aa', 'UK')).toBe('SW1A 1AA');
    expect(formatPostalCode('123456789', 'US')).toBe('12345-6789');
  });
});
