import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../lib/supabase';

interface TenantRegisterModalProps {
  tenantId: string;
  onClose: () => void;
  onTenantUpdate?: (updatedTenant: any) => void;
}

interface TenantRegisterData {
  tenant: any;
  history: any[];
  documents: any[];
  leaseHistory: any[];
  workflowHistory: any[];
  propertyInfo: any;
}

export const TenantRegisterModal: React.FC<TenantRegisterModalProps> = ({
  tenantId,
  onClose,
  onTenantUpdate
}) => {
  const [data, setData] = useState<TenantRegisterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editForm, setEditForm] = useState<any>({});

  useEffect(() => {
    loadTenantRegisterData();
  }, [tenantId]);

  const loadTenantRegisterData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load tenant data first
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

      if (tenantError) {
        throw new Error('Failed to load tenant data');
      }

      // Load lease information from unit_tenants table
      const { data: leaseInfo, error: leaseError } = await supabase
        .from('unit_tenants')
        .select(`
          *,
          units (
            id,
            unit_number,
            properties (
              id,
              name,
              address
            )
          )
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'active')
        .single();

      let propertyInfo = null;
      if (leaseInfo && leaseInfo.units && leaseInfo.units.properties) {
        propertyInfo = leaseInfo.units.properties;
      }

      if (tenantError) {
        throw new Error('Failed to load tenant data');
      }

      // Load workflow history for this tenant
      const { data: workflowHistory, error: workflowError } = await supabase
        .from('workflow_instances')
        .select(`
          *,
          workflow_templates(name, description)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

      const tenantData: TenantRegisterData = {
        tenant: tenant,
        history: [], // TODO: Implement proper history tracking
        documents: [], // TODO: Implement document management
        leaseHistory: leaseInfo ? [leaseInfo] : [], // Current lease info
        workflowHistory: workflowHistory || [],
        propertyInfo: propertyInfo
      };

      setData(tenantData);
      setEditForm({
        name: tenant.name,
        tenant_type: tenant.tenant_type || 'individual',
        contact_person: tenant.contact_person || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        status: tenant.status
      });
    } catch (err) {
      console.error('Error loading tenant register data:', err);
      setError('Failed to load tenant register data');
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = async (field: string, value: string) => {
    // Update form state
    setEditForm(prev => ({ ...prev, [field]: value }));
    
    // Auto-save to database
    try {
      const { data: updatedTenant, error } = await supabase
        .from('tenants')
        .update({
          [field]: value || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', tenantId)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      // Update local data
      setData(prev => prev ? { 
        ...prev, 
        tenant: updatedTenant
      } : null);
      
      // Notify parent component
      if (onTenantUpdate) {
        onTenantUpdate(updatedTenant);
      }
    } catch (err) {
      console.error('Error saving tenant:', err);
      setError('Failed to save tenant data');
    }
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-AU');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'inactive':
        return 'bg-gray-100 text-gray-800';
      case 'blacklisted':
        return 'bg-red-100 text-red-800';
      case 'prospective':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="text-center mt-4 text-gray-600">Loading tenant register...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Error</h3>
            <p className="text-gray-500 mb-4">{error}</p>
            <div className="flex space-x-3 justify-center">
              <button
                onClick={loadTenantRegisterData}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Try Again
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const renderContent = () => {
    return (
      <div className="space-y-6">
        {/* Header with tenant info and status badge */}
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center space-x-3">
              <span className="text-sm font-medium text-gray-500">{data.tenant.id.substring(0, 8)}</span>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(editForm.status || data.tenant.status)}`}>
                {(editForm.status || data.tenant.status).charAt(0).toUpperCase() + (editForm.status || data.tenant.status).slice(1)}
              </span>
            </div>
            <h3 className="text-lg font-medium text-gray-900 mt-1">{editForm.name || data.tenant.name}</h3>
            <p className="text-sm text-gray-500">
              {editForm.tenant_type?.charAt(0).toUpperCase() + editForm.tenant_type?.slice(1) || 'Individual'}
            </p>
          </div>
        </div>

        {/* Basic Information Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">Basic Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenant Name</label>
              <input
                type="text"
                value={editForm.name}
                onChange={(e) => handleFieldChange('name', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
              <input
                type="text"
                value={data.tenant.id.substring(0, 8)}
                disabled
                className="block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md shadow-sm text-sm text-gray-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={editForm.tenant_type}
                onChange={(e) => handleFieldChange('tenant_type', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="individual">Individual</option>
                <option value="company">Company</option>
                <option value="organization">Organization</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={editForm.status}
                onChange={(e) => handleFieldChange('status', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="blacklisted">Blacklisted</option>
                <option value="prospective">Prospective</option>
              </select>
            </div>
          </div>
        </div>

        {/* Contact Information Section */}
        <div>
          <h4 className="text-sm font-medium text-gray-900 mb-4">Contact Information</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Person</label>
              <input
                type="text"
                value={editForm.contact_person}
                onChange={(e) => handleFieldChange('contact_person', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="Primary contact person"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={editForm.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="email@example.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input
                type="tel"
                value={editForm.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>
        </div>

        {/* Current Lease Section */}
        {data.leaseHistory.length > 0 && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Current Lease</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lease Start Date</label>
                <input
                  type="text"
                  value={formatDate(data.leaseHistory[0].lease_start_date)}
                  disabled
                  className="block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md shadow-sm text-sm text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lease End Date</label>
                <input
                  type="text"
                  value={formatDate(data.leaseHistory[0].lease_end_date)}
                  disabled
                  className="block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md shadow-sm text-sm text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Rent</label>
                <input
                  type="text"
                  value={data.leaseHistory[0].rent_amount ? `$${data.leaseHistory[0].rent_amount}` : 'Not specified'}
                  disabled
                  className="block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md shadow-sm text-sm text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                <input
                  type="text"
                  value={data.leaseHistory[0].units?.unit_number || 'Not specified'}
                  disabled
                  className="block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md shadow-sm text-sm text-gray-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Property Information Section */}
        {data.propertyInfo && (
          <div>
            <h4 className="text-sm font-medium text-gray-900 mb-4">Property Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Property Name</label>
                <input
                  type="text"
                  value={data.propertyInfo.name}
                  disabled
                  className="block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md shadow-sm text-sm text-gray-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <input
                  type="text"
                  value={data.propertyInfo.address}
                  disabled
                  className="block w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-md shadow-sm text-sm text-gray-500"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50"
      onClick={handleBackdropClick}
    >
      <div 
        className="tenant-register-modal bg-white h-full w-1/3 min-w-[500px] shadow-xl flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="register-header p-6 border-b border-gray-200 bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Tenant Register</h2>
              <p className="text-sm text-gray-500">{editForm.name || data.tenant.name}</p>
            </div>
            <div className="header-actions flex items-center space-x-3">
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="register-content flex-1 overflow-y-auto p-6">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};