import React, { useState } from 'react';
import { ArrowPathIcon } from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';
import { InvoiceService } from '../services/InvoiceService';
import { TenantWithInvoices } from './InvoiceManager';

interface RegenerateInvoicesButtonProps {
  tenant: TenantWithInvoices;
  onSuccess: (message: string) => void;
  onComplete: () => void;
}

export const RegenerateInvoicesButton: React.FC<RegenerateInvoicesButtonProps> = ({
  tenant,
  onSuccess,
  onComplete,
}) => {
  const [regenerating, setRegenerating] = useState(false);

  const handleRegenerate = async () => {
    if (!confirm(
      `This will delete all existing invoices for ${tenant.name} and create new ones based on their lease.\n\n` +
      `Are you sure you want to continue?`
    )) {
      return;
    }

    setRegenerating(true);
    try {
      console.log('🔄 Starting invoice regeneration for:', tenant.name);
      console.log('Tenant data:', {
        id: tenant.id,
        leaseStart: tenant.leaseStart,
        leaseEnd: tenant.leaseEnd,
        monthlyRent: tenant.monthlyRent,
        rentDueDay: tenant.rentDueDay,
        propertyId: tenant.propertyId,
      });

      // Validate required fields
      if (!tenant.leaseStart || !tenant.monthlyRent) {
        onSuccess('Tenant is missing lease start date or monthly rent. Please update tenant details first.');
        return;
      }

      // Get organization ID from tenant
      let organizationId = tenant.invoices[0]?.organizationId;
      
      // If no invoices, get organization ID from the tenant's property
      if (!organizationId) {
        console.log('No organization ID from invoices, fetching from tenant...');
        const { data: tenantData } = await supabase
          .from('tenants')
          .select('organization_id')
          .eq('id', tenant.id)
          .single();
        
        organizationId = tenantData?.organization_id;
        console.log('Organization ID from tenant:', organizationId);
      }

      if (!organizationId) {
        onSuccess('Could not find organization ID');
        return;
      }

      // Delete all existing invoices for this tenant
      console.log('Deleting existing invoices...');
      const { error: deleteError } = await supabase
        .from('invoices')
        .delete()
        .eq('tenant_id', tenant.id);

      if (deleteError) {
        console.error('Error deleting invoices:', deleteError);
        onSuccess('Failed to delete existing invoices');
        return;
      }

      // Parse lease dates
      const leaseStart = new Date(tenant.leaseStart);
      const leaseEnd = tenant.leaseEnd ? new Date(tenant.leaseEnd) : new Date(leaseStart.getTime() + 365 * 24 * 60 * 60 * 1000);

      console.log('Generating invoices with:', {
        organizationId,
        leaseStart: leaseStart.toISOString(),
        leaseEnd: leaseEnd.toISOString(),
        monthlyRent: tenant.monthlyRent,
        rentDueDay: tenant.rentDueDay,
      });

      // Regenerate invoices
      const newInvoices = await InvoiceService.generateInvoiceSchedule({
        organizationId,
        tenantId: tenant.id,
        propertyId: tenant.propertyId,
        tenantName: tenant.name,
        tenantEmail: tenant.email,
        propertyAddress: tenant.propertyAddress,
        leaseStart,
        leaseEnd,
        monthlyRent: tenant.monthlyRent,
        rentDueDay: tenant.rentDueDay,
      });

      console.log(`✅ Successfully generated ${newInvoices.length} invoices`);
      onSuccess(`Successfully generated ${newInvoices.length} invoices for ${tenant.name}!`);
      
      // Wait a moment for DB to update, then refresh
      setTimeout(() => {
        onComplete();
      }, 500);
    } catch (error) {
      console.error('❌ Error regenerating invoices:', error);
      onSuccess(`Failed to regenerate invoices: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setRegenerating(false);
    }
  };

  return (
    <button
      onClick={handleRegenerate}
      disabled={regenerating}
      className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      title="Regenerate all invoices with correct invoice dates"
    >
      <ArrowPathIcon className={`w-4 h-4 ${regenerating ? 'animate-spin' : ''}`} />
      {regenerating ? 'Regenerating...' : 'Regenerate Invoices'}
    </button>
  );
};
