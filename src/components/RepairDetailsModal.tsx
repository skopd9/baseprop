import React, { useState, useEffect, useRef } from 'react';
import {
  XMarkIcon,
  WrenchScrewdriverIcon,
  HomeIcon,
  UserIcon,
  PhoneIcon,
  CurrencyPoundIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  TrashIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { RepairService, Repair as RepairServiceType } from '../services/RepairService';
import { ConfirmationDialog } from './ConfirmationDialog';

interface RepairDetailsModalProps {
  repair: RepairServiceType | null;
  isOpen: boolean;
  onClose: () => void;
  onRepairUpdate: (repair: RepairServiceType) => void;
  onRepairDelete: (repairId: string) => void;
}

export const RepairDetailsModal: React.FC<RepairDetailsModalProps> = ({
  repair,
  isOpen,
  onClose,
  onRepairUpdate,
  onRepairDelete
}) => {
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAssignContractor, setShowAssignContractor] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [originalRepair, setOriginalRepair] = useState<RepairServiceType | null>(null);
  const pendingCloseRef = useRef<(() => void) | null>(null);
  
  const [editedRepair, setEditedRepair] = useState<RepairServiceType | null>(null);
  const [contractorForm, setContractorForm] = useState({
    contractorName: '',
    contractorCompany: '',
    contractorPhone: '',
    scheduledDate: ''
  });

  useEffect(() => {
    if (repair) {
      setEditedRepair({ ...repair });
      setOriginalRepair({ ...repair });
      setContractorForm({
        contractorName: repair.contractor || '',
        contractorCompany: repair.contractorCompany || '',
        contractorPhone: repair.contractorPhone || '',
        scheduledDate: repair.scheduledDate ? repair.scheduledDate.toISOString().split('T')[0] : ''
      });
    }
    setIsEditMode(false);
    setError(null);
    setSuccessMessage(null);
    setShowAssignContractor(false);
    setShowCloseConfirm(false);
  }, [repair]);

  if (!isOpen || !repair || !editedRepair) return null;

  const formatCurrency = (amount: number | undefined) => {
    if (!amount) return 'Not set';
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
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(d);
  };

  const formatDateForInput = (date: Date | string | undefined) => {
    if (!date) return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toISOString().split('T')[0];
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'emergency':
        return 'bg-red-100 text-red-800 border-red-200';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-yellow-100 text-yellow-800';
    }
  };

  const handleEdit = () => {
    setIsEditMode(true);
    setError(null);
    setSuccessMessage(null);
  };

  // Check if there are unsaved changes
  const hasUnsavedChanges = (): boolean => {
    if (!originalRepair || !editedRepair || !isEditMode) return false;
    
    // Compare all editable fields
    const compareDates = (a: Date | undefined, b: Date | undefined): boolean => {
      if (!a && !b) return true;
      if (!a || !b) return false;
      return a.getTime() === b.getTime();
    };
    
    return (
      editedRepair.title !== originalRepair.title ||
      editedRepair.description !== originalRepair.description ||
      editedRepair.urgency !== originalRepair.urgency ||
      editedRepair.status !== originalRepair.status ||
      editedRepair.estimatedCost !== originalRepair.estimatedCost ||
      editedRepair.actualCost !== originalRepair.actualCost ||
      !compareDates(editedRepair.scheduledDate, originalRepair.scheduledDate) ||
      !compareDates(editedRepair.completedDate, originalRepair.completedDate) ||
      editedRepair.contractor !== originalRepair.contractor ||
      editedRepair.contractorCompany !== originalRepair.contractorCompany ||
      editedRepair.contractorPhone !== originalRepair.contractorPhone ||
      editedRepair.notes !== originalRepair.notes
    );
  };

  const handleClose = () => {
    if (isEditMode && hasUnsavedChanges()) {
      setShowCloseConfirm(true);
      pendingCloseRef.current = onClose;
    } else {
      onClose();
    }
  };

  const handleConfirmClose = () => {
    setShowCloseConfirm(false);
    if (pendingCloseRef.current) {
      pendingCloseRef.current();
      pendingCloseRef.current = null;
    }
    // Reset to original state
    if (originalRepair) {
      setEditedRepair({ ...originalRepair });
      setIsEditMode(false);
    }
  };

  const handleCancel = () => {
    if (repair && originalRepair) {
      setEditedRepair({ ...originalRepair });
      setContractorForm({
        contractorName: originalRepair.contractor || '',
        contractorCompany: originalRepair.contractorCompany || '',
        contractorPhone: originalRepair.contractorPhone || '',
        scheduledDate: originalRepair.scheduledDate ? originalRepair.scheduledDate.toISOString().split('T')[0] : ''
      });
    }
    setIsEditMode(false);
    setShowAssignContractor(false);
    setError(null);
    setSuccessMessage(null);
  };

  const handleSave = async () => {
    if (!editedRepair) return;

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updates: any = {};

      // Map UI urgency back to database priority
      const priorityMap: Record<string, 'low' | 'medium' | 'high' | 'urgent'> = {
        'low': 'low',
        'medium': 'medium',
        'high': 'high',
        'emergency': 'urgent'
      };

      // Update all editable fields
      if (editedRepair.title !== repair.title) {
        updates.title = editedRepair.title;
      }
      if (editedRepair.description !== repair.description) {
        updates.description = editedRepair.description;
      }
      if (editedRepair.urgency !== repair.urgency) {
        updates.priority = priorityMap[editedRepair.urgency];
        updates.isEmergency = editedRepair.urgency === 'emergency';
      }
      if (editedRepair.status !== repair.status) {
        updates.status = editedRepair.status;
      }
      if (editedRepair.estimatedCost !== repair.estimatedCost) {
        updates.estimatedCost = editedRepair.estimatedCost;
      }
      if (editedRepair.actualCost !== repair.actualCost) {
        updates.actualCost = editedRepair.actualCost;
      }
      if (editedRepair.scheduledDate?.getTime() !== repair.scheduledDate?.getTime()) {
        updates.scheduledDate = editedRepair.scheduledDate;
      }
      if (editedRepair.completedDate?.getTime() !== repair.completedDate?.getTime()) {
        updates.completedDate = editedRepair.completedDate;
      }
      if (editedRepair.contractor !== repair.contractor) {
        updates.contractorName = editedRepair.contractor;
      }
      if (editedRepair.contractorCompany !== repair.contractorCompany) {
        updates.contractorCompany = editedRepair.contractorCompany;
      }
      if (editedRepair.contractorPhone !== repair.contractorPhone) {
        updates.contractorPhone = editedRepair.contractorPhone;
      }
      if (editedRepair.notes !== repair.notes) {
        updates.notes = editedRepair.notes;
      }

      const updatedRepair = await RepairService.updateRepair(repair.id, updates);

      if (updatedRepair) {
        setSuccessMessage('Repair updated successfully!');
        setIsEditMode(false);
        
        // Update original repair data after successful save
        setOriginalRepair({ ...updatedRepair });
        setEditedRepair({ ...updatedRepair });
        
        if (onRepairUpdate) {
          onRepairUpdate(updatedRepair);
        }

        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        throw new Error('Failed to update repair');
      }
    } catch (err) {
      console.error('Error saving repair:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAssignContractor = async () => {
    if (!contractorForm.contractorName.trim()) {
      setError('Contractor name is required');
      return;
    }

    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updates: any = {
        contractorName: contractorForm.contractorName,
        contractorCompany: contractorForm.contractorCompany || undefined,
        contractorPhone: contractorForm.contractorPhone || undefined,
        status: 'scheduled' as const
      };

      if (contractorForm.scheduledDate) {
        updates.scheduledDate = new Date(contractorForm.scheduledDate);
      }

      const updatedRepair = await RepairService.updateRepair(repair.id, updates);

      if (updatedRepair) {
        setSuccessMessage('Contractor assigned successfully!');
        setShowAssignContractor(false);
        setIsEditMode(false);
        
        if (onRepairUpdate) {
          onRepairUpdate(updatedRepair);
        }

        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        throw new Error('Failed to assign contractor');
      }
    } catch (err) {
      console.error('Error assigning contractor:', err);
      setError(err instanceof Error ? err.message : 'Failed to assign contractor');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const success = await RepairService.deleteRepair(repair.id);

      if (success) {
        setShowDeleteConfirm(false);
        onClose();
        if (onRepairDelete) {
          onRepairDelete(repair.id);
        }
      } else {
        throw new Error('Failed to delete repair');
      }
    } catch (err) {
      console.error('Error deleting repair:', err);
      setError(err instanceof Error ? err.message : 'Failed to delete repair');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleMarkComplete = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const updates = {
        status: 'completed' as const,
        completedDate: new Date()
      };

      const updatedRepair = await RepairService.updateRepair(repair.id, updates);

      if (updatedRepair) {
        setSuccessMessage('Repair marked as completed!');
        setIsEditMode(false);
        
        if (onRepairUpdate) {
          onRepairUpdate(updatedRepair);
        }

        setTimeout(() => {
          setSuccessMessage(null);
        }, 3000);
      } else {
        throw new Error('Failed to mark repair as complete');
      }
    } catch (err) {
      console.error('Error marking repair complete:', err);
      setError(err instanceof Error ? err.message : 'Failed to mark repair as complete');
    } finally {
      setIsSaving(false);
    }
  };

  const handleInputChange = (field: keyof RepairServiceType, value: any) => {
    setEditedRepair(prev => prev ? { ...prev, [field]: value } : null);
  };

  const displayRepair = isEditMode ? editedRepair : repair;
  const canAssignContractor = !repair.contractor && ['reported', 'acknowledged', 'scheduled'].includes(repair.status);
  const canMarkComplete = repair.status !== 'completed' && repair.status !== 'cancelled';

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-25 z-40"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div 
        className="fixed right-0 top-0 h-full w-1/3 min-w-[600px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <WrenchScrewdriverIcon className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Repair Details</h2>
              <p className="text-sm text-gray-500">{displayRepair?.title || 'Repair Information'}</p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            {!isEditMode && canAssignContractor && (
              <button
                onClick={() => setShowAssignContractor(true)}
                className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md bg-white hover:bg-gray-50"
              >
                Assign Contractor
              </button>
            )}
            {!isEditMode && canMarkComplete && (
              <button
                onClick={handleMarkComplete}
                className="px-3 py-1.5 text-sm border border-transparent text-white rounded-md bg-green-600 hover:bg-green-700"
              >
                Mark Complete
              </button>
            )}
            {!isEditMode && (
              <button
                onClick={handleEdit}
                className="px-3 py-1.5 text-sm border border-gray-300 text-gray-700 rounded-md bg-white hover:bg-gray-50"
              >
                Edit
              </button>
            )}
            <button
              onClick={handleClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {/* Success Message */}
          {successMessage && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <CheckCircleIcon className="w-5 h-5 text-green-600" />
                <p className="text-sm font-medium text-green-800">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center space-x-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                <p className="text-sm font-medium text-red-800">{error}</p>
              </div>
            </div>
          )}

          {/* Assign Contractor Form */}
          {showAssignContractor && (
            <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-sm font-medium text-blue-900 mb-4">Assign Contractor</h3>
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Contractor Name *
                  </label>
                  <input
                    type="text"
                    value={contractorForm.contractorName}
                    onChange={(e) => setContractorForm({...contractorForm, contractorName: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="John Smith"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Company (Optional)
                  </label>
                  <input
                    type="text"
                    value={contractorForm.contractorCompany}
                    onChange={(e) => setContractorForm({...contractorForm, contractorCompany: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="ABC Contractors Ltd"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Phone (Optional)
                  </label>
                  <input
                    type="tel"
                    value={contractorForm.contractorPhone}
                    onChange={(e) => setContractorForm({...contractorForm, contractorPhone: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+44 7700 900000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Scheduled Date (Optional)
                  </label>
                  <input
                    type="date"
                    value={contractorForm.scheduledDate}
                    onChange={(e) => setContractorForm({...contractorForm, scheduledDate: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={handleAssignContractor}
                    disabled={isSaving}
                    className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Assigning...' : 'Assign Contractor'}
                  </button>
                  <button
                    onClick={() => {
                      setShowAssignContractor(false);
                      setContractorForm({
                        contractorName: repair.contractor || '',
                        contractorCompany: repair.contractorCompany || '',
                        contractorPhone: repair.contractorPhone || '',
                        scheduledDate: repair.scheduledDate ? repair.scheduledDate.toISOString().split('T')[0] : ''
                      });
                    }}
                    className="px-3 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Status and Urgency Badges */}
            <div className="flex items-center space-x-2">
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(displayRepair.urgency)}`}>
                {displayRepair.urgency}
              </span>
              <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(displayRepair.status)}`}>
                {displayRepair.status.replace('_', ' ')}
              </span>
            </div>

            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title
              </label>
              {isEditMode ? (
                <input
                  type="text"
                  value={editedRepair?.title || ''}
                  onChange={(e) => handleInputChange('title', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              ) : (
                <p className="text-gray-900">{displayRepair.title}</p>
              )}
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              {isEditMode ? (
                <textarea
                  value={editedRepair?.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              ) : (
                <p className="text-gray-900 whitespace-pre-wrap">{displayRepair.description || 'No description'}</p>
              )}
            </div>

            {/* Property Information */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Property Information</h3>
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm">
                  <HomeIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{displayRepair.propertyAddress}</span>
                </div>
                {displayRepair.tenantName && (
                  <div className="flex items-center space-x-2 text-sm">
                    <UserIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-700">Reported by: {displayRepair.tenantName}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Dates</h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <CalendarIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">Reported: {formatDate(displayRepair.reportedDate)}</span>
                </div>
                {isEditMode ? (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Scheduled Date</label>
                      <input
                        type="date"
                        value={editedRepair?.scheduledDate ? formatDateForInput(editedRepair.scheduledDate) : ''}
                        onChange={(e) => handleInputChange('scheduledDate', e.target.value ? new Date(e.target.value) : undefined)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Completed Date</label>
                      <input
                        type="date"
                        value={editedRepair?.completedDate ? formatDateForInput(editedRepair.completedDate) : ''}
                        onChange={(e) => handleInputChange('completedDate', e.target.value ? new Date(e.target.value) : undefined)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </>
                ) : (
                  <>
                    {displayRepair.scheduledDate && (
                      <div className="flex items-center space-x-2">
                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">Scheduled: {formatDate(displayRepair.scheduledDate)}</span>
                      </div>
                    )}
                    {displayRepair.completedDate && (
                      <div className="flex items-center space-x-2">
                        <CalendarIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">Completed: {formatDate(displayRepair.completedDate)}</span>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Contractor Information */}
            {(displayRepair.contractor || isEditMode) && (
              <div className="border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Contractor Information</h3>
                {isEditMode ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Contractor Name</label>
                      <input
                        type="text"
                        value={editedRepair?.contractor || ''}
                        onChange={(e) => handleInputChange('contractor', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Company</label>
                      <input
                        type="text"
                        value={editedRepair?.contractorCompany || ''}
                        onChange={(e) => handleInputChange('contractorCompany', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={editedRepair?.contractorPhone || ''}
                        onChange={(e) => handleInputChange('contractorPhone', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm">
                    {displayRepair.contractor && (
                      <div className="flex items-center space-x-2">
                        <UserIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">{displayRepair.contractor}</span>
                      </div>
                    )}
                    {displayRepair.contractorCompany && (
                      <div className="flex items-center space-x-2">
                        <BuildingOfficeIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">{displayRepair.contractorCompany}</span>
                      </div>
                    )}
                    {displayRepair.contractorPhone && (
                      <div className="flex items-center space-x-2">
                        <PhoneIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-gray-700">{displayRepair.contractorPhone}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Costs */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Costs</h3>
              {isEditMode ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Estimated Cost (£)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <CurrencyPoundIcon className="w-4 h-4 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editedRepair?.estimatedCost || ''}
                        onChange={(e) => handleInputChange('estimatedCost', e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Actual Cost (£)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <CurrencyPoundIcon className="w-4 h-4 text-gray-400" />
                      </div>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editedRepair?.actualCost || ''}
                        onChange={(e) => handleInputChange('actualCost', e.target.value ? parseFloat(e.target.value) : undefined)}
                        className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-2 text-sm">
                  {displayRepair.estimatedCost && (
                    <div className="flex items-center space-x-2">
                      <CurrencyPoundIcon className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">Estimated: {formatCurrency(displayRepair.estimatedCost)}</span>
                    </div>
                  )}
                  {displayRepair.actualCost && (
                    <div className="flex items-center space-x-2">
                      <CurrencyPoundIcon className="w-4 h-4 text-green-600" />
                      <span className="text-gray-700 font-medium">Actual: {formatCurrency(displayRepair.actualCost)}</span>
                    </div>
                  )}
                  {!displayRepair.estimatedCost && !displayRepair.actualCost && (
                    <p className="text-gray-500">No cost information</p>
                  )}
                </div>
              )}
            </div>

            {/* Status */}
            {isEditMode && (
              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={editedRepair?.status || 'reported'}
                  onChange={(e) => handleInputChange('status', e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="reported">Reported</option>
                  <option value="acknowledged">Acknowledged</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            )}

            {/* Urgency */}
            {isEditMode && (
              <div className="border-t border-gray-200 pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Urgency
                </label>
                <select
                  value={editedRepair?.urgency || 'medium'}
                  onChange={(e) => handleInputChange('urgency', e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
            )}

            {/* Notes */}
            <div className="border-t border-gray-200 pt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes
              </label>
              {isEditMode ? (
                <textarea
                  value={editedRepair?.notes || ''}
                  onChange={(e) => handleInputChange('notes', e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="Additional notes..."
                />
              ) : (
                <p className="text-gray-900 whitespace-pre-wrap">{displayRepair.notes || 'No notes'}</p>
              )}
            </div>
          </div>
        </div>

        {/* Footer - Sticky at bottom */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 shadow-lg flex-shrink-0">
          <div className="flex items-center justify-between">
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-md transition-colors flex items-center space-x-2"
            >
              <TrashIcon className="w-4 h-4" />
              <span>Delete Repair</span>
            </button>
            
            <div className="flex space-x-3">
              {isEditMode && (
                <>
                  <button
                    onClick={handleCancel}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving || !hasUnsavedChanges()}
                    className="px-4 py-2 text-sm bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                        Saving...
                      </>
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                </>
              )}
              {!isEditMode && (
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showDeleteConfirm}
        title="Delete Repair"
        message="Are you sure you want to delete this repair? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="warning"
        onConfirm={handleDelete}
        onCancel={() => setShowDeleteConfirm(false)}
      />

      {/* Close Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={showCloseConfirm}
        title="Unsaved Changes"
        message="You have unsaved changes. Are you sure you want to close without saving?"
        confirmText="Discard Changes"
        cancelText="Cancel"
        type="warning"
        onConfirm={handleConfirmClose}
        onCancel={() => {
          setShowCloseConfirm(false);
          pendingCloseRef.current = null;
        }}
      />
    </>
  );
};

