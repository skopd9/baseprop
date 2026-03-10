import { describe, expect, it, vi } from 'vitest';

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

import { RentPaymentService } from './RentPaymentService';

describe('RentPaymentService', () => {
  describe('calculateProRatedAmount', () => {
    it('calculates amount and days for a partial 31-day month', () => {
      const result = RentPaymentService.calculateProRatedAmount(
        3100,
        new Date(2026, 0, 15),
        new Date(2026, 1, 1)
      );

      expect(result).toEqual({ amount: 1700, days: 17 });
    });
  });

  describe('generatePaymentPeriods', () => {
    it('creates first and last pro-rated periods with full periods in-between', () => {
      const periods = RentPaymentService.generatePaymentPeriods(
        'tenant-1',
        'property-1',
        new Date(2026, 0, 15),
        new Date(2026, 2, 15),
        3100,
        1
      );

      expect(periods).toHaveLength(3);

      expect(periods[0]).toMatchObject({
        isProRated: true,
        proRateDays: 17,
        amountDue: 1700,
      });
      expect(periods[0].periodStart).toEqual(new Date(2026, 0, 15));
      expect(periods[0].periodEnd).toEqual(new Date(2026, 1, 1));

      expect(periods[1]).toMatchObject({
        isProRated: false,
        proRateDays: undefined,
        amountDue: 3100,
      });
      expect(periods[1].periodStart).toEqual(new Date(2026, 1, 1));
      expect(periods[1].periodEnd).toEqual(new Date(2026, 2, 1));

      expect(periods[2]).toMatchObject({
        isProRated: true,
        proRateDays: 14,
        amountDue: 1400,
      });
      expect(periods[2].periodStart).toEqual(new Date(2026, 2, 1));
      expect(periods[2].periodEnd).toEqual(new Date(2026, 2, 15));
    });

    it('creates only full-month periods when lease aligns to due day boundaries', () => {
      const periods = RentPaymentService.generatePaymentPeriods(
        'tenant-1',
        'property-1',
        new Date(2026, 0, 1),
        new Date(2026, 3, 1),
        3100,
        1
      );

      expect(periods).toHaveLength(3);
      expect(periods.every((period) => period.isProRated === false)).toBe(true);
      expect(periods.every((period) => period.amountDue === 3100)).toBe(true);
    });

    it('returns no periods for non-monthly payment frequencies', () => {
      const periods = RentPaymentService.generatePaymentPeriods(
        'tenant-1',
        'property-1',
        new Date(2026, 0, 1),
        new Date(2026, 6, 1),
        3100,
        1,
        'quarterly'
      );

      expect(periods).toEqual([]);
    });
  });
});
