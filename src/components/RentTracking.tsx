import React, { useState } from 'react';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { SimplifiedProperty, SimplifiedTenant } from '../utils/simplifiedDataTransforms';
import { InvoiceManager } from './InvoiceManager';

interface RentTrackingProps {
  properties: SimplifiedProperty[];
  tenants: SimplifiedTenant[];
}

export const RentTracking: React.FC<RentTrackingProps> = ({
  properties,
  tenants
}) => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  return (
    <div className="space-y-4">
      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-5 h-5 text-green-600" />
            <p className="text-green-700">{successMessage}</p>
          </div>
          <button onClick={() => setSuccessMessage(null)} className="text-green-600 hover:text-green-800">
            <XCircleIcon className="w-5 h-5" />
          </button>
        </div>
      )}

      {/* Invoice Manager */}
      <InvoiceManager 
        onSuccess={(message) => {
          setSuccessMessage(message);
          setTimeout(() => setSuccessMessage(null), 3000);
        }} 
      />
    </div>
  );
};
