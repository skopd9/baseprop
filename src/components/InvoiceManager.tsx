import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyPoundIcon,
  CurrencyDollarIcon,
  CurrencyEuroIcon,
  BanknotesIcon,
  Cog6ToothIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { BellAlertIcon as BellAlertIconSolid } from '@heroicons/react/24/solid';
import { useOrganization } from '../contexts/OrganizationContext';
import { InvoiceService, Invoice, InvoiceSettings } from '../services/InvoiceService';
import { InvoiceTemplateSettings } from './InvoiceTemplateSettings';
import { TenantInvoicePanel } from './TenantInvoicePanel';
import { useCurrency } from '../hooks/useCurrency';
import { supabase } from '../lib/supabase';

export interface InvoiceRecipient {
  id: string;
  email: string;
  name?: string;
  isPrimary: boolean;
}

export interface TenantWithInvoices {
  id: string;
  name: string;
  email?: string;
  propertyId?: string;
  propertyAddress: string;
  leaseStart?: string;
  leaseEnd?: string;
  monthlyRent: number;
  rentDueDay: number;
  invoices: Invoice[];
  recipients: InvoiceRecipient[];
  nextInvoice?: Invoice;
  paidCount: number;
  approvedCount: number;
  overdueCount: number;
}

interface InvoiceManagerProps {
  onSuccess?: (message: string) => void;
}

type FilterStatus = 'all' | 'needs_approval' | 'up_to_date' | 'overdue';

