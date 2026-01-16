import { supabase } from '../lib/supabase';
import { RentPayment, RentPaymentStatus } from '../types/index';

export type PaymentFrequency = 'monthly' | 'quarterly' | 'annual';

export interface PaymentPeriod {
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  amountDue: number;
  isProRated: boolean;
  proRateDays?: number;
}

export interface RentStatusResult {
  status: 'current' | 'overdue';
  daysOverdue?: number;
  currentPayment?: RentPayment;
}

export interface CashFlowItem {
  periodStart: Date;
  periodEnd: Date;
  dueDate: Date;
  amount: number;
  status: RentPaymentStatus;
}

export interface Invoice {
  invoiceNumber: string;
  tenantName: string;
  propertyAddress: string;
  periodStart: Date;
  periodEnd: Date;
  amountDue: number;
  dueDate: Date;
  isProRated: boolean;
  createdAt: Date;
}

export class RentPaymentService {
  private static tableExists: boolean | null = null;

  /**
   * Check if rent_payments table exists
   */
  private static async checkTableExists(): Promise<boolean> {
    // Cache the result to avoid repeated checks
    if (this.tableExists !== null) {
      return this.tableExists;
    }

    try {
      // Suppress console errors during this check
      const originalError = console.error;
      console.error = () => {};
      
      const { error } = await supabase
        .from('rent_payments')
        .select('id')
        .limit(1);

      // Restore console.error
      console.error = originalError;

      // If no error or PGRST116 (no rows), table exists
      // 42P01 is "undefined_table" error code
      if (!error || error.code === 'PGRST116') {
        this.tableExists = true;
        return true;
      }
      
      if (error.code === '42P01' || error.message?.includes('404')) {
        this.tableExists = false;
        return false;
      }
      
      this.tableExists = true; // Assume table exists for other errors
      return true;
    } catch {
      this.tableExists = false;
      return false;
    }
  }

