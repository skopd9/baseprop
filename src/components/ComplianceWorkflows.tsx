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
  CreditCardIcon,
  QuestionMarkCircleIcon,
  XMarkIcon,
  BuildingOfficeIcon,
  MapPinIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import { SimplifiedProperty } from '../utils/simplifiedDataTransforms';
import { CountryCode, getComplianceRequirements, DEFAULT_COUNTRY, getCountryConfig } from '../lib/countries';
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

// Compliance data will be loaded from the database in the future
// For now, start with an empty array
const mockCompliance: ComplianceItem[] = [];

export const ComplianceWorkflows: React.FC<ComplianceWorkflowsProps> = ({
  properties,
  countryCode = DEFAULT_COUNTRY,
  onUpdateCompliance
}) => {
  const [compliance, setCompliance] = useState<ComplianceItem[]>(mockCompliance);
  const [showUpdateForm, setShowUpdateForm] = useState(false);
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [expandedProperties, setExpandedProperties] = useState<Set<string>>(new Set());
  const [updateForm, setUpdateForm] = useState({
    propertyId: '',
    type: 'gas_safety' as ComplianceType,
    issueDate: '',
    expiryDate: '',
    certificateNumber: '',
    contractor: '',
    notes: ''
  });

  // Toggle property expansion
  const togglePropertyExpansion = (propertyId: string) => {
    setExpandedProperties(prev => {
      const newSet = new Set(prev);
      if (newSet.has(propertyId)) {
        newSet.delete(propertyId);
      } else {
        newSet.add(propertyId);
      }
      return newSet;
    });
  };

  // Group compliance by property
  const complianceByProperty = compliance.reduce((acc, item) => {
    if (!acc[item.propertyId]) {
      acc[item.propertyId] = [];
    }
    acc[item.propertyId].push(item);
    return acc;
  }, {} as Record<string, ComplianceItem[]>);

  // Auto-expand properties with expired certificates on mount
  React.useEffect(() => {
    const propertiesWithExpired = properties.filter(property => {
      const propertyCompliance = complianceByProperty[property.id] || [];
      return propertyCompliance.some(c => {
        if (!c.expiryDate) return false;
        return getDaysUntilExpiry(c.expiryDate) <= 0;
      });
    });
    
    if (propertiesWithExpired.length > 0 && expandedProperties.size === 0) {
      setExpandedProperties(new Set(propertiesWithExpired.map(p => p.id)));
    }
  }, [properties, compliance, complianceByProperty, expandedProperties.size]);

  // Get compliance requirements for country
  const complianceRequirements = getComplianceRequirements(countryCode, false);
  const countryConfig = getCountryConfig(countryCode);

  // Group properties by country
  const propertiesByCountry = properties.reduce((acc, property) => {
    const propCountry = property.countryCode || DEFAULT_COUNTRY;
    if (!acc[propCountry]) {
      acc[propCountry] = [];
    }
    acc[propCountry].push(property);
    return acc;
  }, {} as Record<CountryCode, SimplifiedProperty[]>);

  // Get list of countries present in properties
  const countriesInUse = Object.keys(propertiesByCountry) as CountryCode[];

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

  // Calculate stats by country
  const statsByCountry = countriesInUse.reduce((acc, country) => {
    const countryProps = propertiesByCountry[country];
    const countryCompliance = compliance.filter(c => 
      countryProps.some(p => p.id === c.propertyId)
    );
    acc[country] = {
      properties: countryProps.length,
      valid: countryCompliance.filter(c => c.status === 'valid').length,
      expiring: countryCompliance.filter(c => {
        if (!c.expiryDate) return false;
        const days = getDaysUntilExpiry(c.expiryDate);
        return days <= 90 && days > 0;
      }).length,
      expired: countryCompliance.filter(c => {
        if (!c.expiryDate) return false;
        return getDaysUntilExpiry(c.expiryDate) <= 0;
      }).length,
    };
    return acc;
  }, {} as Record<CountryCode, { properties: number; valid: number; expiring: number; expired: number }>);

  // Get country flag emoji
  const getCountryFlag = (country: CountryCode) => {
    switch (country) {
      case 'UK': return '🇬🇧';
      case 'US': return '🇺🇸';
      case 'GR': return '🇬🇷';
      default: return '📍';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Compliance Management</h2>
          <p className="text-sm text-gray-600 mt-1">Track certificates and legal requirements</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowRequirementsModal(true)}
            className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
          >
            <QuestionMarkCircleIcon className="w-4 h-4 mr-2" />
            View Requirements
          </button>
          <button
            onClick={() => setShowUpdateForm(true)}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <DocumentArrowUpIcon className="w-4 h-4 mr-2" />
            Add Certificate
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Valid</p>
              <p className="text-2xl font-bold text-gray-900">{validItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Expiring Soon</p>
              <p className="text-2xl font-bold text-gray-900">{expiringSoonItems}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
            </div>
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-600">Expired</p>
              <p className="text-2xl font-bold text-gray-900">{expiredItems}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Compliance by Country and Property */}
      <div className="space-y-4">
        {countriesInUse.length === 0 ? (
          <div className="bg-white rounded-lg shadow border border-gray-200 p-8 text-center">
            <BuildingOfficeIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <h3 className="text-lg font-medium text-gray-900 mb-1">No Properties Found</h3>
            <p className="text-sm text-gray-500">Add properties to start tracking compliance certificates.</p>
          </div>
        ) : (
          countriesInUse.map((country) => {
            const countryProperties = propertiesByCountry[country];
            const countryInfo = getCountryConfig(country);
            const stats = statsByCountry[country];
            
            return (
              <div key={country} className="space-y-4">
                {/* Country Header */}
                <div className="bg-white rounded-lg shadow border border-gray-200">
                  <div className="px-4 py-3 border-b border-gray-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="text-2xl">{getCountryFlag(country)}</span>
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{countryInfo.name}</h3>
                          <div className="flex items-center space-x-4 mt-1">
                            <span className="text-sm text-gray-500">
                              {countryProperties.length} {countryProperties.length === 1 ? 'property' : 'properties'}
                            </span>
                            {stats && stats.valid > 0 && (
                              <span className="text-sm text-green-600">{stats.valid} valid</span>
                            )}
                            {stats && stats.expiring > 0 && (
                              <span className="text-sm text-yellow-600">{stats.expiring} expiring</span>
                            )}
                            {stats && stats.expired > 0 && (
                              <span className="text-sm text-red-600">{stats.expired} expired</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowRequirementsModal(true)}
                        className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                      >
                        View Requirements
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Properties in this country */}
                <div className="space-y-4">
                  {countryProperties.map((property) => {
          const propertyCompliance = complianceByProperty[property.id] || [];
                    const propertyValid = propertyCompliance.filter(c => c.status === 'valid').length;
                    const propertyExpiring = propertyCompliance.filter(c => {
                      if (!c.expiryDate) return false;
                      const days = getDaysUntilExpiry(c.expiryDate);
                      return days <= 90 && days > 0;
                    }).length;
                    const propertyExpired = propertyCompliance.filter(c => {
                      if (!c.expiryDate) return false;
                      return getDaysUntilExpiry(c.expiryDate) <= 0;
                    }).length;
                    
                    const isExpanded = expandedProperties.has(property.id);
                    // Auto-expand if property has expired certificates
                    const shouldAutoExpand = propertyExpired > 0;
          
          return (
            <div key={property.id} className="bg-white rounded-lg shadow border border-gray-200">
                        <div 
                          className="px-4 py-3 border-b border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors"
                          onClick={() => togglePropertyExpansion(property.id)}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <div className="text-gray-400 flex-shrink-0">
                                {isExpanded ? (
                                  <ChevronUpIcon className="w-5 h-5" />
                                ) : (
                                  <ChevronDownIcon className="w-5 h-5" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-medium text-gray-900">{property.address}</h4>
                                {propertyCompliance.length > 0 && (
                                  <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                                    <span>{propertyCompliance.length} certificate{propertyCompliance.length !== 1 ? 's' : ''}</span>
                                    {propertyValid > 0 && (
                                      <span className="text-green-600">{propertyValid} valid</span>
                                    )}
                                    {propertyExpiring > 0 && (
                                      <span className="text-yellow-600">{propertyExpiring} expiring</span>
                                    )}
                                    {propertyExpired > 0 && (
                                      <span className="text-red-600 font-medium">{propertyExpired} expired</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setUpdateForm({...updateForm, propertyId: property.id});
                                setShowUpdateForm(true);
                              }}
                              className="ml-3 px-3 py-1.5 text-sm font-medium text-blue-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50 flex-shrink-0"
                            >
                              Add Certificate
                            </button>
                          </div>
              </div>
              
                        {isExpanded && (
                          <div className="p-4">
                {propertyCompliance.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {propertyCompliance.map((item) => {
                      const daysUntilExpiry = item.expiryDate ? getDaysUntilExpiry(item.expiryDate) : null;
                                  const isExpired = daysUntilExpiry !== null && daysUntilExpiry <= 0;
                                  const isExpiringSoon = daysUntilExpiry !== null && daysUntilExpiry > 0 && daysUntilExpiry <= 90;
                      
                      return (
                                    <div 
                                      key={item.id} 
                                      className={`border rounded-lg p-3 ${
                                        isExpired 
                                          ? 'border-red-200 bg-red-50' 
                                          : isExpiringSoon 
                                          ? 'border-yellow-200 bg-yellow-50' 
                                          : 'border-gray-200 bg-white'
                                      }`}
                                    >
                                      <div className="flex items-start space-x-2 mb-2">
                                        <div className="flex-shrink-0 mt-0.5">
                            {getComplianceIcon(item.type)}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h5 className="text-sm font-medium text-gray-900">
                              {getComplianceTypeLabel(item.type)}
                                          </h5>
                                        </div>
                          </div>
                          
                                      <div className="space-y-1.5">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(item.status)}`}>
                              {item.status.replace('_', ' ')}
                            </span>
                            
                            {item.expiryDate && (
                                          <div className="text-xs">
                                            <div className="text-gray-600">Expires: {formatDate(item.expiryDate)}</div>
                                {daysUntilExpiry !== null && (
                                              <div className={`font-medium mt-0.5 ${
                                                isExpired ? 'text-red-700' :
                                                isExpiringSoon ? 'text-yellow-700' :
                                                'text-green-700'
                                              }`}>
                                                {isExpired 
                                      ? `Expired ${Math.abs(daysUntilExpiry)} days ago`
                                                  : isExpiringSoon
                                                  ? `${daysUntilExpiry} days remaining`
                                      : `${daysUntilExpiry} days remaining`
                                    }
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {item.certificateNumber && (
                                          <div className="text-xs text-gray-500 pt-1 border-t border-gray-200">
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
                                <DocumentCheckIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                                <p className="text-sm text-gray-600 mb-1">No compliance certificates</p>
                    <button
                      onClick={() => {
                        setUpdateForm({...updateForm, propertyId: property.id});
                        setShowUpdateForm(true);
                      }}
                                  className="mt-3 inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                                >
                                  <DocumentArrowUpIcon className="w-4 h-4 mr-1.5" />
                                  Add Certificate
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Requirements Modal */}
      {showRequirementsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {countryConfig.name} Compliance Requirements
                </h2>
                <p className="text-sm text-gray-600 mt-1">
                  Required documents and certificates for rental properties
                </p>
              </div>
              <button
                onClick={() => setShowRequirementsModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              <div className="space-y-6">
                {/* Requirements List */}
                <div>
                  <div className="space-y-4">
                    {getComplianceRequirements(countryCode, false).map((req) => (
                      <div 
                        key={req.id}
                        className="border border-gray-200 rounded-lg p-5 hover:border-green-300 transition-colors"
                      >
                        <div className="flex items-start space-x-4">
                          <div className="flex-shrink-0 mt-1">
                            {getComplianceIcon(req.id as ComplianceType)}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-2">
                              <h4 className="font-semibold text-gray-900 text-lg">
                                {req.name}
                                {req.mandatory && (
                                  <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                    Mandatory
                                  </span>
                                )}
                              </h4>
                              <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
                                {(() => {
                                  switch (req.frequency) {
                                    case 'annual': return 'Every year';
                                    case 'biennial': return 'Every 2 years';
                                    case '5_years': return 'Every 5 years';
                                    case '10_years': return 'Every 10 years';
                                    case 'once': return 'Once per tenancy';
                                    case 'as_needed': return 'As needed';
                                    default: return req.frequency;
                                  }
                                })()}
                              </span>
                            </div>
                            <p className="text-gray-600">
                              {req.description}
                            </p>
                            {req.appliesToHMO && !req.appliesToStandard && (
                              <p className="text-sm text-purple-600 mt-2 font-medium">
                                ⚠️ HMO properties only
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Info Box */}
                  <div className="mt-6 bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>💡 Tip:</strong> Keep all certificates and records for at least 2 years after the tenancy ends.
                      {countryCode === 'UK' && ' Provide copies to tenants within 28 days of completion.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 px-6 py-4 flex justify-end">
              <button
                onClick={() => setShowRequirementsModal(false)}
                className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
      </div>
      )}

      {/* Update Form Modal */}
      {showUpdateForm && (() => {
        // Get selected property to determine country
        const selectedProperty = properties.find(p => p.id === updateForm.propertyId);
        const propertyCountry = selectedProperty?.countryCode || DEFAULT_COUNTRY;
        const propertyCountryRequirements = getComplianceRequirements(propertyCountry, selectedProperty?.propertyType === 'hmo');
        const propertyCountryConfig = getCountryConfig(propertyCountry);
        
        return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-screen overflow-y-auto">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Compliance Certificate</h3>
            
            <form onSubmit={handleUpdateCompliance} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property
                </label>
                <select
                  value={updateForm.propertyId}
                    onChange={(e) => {
                      const newPropertyId = e.target.value;
                      const newProperty = properties.find(p => p.id === newPropertyId);
                      // Reset certificate type when property changes to ensure it's valid for the new country
                      setUpdateForm({
                        ...updateForm, 
                        propertyId: newPropertyId,
                        type: (newProperty && getComplianceRequirements(newProperty.countryCode, newProperty.propertyType === 'hmo')[0]?.id) || 'gas_safety' as ComplianceType
                      });
                    }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Select a property</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                        {property.address} ({getCountryConfig(property.countryCode).name})
                    </option>
                  ))}
                </select>
              </div>

                {selectedProperty && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm text-blue-800">
                      <strong>📍 {propertyCountryConfig.name}</strong> - Showing {propertyCountryConfig.name} compliance requirements
                    </p>
                  </div>
                )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Certificate Type
                </label>
                <select
                  value={updateForm.type}
                  onChange={(e) => setUpdateForm({...updateForm, type: e.target.value as ComplianceType})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    disabled={!selectedProperty}
                >
                    {selectedProperty ? (
                      propertyCountryRequirements.map((req) => (
                    <option key={req.id} value={req.id}>
                      {req.name} {req.mandatory ? '*' : ''}
                    </option>
                      ))
                    ) : (
                      <option value="">Select a property first</option>
                    )}
                </select>
                  <p className="mt-1 text-xs text-gray-500">* = Mandatory for {selectedProperty ? propertyCountryConfig.name : 'selected country'}</p>
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
        );
      })()}
    </div>
  );
};