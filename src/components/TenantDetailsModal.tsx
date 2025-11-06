import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon, 
  UserIcon, 
  PhoneIcon, 
  EnvelopeIcon, 
  HomeIcon,
  CalendarIcon,
  CurrencyPoundIcon,
  ShieldCheckIcon,
  DocumentTextIcon,
  ClipboardDocumentCheckIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  InformationCircleIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import { SimplifiedTenant } from '../utils/simplifiedDataTransforms';
import { SimplifiedTenantService } from '../services/SimplifiedTenantService';

interface TenantDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: SimplifiedTenant | null;
  onTenantUpdate?: (tenant: SimplifiedTenant) => void;
  onStartOnboarding?: (tenant: SimplifiedTenant) => void;
}

export const TenantDetailsModal: React.FC<TenantDetailsModalProps> = ({
  isOpen,
  onClose,
  tenant,
  onTenantUpdate,
  onStartOnboarding,
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [editedTenant, setEditedTenant] = useState<SimplifiedTenant | null>(null);

  useEffect(() => {
    if (tenant) {
      setEditedTenant({ ...tenant });
    }
    setIsEditMode(true); // Open directly in edit mode for consistency with properties
    setError(null);
    setSuccessMessage(null);
  }, [tenant]);

  if (!isOpen || !tenant || !editedTenant) return null;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'Not set';
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(d);
  };

  const formatDateForInput = (date: Date | string | undefined) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  };

  const handleEdit = () => {
    setIsEditMode(true);
    setError(null);
    setSuccessMessage(null);
  };

  const handleCancel = () => {
    setEditedTenant({ ...tenant });
    setIsEditMode(false);
    setError(null);
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    if (!editedTenant) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Validate required fields
      if (!editedTenant.name.trim()) {
        throw new Error('Tenant name is required');
      }
      if (!editedTenant.email.trim()) {
        throw new Error('Email is required');
      }
      if (!editedTenant.phone.trim()) {
        throw new Error('Phone is required');
      }
      if (editedTenant.monthlyRent <= 0) {
        throw new Error('Monthly rent must be greater than 0');
      }
      if (editedTenant.depositAmount < 0) {
        throw new Error('Deposit amount cannot be negative');
      }

      // Only pass database-compatible fields (exclude computed fields like propertyAddress, rentStatus, daysOverdue)
      const updateData: Partial<SimplifiedTenant> = {
        name: editedTenant.name,
        email: editedTenant.email,
        phone: editedTenant.phone,
        leaseStart: editedTenant.leaseStart,
        leaseEnd: editedTenant.leaseEnd,
        monthlyRent: editedTenant.monthlyRent,
        depositAmount: editedTenant.depositAmount,
        depositWeeks: editedTenant.depositWeeks,
        rentDueDay: editedTenant.rentDueDay,
        onboardingStatus: editedTenant.onboardingStatus,
        onboardingProgress: editedTenant.onboardingProgress,
        onboardingNotes: editedTenant.onboardingNotes,
        onboardingCompletedAt: editedTenant.onboardingCompletedAt,
        onboardingData: editedTenant.onboardingData,
      };

      console.log('📤 Sending update data:', JSON.stringify(updateData, null, 2));

      // Update tenant in database
      const success = await SimplifiedTenantService.updateTenantOnboarding(
        editedTenant.id,
        updateData
      );

      if (success) {
        setSuccessMessage('Tenant details updated successfully!');
        setIsEditMode(false);
        
        // Notify parent component with the full edited tenant (including UI fields)
        if (onTenantUpdate) {
          onTenantUpdate(editedTenant);
        }

        // Clear success message after 3 seconds
        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        throw new Error('Failed to update tenant - Check browser console for details');
      }
    } catch (err) {
      console.error('❌ Error saving tenant:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes - Check browser console for details');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof SimplifiedTenant, value: any) => {
    setEditedTenant(prev => {
      if (!prev) return null;
      
      const updated = { ...prev, [field]: value };
      
      // Auto-calculate deposit_amount when monthly_rent or deposit_weeks changes
      if (field === 'monthlyRent' || field === 'depositWeeks') {
        if (updated.monthlyRent && updated.monthlyRent > 0 && updated.depositWeeks && updated.depositWeeks > 0) {
          // Calculate: monthly_rent * (deposit_weeks / 4.33)
          updated.depositAmount = Math.round((updated.monthlyRent * updated.depositWeeks / 4.33) * 100) / 100;
        }
      }
      
      return updated;
    });
  };

  const onboardingData = tenant.onboardingData;
  const hasOnboardingData = onboardingData && tenant.onboardingStatus === 'completed';
  const displayTenant = isEditMode ? editedTenant : tenant;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-gray-600 bg-opacity-50 z-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Side Panel */}
      <div 
        className="fixed inset-y-0 right-0 max-w-2xl w-full bg-white shadow-xl z-50 overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{displayTenant.name}</h2>
                <p className="text-sm text-gray-500">{isEditMode ? 'Edit Tenant Details' : 'Tenant Details'}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {!isEditMode && (
                <button
                  onClick={handleEdit}
                  className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <PencilIcon className="w-4 h-4" />
                  <span>Edit</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2 rounded-md hover:bg-gray-100"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* Success/Error Messages */}
          {successMessage && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm flex items-center">
              <CheckCircleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
              {successMessage}
            </div>
          )}
          {error && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm flex items-center">
              <XCircleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="px-6 py-6 space-y-6">
          {/* Property Information - Moved to top */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
              <HomeIcon className="w-5 h-5 mr-2 text-gray-600" />
              Property Details
            </h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500">Address</p>
                <p className="text-sm text-gray-900">{tenant.propertyAddress}</p>
              </div>
              {tenant.unitNumber && (
                <div>
                  <p className="text-xs text-gray-500">Unit/Room</p>
                  <p className="text-sm text-gray-900">{tenant.roomName || tenant.unitNumber}</p>
                </div>
              )}
            </div>
          </div>

          {/* Basic Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
              <UserIcon className="w-5 h-5 mr-2 text-gray-600" />
              Contact Information
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Full Name *</label>
                {isEditMode ? (
                  <input
                    type="text"
                    value={editedTenant.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Tenant name"
                  />
                ) : (
                  <p className="text-sm text-gray-900">{displayTenant.name}</p>
                )}
              </div>
              
              <div className="flex items-start space-x-3">
                <EnvelopeIcon className="w-5 h-5 text-gray-400 mt-1" />
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Email *</label>
                  {isEditMode ? (
                    <input
                      type="email"
                      value={editedTenant.email}
                      onChange={(e) => handleInputChange('email', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="email@example.com"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{displayTenant.email}</p>
                  )}
                </div>
              </div>
              
              <div className="flex items-start space-x-3">
                <PhoneIcon className="w-5 h-5 text-gray-400 mt-1" />
                <div className="flex-1">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Phone *</label>
                  {isEditMode ? (
                    <input
                      type="tel"
                      value={editedTenant.phone}
                      onChange={(e) => handleInputChange('phone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="07123 456789"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{displayTenant.phone}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Lease Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
              <DocumentTextIcon className="w-5 h-5 mr-2 text-gray-600" />
              Lease Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Lease Start</label>
                {isEditMode ? (
                  <input
                    type="date"
                    value={formatDateForInput(editedTenant.leaseStart)}
                    onChange={(e) => handleInputChange('leaseStart', new Date(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-sm text-gray-900 flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-1 text-gray-400" />
                    {formatDate(displayTenant.leaseStart)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Lease End</label>
                {isEditMode ? (
                  <input
                    type="date"
                    value={formatDateForInput(editedTenant.leaseEnd)}
                    onChange={(e) => handleInputChange('leaseEnd', new Date(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                ) : (
                  <p className="text-sm text-gray-900 flex items-center">
                    <CalendarIcon className="w-4 h-4 mr-1 text-gray-400" />
                    {formatDate(displayTenant.leaseEnd)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Monthly Rent (£)</label>
                {isEditMode ? (
                  <input
                    type="number"
                    value={editedTenant.monthlyRent}
                    onChange={(e) => handleInputChange('monthlyRent', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="1"
                  />
                ) : (
                  <p className="text-sm font-medium text-gray-900 flex items-center">
                    <CurrencyPoundIcon className="w-4 h-4 mr-1 text-gray-400" />
                    {formatCurrency(displayTenant.monthlyRent)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Rent Due Day</label>
                {isEditMode ? (
                  <select
                    value={editedTenant.rentDueDay || 1}
                    onChange={(e) => handleInputChange('rentDueDay', parseInt(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'}</option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-gray-900">{displayTenant.rentDueDay || 1}st of each month</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Deposit Amount (£)
                  {isEditMode && editedTenant.depositWeeks && editedTenant.monthlyRent && (
                    <span className="ml-2 text-xs text-blue-600 font-normal">(Auto-calculated)</span>
                  )}
                </label>
                {isEditMode ? (
                  <div className="relative">
                    <input
                      type="number"
                      value={editedTenant.depositAmount || 0}
                      onChange={(e) => {
                        // Only allow manual entry if deposit_weeks is not set
                        if (!editedTenant.depositWeeks) {
                          handleInputChange('depositAmount', parseFloat(e.target.value) || 0);
                        }
                      }}
                      readOnly={!!(editedTenant.depositWeeks && editedTenant.monthlyRent)}
                      className={`w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        editedTenant.depositWeeks && editedTenant.monthlyRent 
                          ? 'bg-gray-50 text-gray-600 cursor-not-allowed' 
                          : ''
                      }`}
                      min="0"
                      step="1"
                      title={editedTenant.depositWeeks && editedTenant.monthlyRent 
                        ? 'Deposit is automatically calculated from monthly rent and deposit weeks' 
                        : 'Enter deposit amount manually'}
                    />
                    {editedTenant.depositWeeks && editedTenant.monthlyRent && (
                      <div className="absolute right-3 top-2 text-xs text-gray-400">
                        Auto
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm font-medium text-gray-900 flex items-center">
                    <CurrencyPoundIcon className="w-4 h-4 mr-1 text-gray-400" />
                    {formatCurrency(displayTenant.depositAmount || 0)}
                    {displayTenant.depositWeeks && displayTenant.monthlyRent && (
                      <span className="ml-2 text-xs text-gray-400">(auto-calculated)</span>
                    )}
                  </p>
                )}
              </div>
              {(displayTenant.depositWeeks || isEditMode) && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Deposit (Weeks)</label>
                  {isEditMode ? (
                    <>
                      <select
                        value={editedTenant.depositWeeks || 4}
                        onChange={(e) => handleInputChange('depositWeeks', parseInt(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {[1, 2, 3, 4, 5].map(weeks => (
                          <option key={weeks} value={weeks}>{weeks} weeks</option>
                        ))}
                      </select>
                      {editedTenant.monthlyRent && editedTenant.depositWeeks && (
                        <p className="text-xs text-gray-500 mt-1">
                          Amount: £{Math.round((editedTenant.monthlyRent * 12) / 52 * editedTenant.depositWeeks)} ({editedTenant.depositWeeks} weeks)
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-900">{displayTenant.depositWeeks} weeks</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Onboarding Status */}
          {hasOnboardingData && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <CheckCircleIcon className="w-6 h-6 text-green-600" />
                  <div>
                    <h3 className="text-sm font-semibold text-green-900">Onboarding Completed</h3>
                    <p className="text-xs text-green-700">
                      {tenant.onboardingCompletedAt && `Completed on ${formatDate(tenant.onboardingCompletedAt)}`}
                    </p>
                  </div>
                </div>
              </div>

              {/* Credit Checks */}
              {onboardingData.creditChecks && onboardingData.creditChecks.length > 0 && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                    <ShieldCheckIcon className="w-5 h-5 mr-2 text-gray-600" />
                    Credit Checks
                  </h3>
                  <div className="space-y-3">
                    {onboardingData.creditChecks.map((check, index) => (
                      <div key={check.id || index} className="flex items-center justify-between p-3 bg-white rounded border border-gray-200">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{check.name}</p>
                          <p className="text-xs text-gray-500">{check.type === 'tenant' ? 'Tenant' : 'Guarantor'}</p>
                          {check.email && <p className="text-xs text-gray-500">{check.email}</p>}
                        </div>
                        <div className="flex items-center space-x-3">
                          {check.provider && (
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                              {check.provider}
                            </span>
                          )}
                          {check.status === 'completed' && check.result === 'passed' && (
                            <CheckCircleIcon className="w-5 h-5 text-green-600" />
                          )}
                          {check.status === 'failed' && (
                            <XCircleIcon className="w-5 h-5 text-red-600" />
                          )}
                          {check.status === 'pending' || check.status === 'ordered' && (
                            <ClockIcon className="w-5 h-5 text-yellow-600" />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tenancy Agreement */}
              {onboardingData.tenancyAgreement && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                    <DocumentTextIcon className="w-5 h-5 mr-2 text-gray-600" />
                    Tenancy Agreement
                  </h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Method</span>
                      <span className="text-sm font-medium text-gray-900 capitalize">
                        {onboardingData.tenancyAgreement.method === 'generate' ? 'Generated (AST)' : 'Uploaded Contract'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-700">Status</span>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        onboardingData.tenancyAgreement.status === 'signed' 
                          ? 'bg-green-100 text-green-800 border border-green-200' 
                          : onboardingData.tenancyAgreement.status === 'uploaded'
                          ? 'bg-blue-100 text-blue-800 border border-blue-200'
                          : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                      }`}>
                        {onboardingData.tenancyAgreement.status === 'signed' 
                          ? '✓ Signed' 
                          : onboardingData.tenancyAgreement.status === 'uploaded'
                          ? '✓ Uploaded'
                          : onboardingData.tenancyAgreement.status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                    </div>
                    {onboardingData.tenancyAgreement.generatedDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Generated Date</span>
                        <span className="text-sm text-gray-900">
                          {formatDate(onboardingData.tenancyAgreement.generatedDate)}
                        </span>
                      </div>
                    )}
                    {onboardingData.tenancyAgreement.signedDate && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">Signed Date</span>
                        <span className="text-sm text-gray-900">
                          {formatDate(onboardingData.tenancyAgreement.signedDate)}
                        </span>
                      </div>
                    )}
                    {onboardingData.tenancyAgreement.uploadedFileName && (
                      <div className="p-3 bg-white rounded border border-gray-200">
                        <div className="flex items-center space-x-2">
                          <DocumentTextIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700">Uploaded Contract</p>
                            <p className="text-xs text-gray-500 truncate">
                              {onboardingData.tenancyAgreement.uploadedFileName}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    {onboardingData.tenancyAgreement.docusignEnvelopeId && (
                      <div className="p-3 bg-white rounded border border-gray-200">
                        <div className="flex items-center space-x-2">
                          <ShieldCheckIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-gray-700">DocuSign Envelope</p>
                            <p className="text-xs text-gray-500 font-mono truncate">
                              {onboardingData.tenancyAgreement.docusignEnvelopeId}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    {/* Agreement Terms */}
                    {onboardingData.tenancyAgreement.questions && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-700 mb-3">Agreement Terms & Conditions</p>
                        <div className="grid grid-cols-2 gap-2">
                          <div className="flex items-center space-x-2">
                            {onboardingData.tenancyAgreement.questions.petsAllowed ? (
                              <CheckCircleIcon className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircleIcon className="w-4 h-4 text-red-600" />
                            )}
                            <span className="text-xs text-gray-600">Pets Allowed</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {onboardingData.tenancyAgreement.questions.smokingAllowed ? (
                              <CheckCircleIcon className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircleIcon className="w-4 h-4 text-red-600" />
                            )}
                            <span className="text-xs text-gray-600">Smoking Allowed</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {onboardingData.tenancyAgreement.questions.sublettingAllowed ? (
                              <CheckCircleIcon className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircleIcon className="w-4 h-4 text-red-600" />
                            )}
                            <span className="text-xs text-gray-600">Subletting</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {onboardingData.tenancyAgreement.questions.decoratingAllowed ? (
                              <CheckCircleIcon className="w-4 h-4 text-green-600" />
                            ) : (
                              <XCircleIcon className="w-4 h-4 text-red-600" />
                            )}
                            <span className="text-xs text-gray-600">Decorating</span>
                          </div>
                          {onboardingData.tenancyAgreement.questions.breakClause && (
                            <div className="flex items-center space-x-2 col-span-2">
                              <CheckCircleIcon className="w-4 h-4 text-green-600" />
                              <span className="text-xs text-gray-600">
                                Break Clause after {onboardingData.tenancyAgreement.questions.breakClauseMonths || 6} months
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Preparation Checklist */}
              {onboardingData.preparation && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-4 flex items-center">
                    <ClipboardDocumentCheckIcon className="w-5 h-5 mr-2 text-gray-600" />
                    Preparation Checklist
                  </h3>
                  <div className="space-y-2">
                    {onboardingData.preparation.type === 'concierge' && (
                      <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-xs text-blue-700">
                          <strong>Concierge Service Ordered</strong>
                          {onboardingData.preparation.conciergeOrderedDate && (
                            <> on {formatDate(onboardingData.preparation.conciergeOrderedDate)}</>
                          )}
                        </p>
                      </div>
                    )}
                    {onboardingData.preparation.checklist && onboardingData.preparation.checklist.length > 0 ? (
                      onboardingData.preparation.checklist.map((item, index) => (
                        <div key={item.id || index} className="flex items-center space-x-2">
                          {item.completed ? (
                            <CheckCircleIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                          ) : (
                            <div className="w-4 h-4 border-2 border-gray-300 rounded flex-shrink-0" />
                          )}
                          <span className={`text-sm ${item.completed ? 'text-gray-600 line-through' : 'text-gray-900'}`}>
                            {item.task}
                            {item.required && <span className="text-red-500 ml-1">*</span>}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-gray-500 italic">No checklist items</p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Onboarding Notes */}
          {tenant.onboardingNotes && (
            <div className="bg-gray-50 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-gray-900 mb-2 flex items-center">
                <InformationCircleIcon className="w-5 h-5 mr-2 text-gray-600" />
                Onboarding Notes
              </h3>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{tenant.onboardingNotes}</p>
            </div>
          )}

          {/* Not Onboarded Yet - With Start Button */}
          {!hasOnboardingData && tenant.onboardingStatus !== 'completed' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <InformationCircleIcon className="w-6 h-6 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-blue-900">
                      {tenant.onboardingStatus === 'not_started' ? 'Onboarding Not Started' : 'Onboarding In Progress'}
                    </h3>
                    <p className="text-xs text-blue-700 mt-1 mb-3">
                      {tenant.onboardingStatus === 'not_started' 
                        ? 'Complete the onboarding process to collect lease information, run credit checks, generate agreements, and more.'
                        : `Onboarding is ${tenant.onboardingProgress}% complete. Continue to complete the process and view all details here.`
                      }
                    </p>
                    {onStartOnboarding && (
                      <button
                        onClick={() => {
                          onStartOnboarding(tenant);
                          onClose();
                        }}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <ClipboardDocumentCheckIcon className="w-4 h-4 mr-2" />
                        {tenant.onboardingStatus === 'not_started' ? 'Start Onboarding' : 'Continue Onboarding'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4">
          {isEditMode ? (
            <div className="flex space-x-3">
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1 px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSaving ? (
                  <div className="flex items-center justify-center">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Saving...
                  </div>
                ) : (
                  'Save Changes'
                )}
              </button>
            </div>
          ) : (
            <button
              onClick={onClose}
              className="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </>
  );
};

