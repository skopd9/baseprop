import React, { useState } from 'react';
import { 
  DocumentCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ShieldCheckIcon,
  BoltIcon,
  FireIcon,
  DocumentArrowUpIcon,
  HomeModernIcon,
  CreditCardIcon
} from '@heroicons/react/24/outline';
import { SimplifiedProperty } from '../utils/simplifiedDataTransforms';
import { CountryCode, getComplianceRequirements, DEFAULT_COUNTRY } from '../lib/countries';
import { ComplianceType } from '../types';

interface ComplianceWorkflowsProps {
  properties: SimplifiedProperty[];
  countryCode?: CountryCode;
  onUpdateCompliance?: (compliance: any) => void;
}

interface ComplianceItem {
  id: string;
  propertyId: string;
  propertyAddress: string;
  type: ComplianceType;
  status: 'valid' | 'expiring_soon' | 'expired' | 'not_required' | 'pending';
  issueDate?: Date;
  expiryDate?: Date;
  certificateNumber?: string;
  contractor?: string;
  notes?: string;
  isHMO?: boolean;
}

// Mock compliance data (UK examples)
const mockCompliance: ComplianceItem[] = [
  {
    id: 'comp-001',
    propertyId: 'prop-001',
    propertyAddress: '123 Oak Street, Manchester M1 2AB',
    type: 'gas_safety',
    status: 'valid',
    issueDate: new Date('2023-08-15'),
    expiryDate: new Date('2024-08-15'),
    certificateNumber: 'GS-2023-001234',
    contractor: 'Manchester Gas Services'
  },
  {
    id: 'comp-002',
    propertyId: 'prop-001',
    propertyAddress: '123 Oak Street, Manchester M1 2AB',
    type: 'eicr',
    status: 'expiring_soon',
    issueDate: new Date('2019-03-10'),
    expiryDate: new Date('2024-03-10'),
    certificateNumber: 'EIC-2019-005678',
    contractor: 'City Electrical Testing'
  },
  {
    id: 'comp-003',
    propertyId: 'prop-001',
    propertyAddress: '123 Oak Street, Manchester M1 2AB',
    type: 'epc',
    status: 'valid',
    issueDate: new Date('2023-05-12'),
    expiryDate: new Date('2033-05-12'),
    certificateNumber: 'EPC-2023-112233',
    contractor: 'Leeds Energy Assessors'
  },
  {
    id: 'comp-004',
    propertyId: 'prop-001',
    propertyAddress: '123 Oak Street, Manchester M1 2AB',
    type: 'right_to_rent',
    status: 'valid',
    issueDate: new Date('2023-07-01'),
    certificateNumber: 'RTR-2023-445566',
    notes: 'Checked via Home Office service'
  },
  {
    id: 'comp-005',
    propertyId: 'prop-002',
    propertyAddress: '45 Victoria Road, Birmingham B15 3TG',
    type: 'gas_safety',
    status: 'expired',
    issueDate: new Date('2022-11-20'),
    expiryDate: new Date('2023-11-20'),
    certificateNumber: 'GS-2022-009876',
    contractor: 'Birmingham Heating Ltd'
  }
];

