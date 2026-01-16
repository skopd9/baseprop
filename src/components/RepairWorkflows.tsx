import React, { useState, useEffect } from 'react';
import { 
  WrenchScrewdriverIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyPoundIcon,
  UserIcon,
  HomeIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import { SimplifiedProperty, SimplifiedTenant } from '../utils/simplifiedDataTransforms';
import { RepairService, Repair as RepairServiceType } from '../services/RepairService';
import { RepairDetailsModal } from './RepairDetailsModal';
import { useOrganization } from '../contexts/OrganizationContext';

interface RepairWorkflowsProps {
  properties: SimplifiedProperty[];
  tenants: SimplifiedTenant[];
  onLogRepair?: (repair: any) => void;
}

// Map status for UI display
type UIStatus = 'pending' | 'in_progress' | 'completed';
type DBStatus = 'reported' | 'acknowledged' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

interface Repair extends Omit<RepairServiceType, 'status'> {
  status: UIStatus;
}

export const RepairWorkflows: React.FC<RepairWorkflowsProps> = ({
  properties,
  tenants,
  onLogRepair
}) => {
  const { currentOrganization } = useOrganization();
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [originalRepairs, setOriginalRepairs] = useState<RepairServiceType[]>([]); // Store original DB format
  const [isLoading, setIsLoading] = useState(true);
  const [showRepairForm, setShowRepairForm] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<RepairServiceType | null>(null);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [repairForm, setRepairForm] = useState({
    propertyId: '',
    tenantId: '',
    description: '',
    urgency: 'medium' as 'low' | 'medium' | 'high' | 'emergency',
    estimatedCost: '',
    notes: ''
  });

  // Load repairs on mount and when organization changes
  useEffect(() => {
    if (currentOrganization?.id) {
      loadRepairs();
    }
  }, [currentOrganization?.id]);

  const loadRepairs = async () => {
    if (!currentOrganization?.id) return;
    
    setIsLoading(true);
    try {
      const repairsData = await RepairService.getRepairs(currentOrganization.id);
      // Store original repairs for modal access
      setOriginalRepairs(repairsData);
      // Transform repairs to match UI expectations
      const transformedRepairs = repairsData.map(mapDBRepairToUI);
      setRepairs(transformedRepairs);
    } catch (error) {
      console.error('Error loading repairs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Map database status to UI status
  const mapDBRepairToUI = (dbRepair: RepairServiceType): Repair => {
    let uiStatus: UIStatus = 'pending';
    
    if (dbRepair.status === 'completed') {
      uiStatus = 'completed';
    } else if (dbRepair.status === 'in_progress') {
      uiStatus = 'in_progress';
    } else {
      // 'reported', 'acknowledged', 'scheduled' -> 'pending'
      uiStatus = 'pending';
    }

    return {
      ...dbRepair,
      status: uiStatus
    };
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
      case 'pending':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  const handleLogRepair = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsSubmitting(true);
    
    try {
      // Map urgency to priority for database
      const priority = repairForm.urgency === 'emergency' ? 'urgent' : repairForm.urgency;
      
      const newRepair = await RepairService.createRepair({
        propertyId: repairForm.propertyId,
        tenantId: repairForm.tenantId || undefined,
        title: repairForm.description,
        description: repairForm.description,
        priority: priority as 'low' | 'medium' | 'high' | 'urgent',
        status: 'reported',
        reportedDate: new Date(),
        estimatedCost: repairForm.estimatedCost ? parseFloat(repairForm.estimatedCost) : undefined,
        isEmergency: repairForm.urgency === 'emergency',
        notes: repairForm.notes || undefined
      });

      if (newRepair) {
        // Add to local state (both original and UI format)
        setOriginalRepairs([newRepair, ...originalRepairs]);
        const uiRepair = mapDBRepairToUI(newRepair);
        setRepairs([uiRepair, ...repairs]);
        
        setShowRepairForm(false);
        setRepairForm({
          propertyId: '',
          tenantId: '',
          description: '',
          urgency: 'medium',
          estimatedCost: '',
          notes: ''
        });
        setErrorMessage(null);

        if (onLogRepair) {
          onLogRepair(newRepair);
        }
      }
    } catch (error) {
      console.error('Error creating repair:', error);
      const errorMsg = error instanceof Error ? error.message : 'Failed to create repair. Please try again.';
      setErrorMessage(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const pendingRepairs = repairs.filter(r => r.status === 'pending');
  const inProgressRepairs = repairs.filter(r => r.status === 'in_progress');
  const completedRepairs = repairs.filter(r => r.status === 'completed');
  const emergencyRepairs = repairs.filter(r => r.urgency === 'emergency' && r.status !== 'completed');

  const propertyTenants = repairForm.propertyId 
    ? tenants.filter(t => t.propertyId === repairForm.propertyId)
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Repairs & Maintenance</h2>
          <p className="text-gray-600">Track and manage property repairs</p>
        </div>
        <button
          onClick={() => setShowRepairForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-orange-600 hover:bg-orange-700"
        >
          <WrenchScrewdriverIcon className="w-4 h-4 mr-2" />
          Log Repair
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-gray-100 rounded-lg">
              <ClockIcon className="w-6 h-6 text-gray-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-gray-900">{pendingRepairs.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <WrenchScrewdriverIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">In Progress</p>
              <p className="text-2xl font-bold text-gray-900">{inProgressRepairs.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Emergency</p>
              <p className="text-2xl font-bold text-gray-900">{emergencyRepairs.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-gray-900">{completedRepairs.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Repairs List */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">All Repairs</h3>
        </div>
        
        {isLoading ? (
          <div className="p-12 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            <p className="mt-4 text-gray-500">Loading repairs...</p>
          </div>
        ) : repairs.length === 0 ? (
          <div className="p-12 text-center">
            <WrenchScrewdriverIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No repairs logged</h3>
            <p className="mt-1 text-sm text-gray-500">Get started by logging your first repair.</p>
            <div className="mt-6">
              <button
                onClick={() => setShowRepairForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
              >
                <WrenchScrewdriverIcon className="w-4 h-4 mr-2" />
                Log Repair
              </button>
            </div>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {repairs.map((repair) => {
              // Find the original DB repair to preserve all data
              const originalRepair = originalRepairs.find(r => r.id === repair.id);
              const repairForModal = originalRepair || repair as RepairServiceType;

              return (
                <div 
                  key={repair.id} 
                  className="p-6 hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => {
                    setSelectedRepair(repairForModal);
                    setShowRepairModal(true);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className="flex-shrink-0">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <WrenchScrewdriverIcon className="w-5 h-5 text-gray-600" />
                        </div>
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-2">
                          <p className="text-sm font-medium text-gray-900">
                            {repair.title || repair.description}
                          </p>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getUrgencyColor(repair.urgency)}`}>
                            {repair.urgency}
                          </span>
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(repair.status)}`}>
                            {repair.status.replace('_', ' ')}
                          </span>
                        </div>
                        
                        <div className="space-y-1 text-sm text-gray-500">
                          <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-1">
                              <HomeIcon className="w-4 h-4" />
                              <span className="truncate">{repair.propertyAddress}</span>
                            </div>
                            {repair.tenantName && (
                              <div className="flex items-center space-x-1">
                                <UserIcon className="w-4 h-4" />
                                <span>Reported by: {repair.tenantName}</span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4">
                            <span>Reported: {formatDate(repair.reportedDate)}</span>
                            {repair.scheduledDate && (
                              <span>Scheduled: {formatDate(repair.scheduledDate)}</span>
                            )}
                            {repair.completedDate && (
                              <span>Completed: {formatDate(repair.completedDate)}</span>
                            )}
                          </div>
                          
                          {repair.contractor && (
                            <div className="flex items-center space-x-4">
                              <span>Contractor: {repair.contractor}</span>
                              {repair.contractorPhone && (
                                <div className="flex items-center space-x-1">
                                  <PhoneIcon className="w-3 h-3" />
                                  <span>{repair.contractorPhone}</span>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {repair.notes && (
                            <p className="text-gray-600 mt-2 line-clamp-2">{repair.notes}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end space-y-2 ml-4">
                      {repair.estimatedCost && (
                        <div className="flex items-center space-x-1 text-sm">
                          <CurrencyPoundIcon className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-600">
                            Est: {formatCurrency(repair.estimatedCost)}
                          </span>
                        </div>
                      )}
                      
                      {repair.actualCost && (
                        <div className="flex items-center space-x-1 text-sm">
                          <CurrencyPoundIcon className="w-4 h-4 text-green-600" />
                          <span className="font-medium text-green-600">
                            Actual: {formatCurrency(repair.actualCost)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Repair Details Modal */}
      {selectedRepair && (
        <RepairDetailsModal
          repair={selectedRepair}
          isOpen={showRepairModal}
          onClose={() => {
            setShowRepairModal(false);
            setSelectedRepair(null);
          }}
          onRepairUpdate={(updatedRepair) => {
            // Reload repairs to get updated data
            loadRepairs();
            // Update selected repair if it's the same one
            if (selectedRepair && selectedRepair.id === updatedRepair.id) {
              setSelectedRepair(updatedRepair);
            }
          }}
          onRepairDelete={(repairId) => {
            // Remove from local state
            setRepairs(prev => prev.filter(r => r.id !== repairId));
            setOriginalRepairs(prev => prev.filter(r => r.id !== repairId));
            setShowRepairModal(false);
            setSelectedRepair(null);
          }}
        />
      )}

      {/* Repair Form Modal */}
      {showRepairForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Log New Repair</h3>
            
            {errorMessage && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
                <div className="flex">
                  <ExclamationTriangleIcon className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <p className="mt-1 text-sm text-red-700">{errorMessage}</p>
                  </div>
                </div>
              </div>
            )}
            
            <form onSubmit={handleLogRepair} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property
                </label>
                <select
                  value={repairForm.propertyId}
                  onChange={(e) => setRepairForm({...repairForm, propertyId: e.target.value, tenantId: ''})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  required
                >
                  <option value="">Select a property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.address}
                    </option>
                  ))}
                </select>
              </div>

              {propertyTenants.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reported by Tenant (Optional)
                  </label>
                  <select
                    value={repairForm.tenantId}
                    onChange={(e) => setRepairForm({...repairForm, tenantId: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  >
                    <option value="">Select tenant (if applicable)</option>
                    {propertyTenants.map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={repairForm.description}
                  onChange={(e) => setRepairForm({...repairForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={3}
                  placeholder="Describe the repair needed..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Urgency Level
                </label>
                <select
                  value={repairForm.urgency}
                  onChange={(e) => setRepairForm({...repairForm, urgency: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="low">Low - Can wait a week</option>
                  <option value="medium">Medium - Within a few days</option>
                  <option value="high">High - Within 24 hours</option>
                  <option value="emergency">Emergency - Immediate attention</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Cost (Optional)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">£</span>
                  </div>
                  <input
                    type="number"
                    value={repairForm.estimatedCost}
                    onChange={(e) => setRepairForm({...repairForm, estimatedCost: e.target.value})}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes (Optional)
                </label>
                <textarea
                  value={repairForm.notes}
                  onChange={(e) => setRepairForm({...repairForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  rows={2}
                  placeholder="Any additional information..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowRepairForm(false);
                    setErrorMessage(null);
                  }}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {isSubmitting ? (
                    <>
                      <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    'Log Repair'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};