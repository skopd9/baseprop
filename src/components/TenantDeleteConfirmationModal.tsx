import React from 'react';
import { XMarkIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { SimplifiedTenant } from '../utils/simplifiedDataTransforms';

interface TenantDeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    tenant: SimplifiedTenant | null;
    isDeleting: boolean;
}

export const TenantDeleteConfirmationModal: React.FC<TenantDeleteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    tenant,
    isDeleting,
}) => {
    if (!isOpen || !tenant) return null;

    return (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-lg bg-white">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
                            <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
                        </div>
                        <h3 className="text-lg font-semibold text-gray-900">Delete Tenant</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
                        disabled={isDeleting}
                    >
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                <div className="mb-6">
                    <p className="text-sm text-gray-600 mb-4">
                        Are you sure you want to delete <strong>{tenant.name}</strong>?
                    </p>
                    <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <div className="text-sm text-red-700">
                            <p className="font-medium mb-1">This action cannot be undone.</p>
                            <p>The tenant will be permanently removed from:</p>
                            <ul className="list-disc list-inside mt-2 space-y-1">
                                <li>{tenant.propertyAddress}</li>
                                {tenant.unitNumber && <li>{tenant.unitNumber}</li>}
                                <li>All associated lease information</li>
                            </ul>
                        </div>
                    </div>
                </div>

                <div className="flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDeleting ? (
                            <div className="flex items-center">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Deleting...
                            </div>
                        ) : (
                            'Delete Tenant'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};