export const ComplianceWorkflows: React.FC<ComplianceWorkflowsProps> = ({
  properties,
  countryCode = DEFAULT_COUNTRY,
  onUpdateCompliance
}) => {
  const [compliance, setCompliance] = useState<ComplianceItem[]>(mockCompliance);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [updateForm, setUpdateForm] = useState({
    propertyId: '',
    type: 'gas_safety' as ComplianceType,
    issueDate: '',
    expiryDate: '',
    certificateNumber: '',
    contractor: '',
    notes: ''
  });

  // Get compliance requirements for country
  const complianceRequirements = getComplianceRequirements(countryCode, false);

  const getComplianceIcon = (type: ComplianceType) => {
    switch (type) {
      // UK Types
      case 'gas_safety':
        return <FireIcon className="w-5 h-5 text-orange-600" />;
      case 'eicr':
        return <BoltIcon className="w-5 h-5 text-yellow-600" />;
      case 'epc':
        return <ShieldCheckIcon className="w-5 h-5 text-green-600" />;
      case 'deposit_protection':
        return <CreditCardIcon className="w-5 h-5 text-blue-600" />;
      case 'right_to_rent':
        return <DocumentCheckIcon className="w-5 h-5 text-indigo-600" />;
      case 'legionella':
        return <ShieldCheckIcon className="w-5 h-5 text-cyan-600" />;
      case 'smoke_alarms':
        return <FireIcon className="w-5 h-5 text-red-600" />;
      case 'co_alarms':
        return <FireIcon className="w-5 h-5 text-gray-600" />;
      case 'fire_safety_hmo':
        return <FireIcon className="w-5 h-5 text-purple-600" />;
      case 'hmo_license':
        return <HomeModernIcon className="w-5 h-5 text-blue-700" />;
      // Greece Types
      case 'epc_greece':
        return <ShieldCheckIcon className="w-5 h-5 text-green-600" />;
      case 'building_permit':
        return <DocumentCheckIcon className="w-5 h-5 text-blue-600" />;
      case 'tax_clearance':
        return <DocumentCheckIcon className="w-5 h-5 text-purple-600" />;
      // USA Types
      case 'lead_paint':
        return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />;
      case 'smoke_detectors_us':
        return <FireIcon className="w-5 h-5 text-red-600" />;
      case 'local_permits':
        return <DocumentCheckIcon className="w-5 h-5 text-blue-600" />;
      default:
        return <DocumentCheckIcon className="w-5 h-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'valid':
        return 'bg-green-100 text-green-800';
      case 'expiring_soon':
        return 'bg-yellow-100 text-yellow-800';
      case 'expired':
        return 'bg-red-100 text-red-800';
      case 'not_required':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getComplianceTypeLabel = (type: ComplianceType) => {
    const requirement = complianceRequirements.find(r => r.id === type);
    if (requirement) {
      return requirement.name;
    }

    // Fallback labels
    switch (type) {
      // UK
      case 'gas_safety':
        return 'Gas Safety Certificate';
      case 'eicr':
        return 'EICR (Electrical)';
      case 'epc':
        return 'EPC';
      case 'deposit_protection':
        return 'Deposit Protection';
      case 'right_to_rent':
        return 'Right to Rent';
      case 'legionella':
        return 'Legionella Assessment';
      case 'smoke_alarms':
        return 'Smoke Alarms';
      case 'co_alarms':
        return 'CO Alarms';
      case 'fire_safety_hmo':
        return 'Fire Safety (HMO)';
      case 'hmo_license':
        return 'HMO License';
      // Greece
      case 'epc_greece':
        return 'Energy Certificate';
      case 'building_permit':
        return 'Building Permit';
      case 'tax_clearance':
        return 'Tax Clearance';
      // USA
      case 'lead_paint':
        return 'Lead Paint Disclosure';
      case 'smoke_detectors_us':
        return 'Smoke Detectors';
      case 'local_permits':
        return 'Local Permits';
      default:
        return String(type).replace(/_/g, ' ');
    }
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  const getDaysUntilExpiry = (expiryDate: Date) => {
    const today = new Date();
    const diffTime = expiryDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const handleUpdateCompliance = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedProperty = properties.find(p => p.id === updateForm.propertyId);
    
    const newCompliance: ComplianceItem = {
      id: `comp-${Date.now()}`,
      propertyId: updateForm.propertyId,
      propertyAddress: selectedProperty?.address || '',
      type: updateForm.type,
      status: 'valid',
      issueDate: new Date(updateForm.issueDate),
      expiryDate: new Date(updateForm.expiryDate),
      certificateNumber: updateForm.certificateNumber,
      contractor: updateForm.contractor,
      notes: updateForm.notes || undefined
    };

    // Remove existing compliance of same type for same property
    const filteredCompliance = compliance.filter(
      c => !(c.propertyId === updateForm.propertyId && c.type === updateForm.type)
    );
    
    setCompliance([...filteredCompliance, newCompliance]);
    setShowUpdateForm(false);
    setUpdateForm({
      propertyId: '',
      type: 'gas_safety',
      issueDate: '',
      expiryDate: '',
      certificateNumber: '',
      contractor: '',
      notes: ''
    });

    if (onUpdateCompliance) {
      onUpdateCompliance(newCompliance);
    }
  };

  // Calculate summary stats
  const validItems = compliance.filter(c => c.status === 'valid').length;
  const expiringSoonItems = compliance.filter(c => {
    if (!c.expiryDate) return false;
    const daysUntilExpiry = getDaysUntilExpiry(c.expiryDate);
    return daysUntilExpiry <= 90 && daysUntilExpiry > 0;
  }).length;
  const expiredItems = compliance.filter(c => {
    if (!c.expiryDate) return false;
    return getDaysUntilExpiry(c.expiryDate) <= 0;
  }).length;

  // Group compliance by property
  const complianceByProperty = compliance.reduce((acc, item) => {
    if (!acc[item.propertyId]) {
      acc[item.propertyId] = [];
    }
    acc[item.propertyId].push(item);
    return acc;
  }, {} as Record<string, ComplianceItem[]>);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Compliance Management</h2>
          <p className="text-gray-600">Track certificates and legal requirements</p>
        </div>
        <button
          onClick={() => setShowUpdateForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
        >
          <DocumentArrowUpIcon className="w-4 h-4 mr-2" />
          Update Certificate
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Valid</p>
              <p className="text-2xl font-bold text-gray-900">{validItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-gray-900">{expiringSoonItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-gray-900">{expiredItems}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance by Property */}
      <div className="space-y-6">
        {properties.map((property) => {
          const propertyCompliance = complianceByProperty[property.id] || [];
          
          return (
            <div key={property.id} className="bg-white rounded-lg shadow border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">{property.address}</h3>
              </div>
              
              <div className="p-6">
                {propertyCompliance.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {propertyCompliance.map((item) => {
                      const daysUntilExpiry = item.expiryDate ? getDaysUntilExpiry(item.expiryDate) : null;
                      
                      return (
                        <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center space-x-2 mb-2">
                            {getComplianceIcon(item.type)}
                            <span className="text-sm font-medium text-gray-900">
                              {getComplianceTypeLabel(item.type)}
                            </span>
                          </div>
                          
                          <div className="space-y-2">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                              {item.status.replace('_', ' ')}
                            </span>
                            
                            {item.expiryDate && (
                              <div className="text-xs text-gray-500">
                                <div>Expires: {formatDate(item.expiryDate)}</div>
                                {daysUntilExpiry !== null && (
                                  <div className={`${
                                    daysUntilExpiry <= 0 ? 'text-red-600' :
                                    daysUntilExpiry <= 90 ? 'text-yellow-600' :
                                    'text-green-600'
                                  }`}>
                                    {daysUntilExpiry <= 0 
                                      ? `Expired ${Math.abs(daysUntilExpiry)} days ago`
                                      : `${daysUntilExpiry} days remaining`
                                    }
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {item.certificateNumber && (
                              <div className="text-xs text-gray-500">
                                Cert: {item.certificateNumber}
                              </div>
                            )}
                            
                            {item.contractor && (
                              <div className="text-xs text-gray-500">
                                By: {item.contractor}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <DocumentCheckIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">No compliance records for this property</p>
                    <button
                      onClick={() => {
                        setUpdateForm({...updateForm, propertyId: property.id});
                        setShowUpdateForm(true);
                      }}
                      className="mt-2 text-sm text-blue-600 hover:text-blue-500"
                    >
                      Add certificate
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Update Form Modal */}
      {showUpdateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Update Compliance Certificate</h3>
            
            <form onSubmit={handleUpdateCompliance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property
                </label>
                <select
                  value={updateForm.propertyId}
                  onChange={(e) => setUpdateForm({...updateForm, propertyId: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
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

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certificate Type
                </label>
                <select
                  value={updateForm.type}
                  onChange={(e) => setUpdateForm({...updateForm, type: e.target.value as ComplianceType})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  {complianceRequirements.map((req) => (
                    <option key={req.id} value={req.id}>
                      {req.name} {req.mandatory ? '*' : ''}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">* = Mandatory</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Issue Date
                </label>
                <input
                  type="date"
                  value={updateForm.issueDate}
                  onChange={(e) => setUpdateForm({...updateForm, issueDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expiry Date
                </label>
                <input
                  type="date"
                  value={updateForm.expiryDate}
                  onChange={(e) => setUpdateForm({...updateForm, expiryDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certificate Number
                </label>
                <input
                  type="text"
                  value={updateForm.certificateNumber}
                  onChange={(e) => setUpdateForm({...updateForm, certificateNumber: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="e.g., GS-2024-001234"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contractor/Company
                </label>
                <input
                  type="text"
                  value={updateForm.contractor}
                  onChange={(e) => setUpdateForm({...updateForm, contractor: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="Company that issued the certificate"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={updateForm.notes}
                  onChange={(e) => setUpdateForm({...updateForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={2}
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowUpdateForm(false)}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  Update Certificate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};