export const InvoiceManager: React.FC<InvoiceManagerProps> = ({ onSuccess }) => {
  const { currentOrganization } = useOrganization();
  const { formatCurrency, currencyCode } = useCurrency();
  
  const CurrencyIcon = React.useMemo(() => {
    switch (currencyCode) {
      case 'GBP': return CurrencyPoundIcon;
      case 'USD': return CurrencyDollarIcon;
      case 'EUR': return CurrencyEuroIcon;
      default: return BanknotesIcon;
    }
  }, [currencyCode]);
  
  const [tenants, setTenants] = useState<TenantWithInvoices[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settings, setSettings] = useState<InvoiceSettings | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<TenantWithInvoices | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');

  useEffect(() => {
    loadData();
    loadSettings();
  }, [currentOrganization]);

  const loadSettings = async () => {
    if (!currentOrganization) return;
    const invoiceSettings = await InvoiceService.getInvoiceSettings(currentOrganization.id);
    setSettings(invoiceSettings);
  };

  const loadData = async (): Promise<TenantWithInvoices[]> => {
    if (!currentOrganization) return [];
    
    setLoading(true);
    try {
      // Get all tenants for this organization
      // Match the same filter as SimplifiedTenantService (used by Tenants table)
      // Try with property_id first, fallback without it if column doesn't exist
      let tenantsData: any[] | null = null;
      let tenantsError: any = null;
      
      // Get organization's country code for filtering
      const { data: org } = await supabase
        .from('organizations')
        .select('country_code')
        .eq('id', currentOrganization.id)
        .single();
      
      const orgCountryCode = org?.country_code || 'UK';
      
      let queryWithPropertyId = supabase
        .from('tenants')
        .select('id, name, email, tenant_data, monthly_rent, rent_due_day, lease_start, lease_end, property_id')
        .eq('organization_id', currentOrganization.id)
        .eq('status', 'active')
        .eq('tenant_data->>is_simplified_demo', 'true') // Match SimplifiedTenantService filter
        .eq('country_code', orgCountryCode); // Match SimplifiedTenantService filter
      
      const { data: dataWithPropertyId, error: errorWithPropertyId } = await queryWithPropertyId;

      if (errorWithPropertyId) {
        console.warn('Error fetching tenants with property_id, retrying without it:', errorWithPropertyId);
        // Retry without property_id in case column doesn't exist
        const { data: retryData, error: retryError } = await supabase
          .from('tenants')
          .select('id, name, email, tenant_data, monthly_rent, rent_due_day, lease_start, lease_end')
          .eq('organization_id', currentOrganization.id)
          .eq('status', 'active')
          .eq('tenant_data->>is_simplified_demo', 'true') // Match SimplifiedTenantService filter
          .eq('country_code', orgCountryCode); // Match SimplifiedTenantService filter
        
        if (retryError) {
          console.error('Error fetching tenants (retry):', retryError);
          onSuccess?.('Failed to load tenants. Please refresh the page.');
          setLoading(false);
          return [];
        }
        
        tenantsData = retryData;
      } else {
        tenantsData = dataWithPropertyId;
      }

      if (!tenantsData || tenantsData.length === 0) {
        setTenants([]);
        setLoading(false);
        return [];
      }

      // Get all invoices for this organization
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .eq('organization_id', currentOrganization.id)
        .order('due_date', { ascending: true });

      if (invoicesError) {
        console.error('Error fetching invoices:', invoicesError);
      }

      // Get invoice recipients
      const tenantIds = tenantsData?.map(t => t.id) || [];
      const { data: recipientsData } = await supabase
        .from('invoice_recipients')
        .select('*')
        .in('tenant_id', tenantIds)
        .eq('is_active', true);

      // Get unit_tenants to get property info
      // Use left join (no !inner) so we get unit_tenants even if property lookup fails
      const { data: unitTenantsData, error: unitTenantsError } = await supabase
        .from('unit_tenants')
        .select(`
          tenant_id,
          rent_amount,
          lease_start_date,
          lease_end_date,
          unit_id,
          units (
            id,
            unit_number,
            property_id,
            properties (
              id,
              address,
              name
            )
          )
        `)
        .in('tenant_id', tenantIds)
        .eq('status', 'active');

      if (unitTenantsError) {
        console.error('Error fetching unit tenants:', unitTenantsError);
      }

      // Extract property_ids from units and fetch properties separately if needed
      const unitPropertyIds: string[] = [];
      if (unitTenantsData) {
        unitTenantsData.forEach((ut: any) => {
          if (ut.units) {
            const units = Array.isArray(ut.units) ? ut.units[0] : ut.units;
            if (units?.property_id) {
              unitPropertyIds.push(units.property_id);
            }
          }
        });
      }

      // Fetch properties for units (in case the join didn't return them)
      let unitPropertiesData = null;
      if (unitPropertyIds.length > 0) {
        const uniquePropertyIds = [...new Set(unitPropertyIds)];
        const { data: unitPropsData, error: unitPropsError } = await supabase
          .from('properties')
          .select('id, address, name')
          .in('id', uniquePropertyIds)
          .eq('organization_id', currentOrganization.id);
        
        if (unitPropsError) {
          console.error('Error fetching unit properties:', unitPropsError);
        } else {
          unitPropertiesData = unitPropsData;
        }
      }

      // Get properties directly for tenants that have property_id (from column or tenant_data)
      // This includes tenants without unit_tenants records
      let directPropertiesData = null;
      try {
        const tenantPropertyIds = new Set<string>();
        
        tenantsData?.forEach(t => {
          const tenantData = t.tenant_data || {};
          // Check column property_id
          if (t && 'property_id' in t && t.property_id) {
            tenantPropertyIds.add(t.property_id);
          }
          // Check tenant_data.property_id (like SimplifiedTenantService does)
          if (tenantData.property_id) {
            tenantPropertyIds.add(tenantData.property_id);
          }
        });
        
        // Also add property_ids from units that don't have properties in the join
        if (unitTenantsData) {
          unitTenantsData.forEach((ut: any) => {
            if (ut.units) {
              const units = Array.isArray(ut.units) ? ut.units[0] : ut.units;
              if (units?.property_id) {
                tenantPropertyIds.add(units.property_id);
              }
            }
          });
        }
        
        const propertyIdsArray = Array.from(tenantPropertyIds);
        
        if (propertyIdsArray.length > 0) {
          const { data, error } = await supabase
            .from('properties')
            .select('id, address, name')
            .in('id', propertyIdsArray)
            .eq('organization_id', currentOrganization.id);
          
          if (error) {
            console.error('Error fetching direct properties:', error);
          } else {
            directPropertiesData = data;
          }
        }
      } catch (error) {
        console.error('Error processing direct properties:', error);
        // Continue without direct properties - tenants will still show
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Build tenant list with invoices
      const tenantsWithInvoices: TenantWithInvoices[] = (tenantsData || []).map(tenant => {
        const tenantData = tenant.tenant_data || {};
        const unitTenant = unitTenantsData?.find(ut => ut.tenant_id === tenant.id);
        
        // Extract property from unit_tenants → units → properties
        let property: any = null;
        if (unitTenant?.units) {
          const units = Array.isArray(unitTenant.units) ? unitTenant.units[0] : unitTenant.units;
          if (units) {
            // First try: properties from the join
            if (units.properties) {
              property = Array.isArray(units.properties) ? units.properties[0] : units.properties;
            }
            // Second try: use property_id from units to lookup in unitPropertiesData
            if (!property && units.property_id) {
              property = unitPropertiesData?.find(p => p.id === units.property_id);
            }
            // Third try: use property_id from units to lookup in directPropertiesData
            if (!property && units.property_id) {
              property = directPropertiesData?.find(p => p.id === units.property_id);
            }
          }
        }
        
        // Fallback 1: Check direct property_id column if no unit_tenants record found
        if (!property && tenant && 'property_id' in tenant && tenant.property_id) {
          property = directPropertiesData?.find(p => p.id === tenant.property_id);
        }
        
        // Fallback 2: Check tenant_data.property_id (like SimplifiedTenantService does)
        if (!property && tenantData.property_id) {
          property = directPropertiesData?.find(p => p.id === tenantData.property_id);
        }
        
        // Debug for specific tenant
        if (tenant.name?.toLowerCase().includes('daniel')) {
          console.log('Daniel tenant debug:', {
            tenantId: tenant.id,
            tenantName: tenant.name,
            unitTenant: unitTenant,
            property: property,
            directPropertyId: tenant.property_id,
            tenantDataPropertyId: tenantData.property_id,
            unitPropertiesData: unitPropertiesData,
            directPropertiesData: directPropertiesData,
          });
        }
        
        const tenantInvoices = (invoicesData || [])
          .filter(inv => inv.tenant_id === tenant.id)
          .map(inv => ({
            id: inv.id,
            organizationId: inv.organization_id,
            tenantId: inv.tenant_id,
            propertyId: inv.property_id,
            rentPaymentId: inv.rent_payment_id,
            invoiceNumber: inv.invoice_number,
            invoiceDate: inv.invoice_date,
            dueDate: inv.due_date,
            periodStart: inv.period_start,
            periodEnd: inv.period_end,
            amount: parseFloat(inv.amount) || 0,
            taxAmount: parseFloat(inv.tax_amount) || 0,
            totalAmount: parseFloat(inv.total_amount) || 0,
            amountPaid: parseFloat(inv.amount_paid) || 0,
            status: inv.status || 'pending_approval',
            approvalStatus: inv.approval_status || 'pending',
            approvedBy: inv.approved_by,
            approvedAt: inv.approved_at,
            sentAt: inv.sent_at,
            sentTo: inv.sent_to || [],
            paidAt: inv.paid_at,
            paymentMethod: inv.payment_method,
            tenantName: inv.tenant_name,
            tenantEmail: inv.tenant_email,
            propertyAddress: inv.property_address,
            lineItems: inv.line_items || [],
            createdAt: inv.created_at,
            updatedAt: inv.updated_at,
          } as Invoice));

        // Get recipients for this tenant
        const recipients: InvoiceRecipient[] = (recipientsData || [])
          .filter(r => r.tenant_id === tenant.id)
          .map(r => ({
            id: r.id,
            email: r.email,
            name: r.name,
            isPrimary: r.is_primary,
          }));

        // Add tenant's own email as primary if not already in recipients
        if (tenant.email && !recipients.some(r => r.email === tenant.email)) {
          recipients.unshift({
            id: 'tenant-email',
            email: tenant.email,
            name: tenant.name,
            isPrimary: true,
          });
        }

        // Find next upcoming invoice based on rent period (not invoice date)
        // Next invoice = first unpaid invoice for a current or future rent period
        const nextInvoice = tenantInvoices
          .filter(inv => {
            // Only consider invoices that need action (not paid/cancelled)
            if (inv.status === 'paid' || inv.status === 'cancelled') return false;
            // Check if this is for a current or future rent period
            const periodStart = inv.periodStart ? new Date(inv.periodStart) : new Date(inv.dueDate);
            return periodStart >= new Date(today.getFullYear(), today.getMonth(), 1); // Current month or later
          })
          .sort((a, b) => {
            // Sort by period start to get the earliest upcoming rent period
            const aDate = a.periodStart ? new Date(a.periodStart) : new Date(a.dueDate);
            const bDate = b.periodStart ? new Date(b.periodStart) : new Date(b.dueDate);
            return aDate.getTime() - bDate.getTime();
          })[0];

        const paidCount = tenantInvoices.filter(inv => inv.status === 'paid').length;
        const approvedCount = tenantInvoices.filter(inv => inv.status === 'approved' || inv.status === 'sent').length;
        
        // Count overdue invoices (sent but not paid, past due date)
        const overdueCount = tenantInvoices.filter(inv => {
          if (inv.status === 'paid' || inv.status === 'cancelled') return false;
          const dueDate = new Date(inv.dueDate);
          return dueDate < today && (inv.status === 'sent' || inv.status === 'approved');
        }).length;

        // Determine property address with multiple fallbacks
        let propertyAddress = 'No property';
        if (property) {
          propertyAddress = property.address || property.name || 'No property';
        } else if (tenantData.property_address) {
          propertyAddress = tenantData.property_address;
        }

        return {
          id: tenant.id,
          name: tenant.name,
          email: tenant.email,
          propertyId: property?.id || 
                      (tenant && 'property_id' in tenant ? tenant.property_id : undefined) || 
                      tenantData.property_id || 
                      undefined,
          propertyAddress,
          leaseStart: unitTenant?.lease_start_date || tenant.lease_start || tenantData.lease_start_date,
          leaseEnd: unitTenant?.lease_end_date || tenant.lease_end || tenantData.lease_end_date,
          monthlyRent: unitTenant?.rent_amount || tenant.monthly_rent || tenantData.monthly_rent || 0,
          rentDueDay: tenant.rent_due_day || tenantData.rent_due_day || 1,
          invoices: tenantInvoices,
          recipients,
          nextInvoice,
          paidCount,
          approvedCount,
          overdueCount,
        };
      });

      // Sort: tenants with next invoice needing approval first, then overdue, then by name
      tenantsWithInvoices.sort((a, b) => {
        if (a.overdueCount > 0 && b.overdueCount === 0) return -1;
        if (a.overdueCount === 0 && b.overdueCount > 0) return 1;
        if (a.nextInvoice && !b.nextInvoice) return -1;
        if (!a.nextInvoice && b.nextInvoice) return 1;
        return a.name.localeCompare(b.name);
      });

      setTenants(tenantsWithInvoices);
      return tenantsWithInvoices;
    } catch (error) {
      console.error('Error loading data:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (invoice: Invoice, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    
    console.log('🔵 Approve button clicked for invoice:', invoice.invoiceNumber);
    
    try {
      // Get current user
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {
        console.error('❌ Auth error:', authError);
        onSuccess?.('Authentication error. Please log in again.');
        return;
      }
      
      if (!user) {
        console.error('❌ No user found');
        onSuccess?.('You must be logged in to approve invoices');
        return;
      }

      console.log('✅ User authenticated:', user.id);

      // Use InvoiceService to approve
      const success = await InvoiceService.approveInvoice(invoice.id, user.id);

      if (!success) {
        console.error('❌ Approval failed');
        onSuccess?.('Failed to approve invoice. Check console for details or ensure you have permission.');
        return;
      }

      console.log('✅ Invoice approved!');
      onSuccess?.(`✅ Invoice ${invoice.invoiceNumber} approved! Ready to send.`);
      
      // Optimistic UI update: immediately update the selected tenant's invoice
      if (selectedTenant) {
        const updatedInvoices = selectedTenant.invoices.map(inv => 
          inv.id === invoice.id 
            ? { ...inv, status: 'approved' as const, approvalStatus: 'approved' as const, approvedAt: new Date().toISOString() }
            : inv
        );
        
        setSelectedTenant({
          ...selectedTenant,
          invoices: updatedInvoices,
          nextInvoice: selectedTenant.nextInvoice?.id === invoice.id ? undefined : selectedTenant.nextInvoice,
          approvedCount: selectedTenant.approvedCount + 1
        });
        
        console.log('⚡ UI updated optimistically');
      }
      
      // Store the selected tenant ID before reloading
      const selectedTenantId = selectedTenant?.id;
      
      // Reload data in the background to confirm changes
      // This allows the user to stay on the same tab
      loadData().then(freshTenants => {
        if (selectedTenantId && freshTenants.length > 0) {
          const updatedTenant = freshTenants.find(t => t.id === selectedTenantId);
          if (updatedTenant) {
            console.log('🔄 Confirming with fresh data:', updatedTenant.name);
            setSelectedTenant(updatedTenant);
          }
        }
        console.log('✅ Data confirmed from server');
      });
      
      console.log('✅ Approve action completed');
    } catch (error) {
      console.error('❌ Error in handleApprove:', error);
      onSuccess?.('Failed to approve invoice. Check console for details.');
    }
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getStatusBadge = (tenant: TenantWithInvoices) => {
    if (tenant.overdueCount > 0) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">
          <ExclamationTriangleIcon className="w-3.5 h-3.5" />
          {tenant.overdueCount} Overdue
        </span>
      );
    }
    if (tenant.nextInvoice) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
          <ClockIcon className="w-3.5 h-3.5" />
          Pending Approval
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
        <CheckCircleIcon className="w-3.5 h-3.5" />
        Up to Date
      </span>
    );
  };

  // Filter tenants
  const filteredTenants = tenants.filter(tenant => {
    // Search filter
    const matchesSearch = searchQuery === '' || 
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.propertyAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tenant.email && tenant.email.toLowerCase().includes(searchQuery.toLowerCase()));

    // Status filter
    let matchesStatus = true;
    if (filterStatus === 'needs_approval') {
      matchesStatus = !!tenant.nextInvoice;
    } else if (filterStatus === 'overdue') {
      matchesStatus = tenant.overdueCount > 0;
    } else if (filterStatus === 'up_to_date') {
      matchesStatus = !tenant.nextInvoice && tenant.overdueCount === 0;
    }

    return matchesSearch && matchesStatus;
  });

  // Calculate totals
  const totalTenants = tenants.length;
  const totalMonthlyRent = tenants.reduce((sum, t) => sum + t.monthlyRent, 0);
  const totalNeedingApproval = tenants.filter(t => t.nextInvoice).length;
  const totalOverdue = tenants.filter(t => t.overdueCount > 0).length;
  const isAutoMode = settings?.autoSendEnabled || false;

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Invoice Manager</h2>
          <p className="text-gray-500 mt-1">
            {isAutoMode ? 'Auto-approve is ON - invoices sent automatically' : 'Manage and send invoices to your tenants'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Notification Bell */}
          {(totalNeedingApproval > 0 || totalOverdue > 0) && !isAutoMode && (
            <div className="flex items-center gap-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg">
              <BellAlertIconSolid className="w-5 h-5 text-amber-500" />
              <span className="text-sm font-medium text-amber-700">
                {totalOverdue > 0 && `${totalOverdue} overdue`}
                {totalOverdue > 0 && totalNeedingApproval > 0 && ' • '}
                {totalNeedingApproval > 0 && `${totalNeedingApproval} pending approval`}
              </span>
            </div>
          )}
          <button
            onClick={() => setShowSettingsModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <Cog6ToothIcon className="w-4 h-4 mr-2" />
            Settings
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <UserGroupIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">Tenants</p>
              <p className="text-xl font-semibold text-gray-900">{totalTenants}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CurrencyIcon className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">Monthly Rent</p>
              <p className="text-xl font-semibold text-gray-900">{formatCurrency(totalMonthlyRent)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-amber-100 rounded-lg">
              <ClockIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">Pending Approval</p>
              <p className="text-xl font-semibold text-amber-600">{totalNeedingApproval}</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm text-gray-500">Overdue</p>
              <p className="text-xl font-semibold text-red-600">{totalOverdue}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search tenants by name, property, or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-5 h-5 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white"
          >
            <option value="all">All Tenants</option>
            <option value="needs_approval">Pending Approval ({totalNeedingApproval})</option>
            <option value="overdue">Overdue ({totalOverdue})</option>
            <option value="up_to_date">Up to Date</option>
          </select>
        </div>
      </div>

      {/* Tenant Grid */}
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-4 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 300px)' }}>
        {filteredTenants.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-lg shadow-sm">
            <DocumentTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {tenants.length === 0 ? 'No tenants found' : 'No matching tenants'}
            </h3>
            <p className="text-gray-500">
              {tenants.length === 0 
                ? 'Add tenants with lease information to see invoices' 
                : 'Try adjusting your search or filter criteria'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTenants.map((tenant) => {
              const hasPendingApproval = tenant.nextInvoice && !isAutoMode;
              const isSelected = selectedTenant?.id === tenant.id;
              
              return (
                <div
                  key={tenant.id}
                  onClick={() => setSelectedTenant(tenant)}
                  className={`bg-white rounded-lg shadow-sm border transition-all duration-200 hover:shadow-md flex flex-col cursor-pointer
                    ${isSelected ? 'ring-2 ring-blue-500 border-transparent' : 'border-gray-200'}
                    ${hasPendingApproval ? 'border-l-4 border-l-amber-500' : ''}
                    ${tenant.overdueCount > 0 ? 'border-l-4 border-l-red-500' : ''}
                  `}
                >
                  {/* Card Header */}
                  <div className="p-4 border-b border-gray-100 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm flex-shrink-0 ${
                        tenant.overdueCount > 0 
                          ? 'bg-red-100 text-red-600'
                          : tenant.nextInvoice 
                            ? 'bg-amber-100 text-amber-600' 
                            : 'bg-blue-100 text-blue-600'
                      }`}>
                        {tenant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-base font-semibold text-gray-900 truncate" title={tenant.name}>{tenant.name}</p>
                        <p className="text-xs text-gray-500 truncate" title={tenant.email}>{tenant.email || 'No email'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 space-y-4">
                    {/* Property */}
                    <div className="flex items-start gap-2">
                      <HomeIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <p className="text-sm text-gray-600 line-clamp-2" title={tenant.propertyAddress}>
                        {tenant.propertyAddress}
                      </p>
                    </div>

                    {/* Financials & Dates */}
                    <div className="pt-2 border-t border-gray-50 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 flex items-center gap-1">
                          <CurrencyIcon className="w-3 h-3" /> Monthly Rent
                        </p>
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(tenant.monthlyRent)}</p>
                      </div>
                      <div>
                        {tenant.nextInvoice ? (
                          <>
                            <p className="text-xs text-gray-500 flex items-center gap-1">
                              <ClockIcon className="w-3 h-3" /> Next Invoice
                            </p>
                            <p className="text-sm font-medium text-gray-900">{formatDate(tenant.nextInvoice.invoiceDate)}</p>
                            <p className="text-xs text-gray-400">Due: {formatDate(tenant.nextInvoice.dueDate)}</p>
                          </>
                        ) : (
                          <>
                            <p className="text-xs text-gray-500">Next Invoice</p>
                            <p className="text-sm text-gray-400">-</p>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Actions/Footer */}
                  <div className="px-4 py-3 bg-gray-50 rounded-b-lg border-t border-gray-100 flex items-center justify-between gap-2">
                    <div className="flex-1">
                      {getStatusBadge(tenant)}
                    </div>
                    
                    {hasPendingApproval && tenant.nextInvoice && (
                      <button
                        onClick={(e) => handleApprove(tenant.nextInvoice!, e)}
                        className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded shadow-sm text-white bg-amber-600 hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500"
                      >
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Side Panel */}
      {selectedTenant && (
        <TenantInvoicePanel
          tenant={selectedTenant}
          settings={settings}
          onClose={() => setSelectedTenant(null)}
          onApprove={handleApprove}
          onDataChange={async () => {
            // Reload in background without blocking UI
            const freshTenants = await loadData();
            if (selectedTenant?.id && freshTenants.length > 0) {
              const updatedTenant = freshTenants.find(t => t.id === selectedTenant.id);
              if (updatedTenant) {
                setSelectedTenant(updatedTenant);
              }
            }
          }}
          onSuccess={onSuccess}
        />
      )}

      {/* Invoice Settings Modal */}
      {showSettingsModal && (
        <InvoiceTemplateSettings
          onClose={() => setShowSettingsModal(false)}
          onSave={() => {
            setShowSettingsModal(false);
            loadSettings();
            onSuccess?.('Invoice settings saved!');
          }}
        />
      )}
    </div>
  );
};
