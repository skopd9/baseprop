/**
 * Rate Limit Service
 * Handles email rate limiting to prevent exceeding Resend API limits
 * 
 * Resend Free Plan Limits:
 * - 100 emails per day
 * - 3,000 emails per month
 */

interface RateLimitConfig {
  maxEmailsPerMinute: number;
  maxEmailsPerHour: number;
  maxEmailsPerDay: number;
}

interface RateLimitState {
  emailsSentLastMinute: number[];
  emailsSentLastHour: number[];
  emailsSentToday: number[];
  lastResetDate: string;
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxEmailsPerMinute: 5,   // Conservative limit to avoid bursts
  maxEmailsPerHour: 50,    // Half the daily limit
  maxEmailsPerDay: 100     // Resend free plan limit
};

class RateLimitService {
  private config: RateLimitConfig;
  private state: RateLimitState;
  private storageKey = 'email_rate_limit_state';

  constructor(config: Partial<RateLimitConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = this.loadState();
    this.cleanupOldEntries();
  }

  /**
   * Check if we can send an email without exceeding rate limits
   */
  canSendEmail(): { allowed: boolean; reason?: string; retryAfter?: number } {
    this.cleanupOldEntries();

    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;
    const todayStart = new Date().setHours(0, 0, 0, 0);

    // Check minute limit
    const emailsLastMinute = this.state.emailsSentLastMinute.filter(time => time > oneMinuteAgo).length;
    if (emailsLastMinute >= this.config.maxEmailsPerMinute) {
      const oldestEmail = Math.min(...this.state.emailsSentLastMinute);
      const retryAfter = Math.ceil((oldestEmail + 60 * 1000 - now) / 1000);
      return {
        allowed: false,
        reason: `Rate limit: Maximum ${this.config.maxEmailsPerMinute} emails per minute. Please wait ${retryAfter} seconds.`,
        retryAfter
      };
    }

    // Check hour limit
    const emailsLastHour = this.state.emailsSentLastHour.filter(time => time > oneHourAgo).length;
    if (emailsLastHour >= this.config.maxEmailsPerHour) {
      const oldestEmail = Math.min(...this.state.emailsSentLastHour);
      const retryAfter = Math.ceil((oldestEmail + 60 * 60 * 1000 - now) / 1000);
      return {
        allowed: false,
        reason: `Rate limit: Maximum ${this.config.maxEmailsPerHour} emails per hour. Please wait ${Math.ceil(retryAfter / 60)} minutes.`,
        retryAfter
      };
    }

    // Check daily limit
    const emailsToday = this.state.emailsSentToday.filter(time => time > todayStart).length;
    if (emailsToday >= this.config.maxEmailsPerDay) {
      const tomorrow = new Date();
      tomorrow.setHours(24, 0, 0, 0);
      const retryAfter = Math.ceil((tomorrow.getTime() - now) / 1000);
      return {
        allowed: false,
        reason: `Daily limit reached: ${this.config.maxEmailsPerDay} emails sent today. Resets at midnight.`,
        retryAfter
      };
    }

    return { allowed: true };
  }

  /**
   * Record that an email was sent
   */
  recordEmailSent(): void {
    const now = Date.now();
    
    this.state.emailsSentLastMinute.push(now);
    this.state.emailsSentLastHour.push(now);
    this.state.emailsSentToday.push(now);
    
    this.cleanupOldEntries();
    this.saveState();
  }

  /**
   * Get current usage statistics
   */
  getUsageStats(): {
    lastMinute: number;
    lastHour: number;
    today: number;
    limits: RateLimitConfig;
    remainingToday: number;
  } {
    this.cleanupOldEntries();

    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;
    const todayStart = new Date().setHours(0, 0, 0, 0);

    const lastMinute = this.state.emailsSentLastMinute.filter(time => time > oneMinuteAgo).length;
    const lastHour = this.state.emailsSentLastHour.filter(time => time > oneHourAgo).length;
    const today = this.state.emailsSentToday.filter(time => time > todayStart).length;

    return {
      lastMinute,
      lastHour,
      today,
      limits: this.config,
      remainingToday: Math.max(0, this.config.maxEmailsPerDay - today)
    };
  }

  /**
   * Reset all counters (for testing or manual reset)
   */
  reset(): void {
    this.state = {
      emailsSentLastMinute: [],
      emailsSentLastHour: [],
      emailsSentToday: [],
      lastResetDate: new Date().toISOString()
    };
    this.saveState();
  }

  /**
   * Check if an error is a rate limit error from Resend
   */
  static isRateLimitError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error.message?.toLowerCase() || '';
    const errorName = error.name?.toLowerCase() || '';
    const statusCode = error.statusCode || error.status;
    
    return (
      statusCode === 429 ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('too many requests') ||
      errorName.includes('ratelimit')
    );
  }

  /**
   * Clean up old entries to prevent memory bloat
   */
  private cleanupOldEntries(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;
    const todayStart = new Date().setHours(0, 0, 0, 0);

    // Check if we need to reset daily counter (new day)
    const lastResetDate = new Date(this.state.lastResetDate);
    const currentDate = new Date();
    if (lastResetDate.toDateString() !== currentDate.toDateString()) {
      this.state.emailsSentToday = [];
      this.state.lastResetDate = currentDate.toISOString();
    }

    this.state.emailsSentLastMinute = this.state.emailsSentLastMinute.filter(time => time > oneMinuteAgo);
    this.state.emailsSentLastHour = this.state.emailsSentLastHour.filter(time => time > oneHourAgo);
    this.state.emailsSentToday = this.state.emailsSentToday.filter(time => time > todayStart);
  }

  /**
   * Load state from localStorage
   */
  private loadState(): RateLimitState {
    try {
      const stored = localStorage.getItem(this.storageKey);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (error) {
      console.error('Error loading rate limit state:', error);
    }

    return {
      emailsSentLastMinute: [],
      emailsSentLastHour: [],
      emailsSentToday: [],
      lastResetDate: new Date().toISOString()
    };
  }

  /**
   * Save state to localStorage
   */
  private saveState(): void {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (error) {
      console.error('Error saving rate limit state:', error);
    }
  }
}

// Export singleton instance
export const rateLimitService = new RateLimitService();
export default rateLimitService;

