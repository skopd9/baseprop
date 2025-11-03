import React from 'react';
import { XMarkIcon } from '@heroicons/react/24/outline';
import SimpleTenancyCreationWizard from './SimpleTenancyCreationWizard';
import { SimplifiedTenant } from '../utils/simplifiedDataTransforms';


interface TenancyManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: SimplifiedTenant | null;
  properties: any[];
  onTenancyCreated: (tenant: any) => void;
}

const TenancyManagementModal: React.FC<TenancyManagementModalProps> = ({
  isOpen,
  onClose,
  tenant,
  properties,
  onTenancyCreated
}) => {
  if (!isOpen) return null;

  const handleTenancyCreated = (newTenant: any) => {
    onTenancyCreated(newTenant);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          <div className="bg-white">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-medium text-gray-900">
                  {tenant ? `Manage Tenancy: ${tenant.name}` : 'Create New Tenancy'}
                </h3>
                <p className="text-sm text-gray-500">
                  {tenant ? `${tenant.propertyAddress} - ${tenant.room || 'Room not specified'}` : 'Set up a new tenancy with our simple 4-step process'}
                </p>
              </div>
              <button
                onClick={onClose}
                className="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-4">
              <SimpleTenancyCreationWizard
                properties={properties}
                onTenancyCreated={handleTenancyCreated}
                existingTenant={tenant}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TenancyManagementModal;