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
      `This will delete all existing invoices for ${tenant.name} and create new ones with the correct invoice dates based on your current settings.\n\n` +
      `Are you sure you want to continue?`
    )) {
      return;
    }

    setRegenerating(true);
    try {
      // Get organization ID from first invoice or tenant
      const organizationId = tenant.invoices[0]?.organizationId;
      if (!organizationId) {
        onSuccess('Could not find organization ID');
        return;
      }

      // Get invoice settings
      const settings = await InvoiceService.getInvoiceSettings(organizationId);
      const invoiceDateDaysBeforeRent = settings?.invoiceDateDaysBeforeRent ?? 7;

      // Delete all existing invoices for this tenant
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
      const leaseStart = tenant.leaseStart ? new Date(tenant.leaseStart) : new Date();
      const leaseEnd = tenant.leaseEnd ? new Date(tenant.leaseEnd) : new Date(leaseStart.getTime() + 365 * 24 * 60 * 60 * 1000);

      // Regenerate invoices with new settings
      await InvoiceService.generateInvoiceSchedule({
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
        invoiceDateDaysBeforeRent,
      });

      onSuccess(`Successfully regenerated ${tenant.name}'s invoices with correct invoice dates!`);
      onComplete();
    } catch (error) {
      console.error('Error regenerating invoices:', error);
      onSuccess('Failed to regenerate invoices');
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
