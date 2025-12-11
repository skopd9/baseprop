import { supabase } from '../lib/supabase';

// Types
export interface InvoiceSettings {
  id: string;
  organizationId: string;
  companyName?: string;
  companyAddress?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyLogoUrl?: string;
  invoicePrefix: string;
  paymentTerms: string;
  paymentInstructions?: string;
  footerNotes?: string;
  autoSendEnabled: boolean;
  daysBeforeDue: number;
  sendReminderEnabled: boolean;
  reminderDaysAfter: number;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceRecipient {
  id: string;
  tenantId: string;
  email: string;
  name?: string;
  isPrimary: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type InvoiceStatus = 'draft' | 'pending_approval' | 'approved' | 'sent' | 'paid' | 'partial' | 'overdue' | 'cancelled';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

export interface InvoiceLineItem {
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Invoice {
  id: string;
  organizationId: string;
  tenantId: string;
  propertyId?: string;
  rentPaymentId?: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string;
  periodStart?: string;
  periodEnd?: string;
  amount: number;
  taxAmount: number;
  totalAmount: number;
  amountPaid: number;
  status: InvoiceStatus;
  approvalStatus: ApprovalStatus;
  approvedBy?: string;
  approvedAt?: string;
  sentAt?: string;
  sentTo?: string[];
  lastReminderSentAt?: string;
  reminderCount: number;
  paidAt?: string;
  paymentMethod?: string;
  paymentReference?: string;
  paymentNotes?: string;
  tenantName: string;
  tenantEmail?: string;
  propertyAddress: string;
  lineItems: InvoiceLineItem[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface TenantInvoiceData {
  tenantId: string;
  tenantName: string;
  tenantEmail?: string;
  propertyId: string;
  propertyAddress: string;
  leaseStart?: string;
  leaseEnd?: string;
  monthlyRent: number;
  rentDueDay: number;
  recipients: InvoiceRecipient[];
  nextInvoice?: Invoice;
  lastInvoice?: Invoice;
  totalInvoices: number;
  unpaidInvoices: number;
}

export class InvoiceService {
  // =====================================================
  // Invoice Settings
  // =====================================================

  static async getInvoiceSettings(organizationId: string): Promise<InvoiceSettings | null> {
    try {
      const { data, error } = await supabase
        .from('invoice_settings')
        .select('*')
        .eq('organization_id', organizationId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching invoice settings:', error);
        return null;
      }

      return data ? this.transformSettingsFromDB(data) : null;
    } catch (error) {
      console.error('Error in getInvoiceSettings:', error);
      return null;
    }
  }

  static async saveInvoiceSettings(organizationId: string, settings: Partial<InvoiceSettings>): Promise<InvoiceSettings | null> {
    try {
      const dbSettings = {
        organization_id: organizationId,
        company_name: settings.companyName,
        company_address: settings.companyAddress,
        company_email: settings.companyEmail,
        company_phone: settings.companyPhone,
        company_logo_url: settings.companyLogoUrl,
        invoice_prefix: settings.invoicePrefix || 'INV',
        payment_terms: settings.paymentTerms || 'Payment due within 14 days',
        payment_instructions: settings.paymentInstructions,
        footer_notes: settings.footerNotes,
        auto_send_enabled: settings.autoSendEnabled || false,
        days_before_due: settings.daysBeforeDue || 7,
        send_reminder_enabled: settings.sendReminderEnabled || false,
        reminder_days_after: settings.reminderDaysAfter || 7,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('invoice_settings')
        .upsert(dbSettings, { onConflict: 'organization_id' })
        .select()
        .single();

      if (error) {
        console.error('Error saving invoice settings:', error);
        return null;
      }

      return this.transformSettingsFromDB(data);
    } catch (error) {
      console.error('Error in saveInvoiceSettings:', error);
      return null;
    }
  }

  // =====================================================
  // Invoice Recipients
  // =====================================================

  static async getRecipients(tenantId: string): Promise<InvoiceRecipient[]> {
    try {
      const { data, error } = await supabase
        .from('invoice_recipients')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('is_primary', { ascending: false });

      if (error) {
        console.error('Error fetching recipients:', error);
        return [];
      }

      return data?.map(this.transformRecipientFromDB) || [];
    } catch (error) {
      console.error('Error in getRecipients:', error);
      return [];
    }
  }

  static async addRecipient(tenantId: string, email: string, name?: string, isPrimary: boolean = false): Promise<InvoiceRecipient | null> {
    try {
      // If setting as primary, unset other primaries first
      if (isPrimary) {
        await supabase
          .from('invoice_recipients')
          .update({ is_primary: false })
          .eq('tenant_id', tenantId);
      }

      const { data, error } = await supabase
        .from('invoice_recipients')
        .insert({
          tenant_id: tenantId,
          email,
          name,
          is_primary: isPrimary,
          is_active: true,
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding recipient:', error);
        return null;
      }

      return this.transformRecipientFromDB(data);
    } catch (error) {
      console.error('Error in addRecipient:', error);
      return null;
    }
  }

  static async updateRecipient(recipientId: string, updates: Partial<InvoiceRecipient>): Promise<boolean> {
    try {
      const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
      if (updates.email !== undefined) dbUpdates.email = updates.email;
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.isPrimary !== undefined) dbUpdates.is_primary = updates.isPrimary;
      if (updates.isActive !== undefined) dbUpdates.is_active = updates.isActive;

      const { error } = await supabase
        .from('invoice_recipients')
        .update(dbUpdates)
        .eq('id', recipientId);

      if (error) {
        console.error('Error updating recipient:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateRecipient:', error);
      return false;
    }
  }

  static async removeRecipient(recipientId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('invoice_recipients')
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq('id', recipientId);

      if (error) {
        console.error('Error removing recipient:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in removeRecipient:', error);
      return false;
    }
  }

  // =====================================================
  // Invoices
  // =====================================================

  static async getInvoices(organizationId: string, filters?: {
    status?: InvoiceStatus;
    tenantId?: string;
    fromDate?: string;
    toDate?: string;
  }): Promise<Invoice[]> {
    try {
      let query = supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', organizationId)
        .order('invoice_date', { ascending: false });

      if (filters?.status) {
        query = query.eq('status', filters.status);
      }
      if (filters?.tenantId) {
        query = query.eq('tenant_id', filters.tenantId);
      }
      if (filters?.fromDate) {
        query = query.gte('invoice_date', filters.fromDate);
      }
      if (filters?.toDate) {
        query = query.lte('invoice_date', filters.toDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching invoices:', error);
        return [];
      }

      return data?.map(this.transformInvoiceFromDB) || [];
    } catch (error) {
      console.error('Error in getInvoices:', error);
      return [];
    }
  }

  static async getInvoicesByTenant(tenantId: string): Promise<Invoice[]> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('invoice_date', { ascending: false });

      if (error) {
        console.error('Error fetching invoices by tenant:', error);
        return [];
      }

      return data?.map(this.transformInvoiceFromDB) || [];
    } catch (error) {
      console.error('Error in getInvoicesByTenant:', error);
      return [];
    }
  }

  static async getInvoice(invoiceId: string): Promise<Invoice | null> {
    try {
      const { data, error } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', invoiceId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching invoice:', error);
        return null;
      }

      return data ? this.transformInvoiceFromDB(data) : null;
    } catch (error) {
      console.error('Error in getInvoice:', error);
      return null;
    }
  }

  static async createInvoice(invoice: Partial<Invoice>): Promise<Invoice | null> {
    try {
      // Generate invoice number if not provided
      let invoiceNumber = invoice.invoiceNumber;
      if (!invoiceNumber && invoice.organizationId) {
        const { data: numData } = await supabase.rpc('generate_invoice_number', {
          org_id: invoice.organizationId
        });
        invoiceNumber = numData || `INV-${Date.now()}`;
      }

      const dbInvoice = {
        organization_id: invoice.organizationId,
        tenant_id: invoice.tenantId,
        property_id: invoice.propertyId,
        rent_payment_id: invoice.rentPaymentId,
        invoice_number: invoiceNumber,
        invoice_date: invoice.invoiceDate || new Date().toISOString().split('T')[0],
        due_date: invoice.dueDate,
        period_start: invoice.periodStart,
        period_end: invoice.periodEnd,
        amount: invoice.amount || 0,
        tax_amount: invoice.taxAmount || 0,
        total_amount: invoice.totalAmount || invoice.amount || 0,
        amount_paid: invoice.amountPaid || 0,
        status: invoice.status || 'draft',
        approval_status: invoice.approvalStatus || 'pending',
        tenant_name: invoice.tenantName,
        tenant_email: invoice.tenantEmail,
        property_address: invoice.propertyAddress,
        line_items: invoice.lineItems || [],
        notes: invoice.notes,
      };

      const { data, error } = await supabase
        .from('invoices')
        .insert(dbInvoice)
        .select()
        .single();

      if (error) {
        console.error('Error creating invoice:', error);
        return null;
      }

      return this.transformInvoiceFromDB(data);
    } catch (error) {
      console.error('Error in createInvoice:', error);
      return null;
    }
  }

  static async updateInvoice(invoiceId: string, updates: Partial<Invoice>): Promise<Invoice | null> {
    try {
      const dbUpdates: Record<string, any> = { updated_at: new Date().toISOString() };
      
      if (updates.invoiceDate !== undefined) dbUpdates.invoice_date = updates.invoiceDate;
      if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
      if (updates.periodStart !== undefined) dbUpdates.period_start = updates.periodStart;
      if (updates.periodEnd !== undefined) dbUpdates.period_end = updates.periodEnd;
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      if (updates.taxAmount !== undefined) dbUpdates.tax_amount = updates.taxAmount;
      if (updates.totalAmount !== undefined) dbUpdates.total_amount = updates.totalAmount;
      if (updates.amountPaid !== undefined) dbUpdates.amount_paid = updates.amountPaid;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.approvalStatus !== undefined) dbUpdates.approval_status = updates.approvalStatus;
      if (updates.approvedBy !== undefined) dbUpdates.approved_by = updates.approvedBy;
      if (updates.approvedAt !== undefined) dbUpdates.approved_at = updates.approvedAt;
      if (updates.sentAt !== undefined) dbUpdates.sent_at = updates.sentAt;
      if (updates.sentTo !== undefined) dbUpdates.sent_to = updates.sentTo;
      if (updates.paidAt !== undefined) dbUpdates.paid_at = updates.paidAt;
      if (updates.paymentMethod !== undefined) dbUpdates.payment_method = updates.paymentMethod;
      if (updates.paymentReference !== undefined) dbUpdates.payment_reference = updates.paymentReference;
      if (updates.paymentNotes !== undefined) dbUpdates.payment_notes = updates.paymentNotes;
      if (updates.lineItems !== undefined) dbUpdates.line_items = updates.lineItems;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      const { data, error } = await supabase
        .from('invoices')
        .update(dbUpdates)
        .eq('id', invoiceId)
        .select()
        .single();

      if (error) {
        console.error('Error updating invoice:', error);
        return null;
      }

      return this.transformInvoiceFromDB(data);
    } catch (error) {
      console.error('Error in updateInvoice:', error);
      return null;
    }
  }

  static async approveInvoice(invoiceId: string, userId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          approval_status: 'approved',
          approved_by: userId,
          approved_at: new Date().toISOString(),
          status: 'approved',
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (error) {
        console.error('Error approving invoice:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in approveInvoice:', error);
      return false;
    }
  }

  static async markAsPaid(invoiceId: string, paymentDetails: {
    amountPaid: number;
    paymentMethod?: string;
    paymentReference?: string;
    paymentNotes?: string;
  }): Promise<boolean> {
    try {
      const invoice = await this.getInvoice(invoiceId);
      if (!invoice) return false;

      const newAmountPaid = (invoice.amountPaid || 0) + paymentDetails.amountPaid;
      const isPaid = newAmountPaid >= invoice.totalAmount;
      const isPartial = newAmountPaid > 0 && newAmountPaid < invoice.totalAmount;

      const { error } = await supabase
        .from('invoices')
        .update({
          amount_paid: newAmountPaid,
          status: isPaid ? 'paid' : (isPartial ? 'partial' : invoice.status),
          paid_at: isPaid ? new Date().toISOString() : null,
          payment_method: paymentDetails.paymentMethod,
          payment_reference: paymentDetails.paymentReference,
          payment_notes: paymentDetails.paymentNotes,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (error) {
        console.error('Error marking invoice as paid:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markAsPaid:', error);
      return false;
    }
  }

  static async markAsSent(invoiceId: string, sentTo: string[]): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'sent',
          sent_at: new Date().toISOString(),
          sent_to: sentTo,
          updated_at: new Date().toISOString(),
        })
        .eq('id', invoiceId);

      if (error) {
        console.error('Error marking invoice as sent:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in markAsSent:', error);
      return false;
    }
  }

  // =====================================================
  // Get Tenant Invoice Data (for the main table)
  // =====================================================

  static async getTenantInvoiceData(organizationId: string): Promise<TenantInvoiceData[]> {
    try {
      // Get all active tenants with their property info
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select(`
          id,
          name,
          email,
          lease_start,
          lease_end,
          monthly_rent,
          rent_due_day,
          organization_id
        `)
        .eq('organization_id', organizationId)
        .eq('status', 'active');

      if (tenantsError) {
        console.error('Error fetching tenants:', tenantsError);
        return [];
      }

      // Get unit_tenants to link tenants to properties
      const tenantIds = tenants?.map(t => t.id) || [];
      const { data: unitTenants, error: unitError } = await supabase
        .from('unit_tenants')
        .select(`
          tenant_id,
          rent_amount,
          lease_start_date,
          lease_end_date,
          units!inner (
            property_id,
            properties!inner (
              id,
              address,
              name
            )
          )
        `)
        .in('tenant_id', tenantIds)
        .eq('status', 'active');

      if (unitError) {
        console.error('Error fetching unit tenants:', unitError);
      }

      // Get all recipients for these tenants
      const { data: allRecipients, error: recipientsError } = await supabase
        .from('invoice_recipients')
        .select('*')
        .in('tenant_id', tenantIds)
        .eq('is_active', true);

      if (recipientsError) {
        console.error('Error fetching recipients:', recipientsError);
      }

      // Get invoice counts per tenant
      const { data: invoiceStats, error: statsError } = await supabase
        .from('invoices')
        .select('tenant_id, status')
        .in('tenant_id', tenantIds);

      if (statsError) {
        console.error('Error fetching invoice stats:', statsError);
      }

      // Get latest and next invoices per tenant
      const { data: latestInvoices, error: latestError } = await supabase
        .from('invoices')
        .select('*')
        .in('tenant_id', tenantIds)
        .order('invoice_date', { ascending: false });

      if (latestError) {
        console.error('Error fetching latest invoices:', latestError);
      }

      // Build the result
      const result: TenantInvoiceData[] = [];

      for (const tenant of tenants || []) {
        // Find property info from unit_tenants
        const unitTenant = unitTenants?.find(ut => ut.tenant_id === tenant.id);
        const property = (unitTenant?.units as any)?.properties;
        
        // Get recipients for this tenant
        const recipients = (allRecipients || [])
          .filter(r => r.tenant_id === tenant.id)
          .map(this.transformRecipientFromDB);

        // If no recipients, add tenant email as default
        if (recipients.length === 0 && tenant.email) {
          recipients.push({
            id: 'default',
            tenantId: tenant.id,
            email: tenant.email,
            name: tenant.name,
            isPrimary: true,
            isActive: true,
            createdAt: '',
            updatedAt: '',
          });
        }

        // Get invoice stats for this tenant
        const tenantInvoices = (invoiceStats || []).filter(i => i.tenant_id === tenant.id);
        const totalInvoices = tenantInvoices.length;
        const unpaidInvoices = tenantInvoices.filter(i => 
          i.status !== 'paid' && i.status !== 'cancelled'
        ).length;

        // Get latest invoice
        const tenantLatestInvoices = (latestInvoices || []).filter(i => i.tenant_id === tenant.id);
        const lastInvoice = tenantLatestInvoices[0] ? this.transformInvoiceFromDB(tenantLatestInvoices[0]) : undefined;
        
        // Find next pending invoice
        const nextInvoice = tenantLatestInvoices.find(i => 
          i.status === 'draft' || i.status === 'pending_approval' || i.status === 'approved'
        );

        result.push({
          tenantId: tenant.id,
          tenantName: tenant.name,
          tenantEmail: tenant.email,
          propertyId: property?.id || '',
          propertyAddress: property?.address || property?.name || 'No property assigned',
          leaseStart: unitTenant?.lease_start_date || tenant.lease_start,
          leaseEnd: unitTenant?.lease_end_date || tenant.lease_end,
          monthlyRent: unitTenant?.rent_amount || tenant.monthly_rent || 0,
          rentDueDay: tenant.rent_due_day || 1,
          recipients,
          nextInvoice: nextInvoice ? this.transformInvoiceFromDB(nextInvoice) : undefined,
          lastInvoice,
          totalInvoices,
          unpaidInvoices,
        });
      }

      return result;
    } catch (error) {
      console.error('Error in getTenantInvoiceData:', error);
      return [];
    }
  }

  // =====================================================
  // Generate Invoice for Tenant
  // =====================================================

  static async generateInvoiceForTenant(
    organizationId: string,
    tenantData: TenantInvoiceData,
    periodStart: Date,
    periodEnd: Date
  ): Promise<Invoice | null> {
    try {
      const invoiceDate = new Date();
      const dueDate = new Date(periodStart);
      dueDate.setDate(tenantData.rentDueDay);

      const lineItems: InvoiceLineItem[] = [{
        description: `Rent for ${periodStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`,
        quantity: 1,
        unitPrice: tenantData.monthlyRent,
        amount: tenantData.monthlyRent,
      }];

      const invoice = await this.createInvoice({
        organizationId,
        tenantId: tenantData.tenantId,
        propertyId: tenantData.propertyId,
        invoiceDate: invoiceDate.toISOString().split('T')[0],
        dueDate: dueDate.toISOString().split('T')[0],
        periodStart: periodStart.toISOString().split('T')[0],
        periodEnd: periodEnd.toISOString().split('T')[0],
        amount: tenantData.monthlyRent,
        taxAmount: 0,
        totalAmount: tenantData.monthlyRent,
        status: 'pending_approval',
        tenantName: tenantData.tenantName,
        tenantEmail: tenantData.tenantEmail,
        propertyAddress: tenantData.propertyAddress,
        lineItems,
      });

      return invoice;
    } catch (error) {
      console.error('Error generating invoice:', error);
      return null;
    }
  }

  // =====================================================
  // Generate Full Invoice Schedule for Tenant
  // =====================================================

  static async generateInvoiceSchedule(params: {
    organizationId: string;
    tenantId: string;
    propertyId?: string;
    tenantName: string;
    tenantEmail?: string;
    propertyAddress: string;
    leaseStart: Date;
    leaseEnd: Date;
    monthlyRent: number;
    rentDueDay: number;
  }): Promise<Invoice[]> {
    const {
      organizationId,
      tenantId,
      propertyId,
      tenantName,
      tenantEmail,
      propertyAddress,
      leaseStart,
      leaseEnd,
      monthlyRent,
      rentDueDay,
    } = params;

    const invoices: Invoice[] = [];
    
    try {
      // Start from today or lease start, whichever is later
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Start from the first of the current month if lease already started
      let currentDate = new Date(leaseStart);
      if (currentDate < today) {
        // Start from the first of current month
        currentDate = new Date(today.getFullYear(), today.getMonth(), 1);
      }
      
      let invoiceCount = 0;
      
      // Generate future invoices only
      while (currentDate < leaseEnd) {
        invoiceCount++;
        
        // Calculate period start and end
        const periodStart = new Date(currentDate);
        const periodEnd = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0); // Last day of month
        
        // If period end is after lease end, cap it
        if (periodEnd > leaseEnd) {
          periodEnd.setTime(leaseEnd.getTime());
        }
        
        // Due date is the rent due day of that month
        // Clamp to the last valid day if rentDueDay exceeds days in the month (e.g., Feb 31 -> Feb 28)
        const daysInCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const clampedDueDay = Math.min(rentDueDay, daysInCurrentMonth);
        const dueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), clampedDueDay);
        
        // Calculate amount (pro-rate if partial month)
        const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
        const startDay = periodStart.getDate();
        const endDay = periodEnd.getDate();
        const daysInPeriod = endDay - startDay + 1;
        const isProRated = daysInPeriod < daysInMonth - 1;
        const amount = isProRated 
          ? Math.round((monthlyRent / daysInMonth) * daysInPeriod * 100) / 100
          : monthlyRent;

        const lineItems: InvoiceLineItem[] = [{
          description: `Rent for ${periodStart.toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}${isProRated ? ` (${daysInPeriod} days)` : ''}`,
          quantity: 1,
          unitPrice: amount,
          amount: amount,
        }];

        // Generate invoice number
        const yearMonth = `${currentDate.getFullYear()}${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
        const invoiceNumber = `INV-${yearMonth}-${String(invoiceCount).padStart(3, '0')}`;

        const dbInvoice = {
          organization_id: organizationId,
          tenant_id: tenantId,
          property_id: propertyId || null, // Can be null if no property
          invoice_number: invoiceNumber,
          invoice_date: periodStart.toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
          amount: amount,
          tax_amount: 0,
          total_amount: amount,
          amount_paid: 0,
          status: 'pending_approval', // Needs approval before sending
          approval_status: 'pending',
          tenant_name: tenantName,
          tenant_email: tenantEmail,
          property_address: propertyAddress,
          line_items: lineItems,
        };

        const { data, error } = await supabase
          .from('invoices')
          .insert(dbInvoice)
          .select()
          .single();

        if (error) {
          console.error('Error creating invoice:', error);
        } else if (data) {
          invoices.push(this.transformInvoiceFromDB(data));
        }

        // Move to next month
        currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      }

      console.log(`Generated ${invoices.length} invoices for tenant ${tenantName}`);
      return invoices;
    } catch (error) {
      console.error('Error in generateInvoiceSchedule:', error);
      return invoices;
    }
  }

  // =====================================================
  // Simple Toggle Paid/Unpaid
  // =====================================================

  static async togglePaidStatus(invoiceId: string): Promise<boolean> {
    try {
      const invoice = await this.getInvoice(invoiceId);
      if (!invoice) return false;

      let newStatus: InvoiceStatus;
      
      if (invoice.status === 'paid') {
        // When unmarking as paid, restore previous status based on whether it was sent
        // If invoice has sentAt date, it was sent before being paid -> revert to 'sent'
        // Otherwise it was approved but never sent -> revert to 'approved'
        newStatus = invoice.sentAt ? 'sent' : 'approved';
      } else {
        // Marking as paid
        newStatus = 'paid';
      }
      
      const now = new Date().toISOString();

      const { error } = await supabase
        .from('invoices')
        .update({
          status: newStatus,
          amount_paid: newStatus === 'paid' ? invoice.totalAmount : 0,
          paid_at: newStatus === 'paid' ? now : null,
          updated_at: now,
        })
        .eq('id', invoiceId);

      if (error) {
        console.error('Error toggling invoice status:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in togglePaidStatus:', error);
      return false;
    }
  }

  // =====================================================
  // Transformers
  // =====================================================

  private static transformSettingsFromDB(data: any): InvoiceSettings {
    return {
      id: data.id,
      organizationId: data.organization_id,
      companyName: data.company_name,
      companyAddress: data.company_address,
      companyEmail: data.company_email,
      companyPhone: data.company_phone,
      companyLogoUrl: data.company_logo_url,
      invoicePrefix: data.invoice_prefix || 'INV',
      paymentTerms: data.payment_terms || 'Payment due within 14 days',
      paymentInstructions: data.payment_instructions,
      footerNotes: data.footer_notes,
      autoSendEnabled: data.auto_send_enabled || false,
      daysBeforeDue: data.days_before_due || 7,
      sendReminderEnabled: data.send_reminder_enabled || false,
      reminderDaysAfter: data.reminder_days_after || 7,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private static transformRecipientFromDB(data: any): InvoiceRecipient {
    return {
      id: data.id,
      tenantId: data.tenant_id,
      email: data.email,
      name: data.name,
      isPrimary: data.is_primary || false,
      isActive: data.is_active !== false,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  private static transformInvoiceFromDB(data: any): Invoice {
    return {
      id: data.id,
      organizationId: data.organization_id,
      tenantId: data.tenant_id,
      propertyId: data.property_id,
      rentPaymentId: data.rent_payment_id,
      invoiceNumber: data.invoice_number,
      invoiceDate: data.invoice_date,
      dueDate: data.due_date,
      periodStart: data.period_start,
      periodEnd: data.period_end,
      amount: parseFloat(data.amount) || 0,
      taxAmount: parseFloat(data.tax_amount) || 0,
      totalAmount: parseFloat(data.total_amount) || 0,
      amountPaid: parseFloat(data.amount_paid) || 0,
      status: data.status || 'draft',
      approvalStatus: data.approval_status || 'pending',
      approvedBy: data.approved_by,
      approvedAt: data.approved_at,
      sentAt: data.sent_at,
      sentTo: data.sent_to || [],
      lastReminderSentAt: data.last_reminder_sent_at,
      reminderCount: data.reminder_count || 0,
      paidAt: data.paid_at,
      paymentMethod: data.payment_method,
      paymentReference: data.payment_reference,
      paymentNotes: data.payment_notes,
      tenantName: data.tenant_name,
      tenantEmail: data.tenant_email,
      propertyAddress: data.property_address,
      lineItems: data.line_items || [],
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };
  }

  // =====================================================
  // Send Invoice Email
  // =====================================================

  static async sendInvoiceEmail(
    invoice: Invoice,
    emailList: string[],
    settings: InvoiceSettings | null,
    pdfBase64?: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // In development, show a notification instead of actually sending
      if (import.meta.env.DEV) {
        this.showInvoiceDevNotification(invoice, emailList, pdfBase64);
        
        // Update the invoice as sent in the database
        const now = new Date().toISOString();
        const { error } = await supabase
          .from('invoices')
          .update({
            status: 'sent',
            sent_at: now,
            sent_to: emailList,
            updated_at: now,
          })
          .eq('id', invoice.id);

        if (error) {
          console.error('Error updating invoice as sent:', error);
          return { success: false, error: error.message };
        }

        return { success: true };
      }

      // In production, call the Netlify function
      const response = await fetch('/.netlify/functions/send-invoice-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          invoice,
          emailList,
          settings,
          pdfBase64,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Failed to send email' }));
        return { success: false, error: errorData.error || 'Failed to send email' };
      }

      const data = await response.json();
      
      // Update the invoice as sent in the database
      const now = new Date().toISOString();
      const { error } = await supabase
        .from('invoices')
        .update({
          status: 'sent',
          sent_at: now,
          sent_to: emailList,
          updated_at: now,
        })
        .eq('id', invoice.id);

      if (error) {
        console.error('Error updating invoice as sent:', error);
        return { success: false, error: error.message };
      }

      return { success: true };
    } catch (error) {
      console.error('Error sending invoice email:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  private static showInvoiceDevNotification(
    invoice: Invoice,
    emailList: string[],
    pdfBase64?: string
  ) {
    const message = `
📧 Invoice Email (Development Mode)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
To: ${emailList.join(', ')}
Subject: Invoice ${invoice.invoiceNumber} - ${invoice.tenantName}

Invoice Details:
• Amount: £${invoice.totalAmount.toFixed(2)}
• Due Date: ${invoice.dueDate}
• Status: ${invoice.status}

${pdfBase64 ? '📎 PDF Attachment: Included' : '📄 No PDF attachment'}

In production, this will be sent via Resend API.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    `.trim();

    console.log(message);
    
    // Show a styled notification in the browser
    if (typeof window !== 'undefined') {
      const notification = document.createElement('div');
      notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 16px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 400px;
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 14px;
        line-height: 1.5;
      `;
      notification.innerHTML = `
        <div style="display: flex; align-items: start; gap: 12px;">
          <div style="font-size: 24px;">📧</div>
          <div style="flex: 1;">
            <strong style="display: block; margin-bottom: 4px;">Invoice Email Sent (Dev Mode)</strong>
            <div style="opacity: 0.9; font-size: 13px;">
              To: ${emailList.join(', ')}<br/>
              Invoice: ${invoice.invoiceNumber}<br/>
              Amount: £${invoice.totalAmount.toFixed(2)}
              ${pdfBase64 ? '<br/>📎 PDF attached' : ''}
            </div>
          </div>
          <button onclick="this.parentElement.parentElement.remove()" 
                  style="background: none; border: none; color: white; cursor: pointer; font-size: 20px; padding: 0; line-height: 1;">
            ×
          </button>
        </div>
      `;
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 8000);
    }
  }
}