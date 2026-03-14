import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rateLimitService } from './RateLimitService';

describe('RateLimitService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-15T10:00:00.000Z'));
    localStorage.clear();
    rateLimitService.reset();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('blocks sends after hitting the per-minute limit and recovers after a minute', () => {
    for (let i = 0; i < 5; i += 1) {
      rateLimitService.recordEmailSent();
    }

    const blocked = rateLimitService.canSendEmail();
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toContain('per minute');
    expect(blocked.retryAfter).toBeGreaterThan(0);

    vi.advanceTimersByTime(61_000);
    const recovered = rateLimitService.canSendEmail();
    expect(recovered.allowed).toBe(true);
  });

  it('blocks sends after hitting the per-hour limit', () => {
    for (let i = 0; i < 50; i += 1) {
      rateLimitService.recordEmailSent();
      vi.advanceTimersByTime(61_000);
    }

    const blocked = rateLimitService.canSendEmail();
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toContain('per hour');
    expect(blocked.retryAfter).toBeGreaterThan(0);
  });

  it('enforces daily limits independently of minute/hour windows', () => {
    const service = rateLimitService as any;
    const now = Date.now();
    const twoHoursAgo = now - 2 * 60 * 60 * 1000;

    service.state.emailsSentLastMinute = [];
    service.state.emailsSentLastHour = [];
    service.state.emailsSentToday = Array.from({ length: 100 }, (_, index) => twoHoursAgo - index * 1000);
    service.state.lastResetDate = new Date(now).toISOString();

    const blocked = rateLimitService.canSendEmail();
    expect(blocked.allowed).toBe(false);
    expect(blocked.reason).toContain('Daily limit reached');
  });

  it('resets daily counters when crossing to a new day', () => {
    const service = rateLimitService as any;

    service.state.emailsSentLastMinute = [];
    service.state.emailsSentLastHour = [];
    service.state.emailsSentToday = [Date.now() - 1000];
    service.state.lastResetDate = '2026-01-14T12:00:00.000Z';

    const stats = rateLimitService.getUsageStats();
    expect(stats.today).toBe(0);
    expect(stats.remainingToday).toBe(stats.limits.maxEmailsPerDay);
  });

  it('detects resend-like rate limit errors via helper', () => {
    const isRateLimitError = (rateLimitService.constructor as any).isRateLimitError as (error: unknown) => boolean;

    expect(isRateLimitError({ status: 429 })).toBe(true);
    expect(isRateLimitError({ message: 'Too many requests, try later' })).toBe(true);
    expect(isRateLimitError({ name: 'RateLimitError' })).toBe(true);
    expect(isRateLimitError({ status: 500, message: 'Internal server error' })).toBe(false);
  });
});