  /**
   * Calculate pro-rated rent amount for partial month
   */
  static calculateProRatedAmount(
    monthlyRent: number,
    periodStart: Date,
    periodEnd: Date
  ): { amount: number; days: number } {
    const daysDiff = Math.ceil(
      (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    
    // Get days in the month that contains periodStart
    const year = periodStart.getFullYear();
    const month = periodStart.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const dailyRate = monthlyRent / daysInMonth;
    const amount = Math.round(dailyRate * daysDiff * 100) / 100;
    
    return { amount, days: daysDiff };
  }

  /**
   * Generate all payment periods for a lease
   */
  static generatePaymentPeriods(
    tenantId: string,
    propertyId: string,
    leaseStart: Date,
    leaseEnd: Date,
    monthlyRent: number,
    rentDueDay: number,
    paymentFrequency: PaymentFrequency = 'monthly'
  ): PaymentPeriod[] {
    const periods: PaymentPeriod[] = [];
    
    if (paymentFrequency === 'monthly') {
      // Start from lease_start
      let currentDate = new Date(leaseStart);
      let isFirstPeriod = true;
      
      while (currentDate < leaseEnd) {
        // Calculate period start
        let periodStart: Date;
        if (isFirstPeriod) {
          periodStart = new Date(leaseStart);
          isFirstPeriod = false;
        } else {
          // Regular period starts on rent_due_day of current month
          periodStart = new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            rentDueDay
          );
        }
        
        // Calculate period end (next rent_due_day)
        const periodEndMonth = periodStart.getMonth() + 1;
        const periodEndYear = periodStart.getFullYear();
        let periodEnd = new Date(
          periodEndYear,
          periodEndMonth,
          rentDueDay
        );
        
        // Due date is the start of the period (rent_due_day)
        const dueDate = new Date(periodStart);
        
        // Check if period extends beyond lease_end
        if (periodEnd > leaseEnd) {
          periodEnd = new Date(leaseEnd);
        }
        
        // Check if this is a partial period (needs pro-rating)
        const daysInPeriod = Math.ceil(
          (periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24)
        );
        
        // Check if full month (approximately)
        const year = periodStart.getFullYear();
        const month = periodStart.getMonth();
        const daysInFullMonth = new Date(year, month + 1, 0).getDate();
        const isProRated = daysInPeriod < daysInFullMonth - 1; // Allow 1 day difference for rounding
        
        let amountDue: number;
        let proRateDays: number | undefined;
        
        if (isProRated) {
          const proRated = this.calculateProRatedAmount(
            monthlyRent,
            periodStart,
            periodEnd
          );
          amountDue = proRated.amount;
          proRateDays = proRated.days;
        } else {
          amountDue = monthlyRent;
        }
        
        periods.push({
          periodStart,
          periodEnd,
          dueDate,
          amountDue,
          isProRated,
          proRateDays,
        });
        
        // Move to next period start (rent_due_day of next month)
        currentDate = new Date(periodEnd);
        if (currentDate >= leaseEnd) break;
      }
    }
    // TODO: Add quarterly and annual logic when needed
    
    return periods;
  }

  /**
   * Save payment periods to database
   */
  static async savePaymentPeriods(
    tenantId: string,
    propertyId: string,
    periods: PaymentPeriod[],
    paymentFrequency: PaymentFrequency = 'monthly'
  ): Promise<boolean> {
    try {
      const paymentsToInsert = periods.map((period) => ({
        tenant_id: tenantId,
        property_id: propertyId,
        payment_frequency: paymentFrequency,
        period_start: period.periodStart.toISOString().split('T')[0],
        period_end: period.periodEnd.toISOString().split('T')[0],
        due_date: period.dueDate.toISOString().split('T')[0],
        amount_due: period.amountDue,
        is_pro_rated: period.isProRated,
        pro_rate_days: period.proRateDays || null,
        status: 'pending' as RentPaymentStatus,
        payment_date: period.dueDate.toISOString().split('T')[0], // Default to due_date for pending
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }));

      // Insert new periods (using insert instead of upsert to avoid conflicts)
      const { error } = await supabase
        .from('rent_payments')
        .insert(paymentsToInsert);

      if (error) {
        console.error('Error saving payment periods:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in savePaymentPeriods:', error);
      return false;
    }
  }

  /**
   * Get all rent payments for a tenant
   */
  static async getRentPaymentsForTenant(tenantId: string): Promise<RentPayment[]> {
    // Check if table exists before making the query
    const tableExists = await this.checkTableExists();
    if (!tableExists) {
      return [];
    }

    try {
      const { data, error } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('due_date', { ascending: true});

      if (error) {
        // Handle 404/PGRST116 as "no data" - this is expected and not an error
        if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('404')) {
          // Table doesn't exist or no records found - return empty array
          this.tableExists = false; // Update cache
          return [];
        }
        // Only log actual errors, not expected "no data" cases
        if (error.code !== 'PGRST116') {
          console.error('Error fetching rent payments:', error);
        }
        return [];
      }

      return (
        data?.map(this.transformPaymentFromDB) || []
      );
    } catch (error) {
      // Silently handle errors - likely table doesn't exist yet
      this.tableExists = false; // Update cache
      return [];
    }
  }

  /**
   * Get payment for current period
   */
  static async getCurrentPeriodPayment(tenantId: string): Promise<RentPayment | null> {
    // Check if table exists before making the query
    const tableExists = await this.checkTableExists();
    if (!tableExists) {
      return null;
    }

    try {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

      // Use maybeSingle() instead of single() to avoid errors when no record exists
      const { data, error } = await supabase
        .from('rent_payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('period_start', startOfMonth.toISOString().split('T')[0])
        .lte('period_end', endOfMonth.toISOString().split('T')[0])
        .order('due_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) {
        // Handle expected "no data" cases
        if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('404')) {
          // No record found - this is expected
          this.tableExists = false; // Update cache
          return null;
        }
        // Only log actual errors
        if (error.code !== 'PGRST116') {
          console.error('Error fetching current period payment:', error);
        }
        return null;
      }

      return data ? this.transformPaymentFromDB(data) : null;
    } catch (error) {
      // Silently handle errors - likely table doesn't exist yet
      this.tableExists = false; // Update cache
      return null;
    }
  }

  /**
   * Calculate rent status (current or overdue)
   */
  static async calculateRentStatus(
    tenantId: string,
    rentDueDay: number,
    monthlyRent: number,
    leaseStart: Date,
    leaseEnd: Date
  ): Promise<RentStatusResult> {
    try {
      const currentPayment = await this.getCurrentPeriodPayment(tenantId);

      if (!currentPayment) {
        // No payment record exists yet - check if we should create one
        const today = new Date();
        if (today >= leaseStart && today <= leaseEnd) {
          // Generate periods if they don't exist
          // This will be handled by tenant creation flow
        }
        return { status: 'current' };
      }

      // Check if payment is paid
      if (currentPayment.status === 'paid') {
        return { status: 'current', currentPayment };
      }

      // Check if overdue
      const dueDate = new Date(currentPayment.dueDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      dueDate.setHours(0, 0, 0, 0);

      if (dueDate < today && currentPayment.status !== 'paid') {
        const daysOverdue = Math.ceil(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );
        return {
          status: 'overdue',
          daysOverdue,
          currentPayment,
        };
      }

      return { status: 'current', currentPayment };
    } catch (error) {
      console.error('Error in calculateRentStatus:', error);
      return { status: 'current' };
    }
  }

  /**
   * Record a payment
   */
  static async recordPayment(paymentData: {
    paymentId: string;
    amountPaid: number;
    paymentDate: Date;
    paymentMethod?: string;
    paymentReference?: string;
    notes?: string;
  }): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('rent_payments')
        .update({
          amount_paid: paymentData.amountPaid,
          payment_date: paymentData.paymentDate.toISOString().split('T')[0],
          payment_method: paymentData.paymentMethod || null,
          payment_reference: paymentData.paymentReference || null,
          notes: paymentData.notes || null,
          status: 'paid' as RentPaymentStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', paymentData.paymentId);

      if (error) {
        console.error('Error recording payment:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in recordPayment:', error);
      return false;
    }
  }

  /**
   * Calculate future cash flow
   */
  static async calculateFutureCashFlow(
    tenantId: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<CashFlowItem[]> {
    try {
      const today = startDate || new Date();
      const query = supabase
        .from('rent_payments')
        .select('*')
        .eq('tenant_id', tenantId)
        .gte('due_date', today.toISOString().split('T')[0])
        .order('due_date', { ascending: true });

      if (endDate) {
        query.lte('due_date', endDate.toISOString().split('T')[0]);
      }

      const { data, error } = await query;

      if (error) {
        // Handle expected "no data" cases
        if (error.code === 'PGRST116' || error.code === '42P01' || error.message?.includes('404')) {
          // No records found - this is expected
          return [];
        }
        // Only log actual errors
        if (error.code !== 'PGRST116') {
          console.error('Error fetching future cash flow:', error);
        }
        return [];
      }

      return (
        data?.map((payment) => ({
          periodStart: new Date(payment.period_start),
          periodEnd: new Date(payment.period_end),
          dueDate: new Date(payment.due_date),
          amount: payment.amount_due,
          status: payment.status as RentPaymentStatus,
        })) || []
      );
    } catch (error) {
      // Silently handle errors - likely table doesn't exist yet
      return [];
    }
  }

  /**
   * Generate invoice for a payment
   */
  static async generateInvoice(paymentId: string): Promise<Invoice | null> {
    try {
      // Fetch payment with tenant and property details
      const { data: payment, error: paymentError } = await supabase
        .from('rent_payments')
        .select(`
          *,
          tenants!inner(id, name, property_id),
          properties!inner(id, address)
        `)
        .eq('id', paymentId)
        .maybeSingle();

      if (paymentError || !payment) {
        // Handle expected "no data" cases
        if (paymentError && (paymentError.code === 'PGRST116' || paymentError.code === '42P01' || paymentError.message?.includes('404'))) {
          // Payment not found - this is expected
          return null;
        }
        // Only log actual errors
        if (paymentError && paymentError.code !== 'PGRST116') {
          console.error('Error fetching payment for invoice:', paymentError);
        }
        return null;
      }

      // Generate invoice number
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const tenantShortId = payment.tenant_id.substring(0, 8);
      const sequence = Math.floor(Math.random() * 1000);
      const invoiceNumber = `INV-${year}${month}-${tenantShortId}-${sequence}`;

      // Update payment record with invoice number
      const { error: updateError } = await supabase
        .from('rent_payments')
        .update({
          invoice_number: invoiceNumber,
          invoice_generated_at: new Date().toISOString(),
        })
        .eq('id', paymentId);

      if (updateError) {
        console.error('Error updating payment with invoice number:', updateError);
      }

      const invoice: Invoice = {
        invoiceNumber,
        tenantName: (payment.tenants as any).name,
        propertyAddress: (payment.properties as any).address,
        periodStart: new Date(payment.period_start),
        periodEnd: new Date(payment.period_end),
        amountDue: payment.amount_due,
        dueDate: new Date(payment.due_date),
        isProRated: payment.is_pro_rated || false,
        createdAt: new Date(),
      };

      return invoice;
    } catch (error) {
      console.error('Error in generateInvoice:', error);
      return null;
    }
  }

  /**
   * Transform database payment to RentPayment type
   */
  private static transformPaymentFromDB(dbPayment: any): RentPayment {
    return {
      id: dbPayment.id,
      tenantId: dbPayment.tenant_id,
      propertyId: dbPayment.property_id,
      paymentDate: dbPayment.payment_date,
      dueDate: dbPayment.due_date,
      amountDue: parseFloat(dbPayment.amount_due),
      amountPaid: dbPayment.amount_paid ? parseFloat(dbPayment.amount_paid) : undefined,
      status: dbPayment.status as RentPaymentStatus,
      paymentMethod: dbPayment.payment_method,
      paymentReference: dbPayment.payment_reference,
      notes: dbPayment.notes,
      paymentFrequency: dbPayment.payment_frequency,
      periodStart: dbPayment.period_start,
      periodEnd: dbPayment.period_end,
      isProRated: dbPayment.is_pro_rated || false,
      proRateDays: dbPayment.pro_rate_days,
      invoiceNumber: dbPayment.invoice_number,
      invoiceGeneratedAt: dbPayment.invoice_generated_at,
      createdAt: dbPayment.created_at,
      updatedAt: dbPayment.updated_at,
    };
  }
}

