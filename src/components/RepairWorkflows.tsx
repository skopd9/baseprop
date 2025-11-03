import React, { useState } from 'react';
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

interface RepairWorkflowsProps {
  properties: SimplifiedProperty[];
  tenants: SimplifiedTenant[];
  onLogRepair?: (repair: any) => void;
}

interface Repair {
  id: string;
  propertyId: string;
  propertyAddress: string;
  tenantId?: string;
  tenantName?: string;
  description: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  status: 'pending' | 'in_progress' | 'completed';
  reportedDate: Date;
  scheduledDate?: Date;
  completedDate?: Date;
  contractor?: string;
  contractorPhone?: string;
  estimatedCost?: number;
  actualCost?: number;
  photos?: string[];
  notes?: string;
}

// Mock repair data
const mockRepairs: Repair[] = [
  {
    id: 'repair-001',
    propertyId: 'prop-001',
    propertyAddress: '123 Oak Street, Manchester M1 2AB',
    tenantId: 'tenant-003',
    tenantName: 'Emma Williams',
    description: 'Leaking tap in kitchen',
    urgency: 'medium',
    status: 'pending',
    reportedDate: new Date('2024-02-10'),
    estimatedCost: 150
  },
  {
    id: 'repair-002',
    propertyId: 'prop-004',
    propertyAddress: '12 Garden Lane, Liverpool L8 5RT',
    tenantId: 'tenant-009',
    tenantName: 'Alex Martinez',
    description: 'Broken window in bedroom',
    urgency: 'high',
    status: 'in_progress',
    reportedDate: new Date('2024-02-08'),
    scheduledDate: new Date('2024-02-15'),
    contractor: 'ABC Glass Services',
    contractorPhone: '0151 123 4567',
    estimatedCost: 280,
  },
  {
    id: 'repair-003',
    propertyId: 'prop-006',
    propertyAddress: '34 Mill Road, Sheffield S1 2HX',
    tenantId: 'tenant-012',
    tenantName: 'Harry Jackson',
    description: 'Boiler not heating properly',
    urgency: 'emergency',
    status: 'completed',
    reportedDate: new Date('2024-01-25'),
    scheduledDate: new Date('2024-01-26'),
    completedDate: new Date('2024-01-26'),
    contractor: 'Sheffield Heating Ltd',
    contractorPhone: '0114 987 6543',
    estimatedCost: 450,
    actualCost: 420,
    notes: 'Replaced faulty thermostat. System working normally.'
  }
];

export const RepairWorkflows: React.FC<RepairWorkflowsProps> = ({
  properties,
  tenants,
  onLogRepair
}) => {
  const [repairs, setRepairs] = useState<Repair[]>(mockRepairs);
  const [showRepairForm, setShowRepairForm] = useState(false);
  const [selectedRepair, setSelectedRepair] = useState<Repair | null>(null);
  const [repairForm, setRepairForm] = useState({
    propertyId: '',
    tenantId: '',
    description: '',
    urgency: 'medium' as 'low' | 'medium' | 'high' | 'emergency',
    estimatedCost: '',
    notes: ''
  });

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

  const handleLogRepair = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedProperty = properties.find(p => p.id === repairForm.propertyId);
    const selectedTenant = tenants.find(t => t.id === repairForm.tenantId);
    
    const newRepair: Repair = {
      id: `repair-${Date.now()}`,
      propertyId: repairForm.propertyId,
      propertyAddress: selectedProperty?.address || '',
      tenantId: repairForm.tenantId || undefined,
      tenantName: selectedTenant?.name || undefined,
      description: repairForm.description,
      urgency: repairForm.urgency,
      status: 'pending',
      reportedDate: new Date(),
      estimatedCost: repairForm.estimatedCost ? parseFloat(repairForm.estimatedCost) : undefined,
      notes: repairForm.notes || undefined
    };

    setRepairs([...repairs, newRepair]);
    setShowRepairForm(false);
    setRepairForm({
      propertyId: '',
      tenantId: '',
      description: '',
      urgency: 'medium',
      estimatedCost: '',
      notes: ''
    });

    if (onLogRepair) {
      onLogRepair(newRepair);
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
        
        <div className="divide-y divide-gray-200">
          {repairs.map((repair) => (
            <div key={repair.id} className="p-6 hover:bg-gray-50">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4">
                  <div className="flex-shrink-0">
                    <div className="p-2 bg-gray-100 rounded-lg">
                      <WrenchScrewdriverIcon className="w-5 h-5 text-gray-600" />
                    </div>
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-2">
                      <p className="text-sm font-medium text-gray-900">
                        {repair.description}
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
                        <p className="text-gray-600 mt-2">{repair.notes}</p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col items-end space-y-2">
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
                  
                  {repair.status === 'pending' && (
                    <button
                      onClick={() => setSelectedRepair(repair)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Assign Contractor
                    </button>
                  )}
                  
                  {repair.status === 'in_progress' && (
                    <button
                      onClick={() => setSelectedRepair(repair)}
                      className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Mark Complete
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Repair Form Modal */}
      {showRepairForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Log New Repair</h3>
            
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
                  onClick={() => setShowRepairForm(false)}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                >
                  Log Repair
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};