import React, { useState } from 'react';
import {
  HomeIcon,
  UserGroupIcon,
  UserIcon,
  DocumentArrowUpIcon,
  PlusIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowLeftIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { SimplifiedProperty, SimplifiedTenant } from '../utils/simplifiedDataTransforms';
import { SimplifiedAddPropertyModal } from './SimplifiedAddPropertyModal';
import { SimplifiedAddTenantModal } from './SimplifiedAddTenantModal';

interface PortfolioOnboardingWizardProps {
  properties: SimplifiedProperty[];
  tenants: SimplifiedTenant[];
  onPropertyAdded: (property: SimplifiedProperty) => void;
  onTenantAdded: (tenant: SimplifiedTenant) => void;
  onComplete?: () => void;
}

type UploadMethod = 'bulk' | 'manual' | null;

export const PortfolioOnboardingWizard: React.FC<PortfolioOnboardingWizardProps> = ({
  properties,
  tenants,
  onPropertyAdded,
  onTenantAdded,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [uploadMethod, setUploadMethod] = useState<UploadMethod>(null);
  const [showPropertyModal, setShowPropertyModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [showNewTenantOnboarding, setShowNewTenantOnboarding] = useState(false);
  const [selectedTenantType, setSelectedTenantType] = useState<'existing' | 'new' | null>(null);
  const [selectedPropertyForTenant, setSelectedPropertyForTenant] = useState<SimplifiedProperty | null>(null);
  const [lastAddedProperty, setLastAddedProperty] = useState<SimplifiedProperty | null>(null);
  const [excelFile, setExcelFile] = useState<File | null>(null);
  const [isProcessingExcel, setIsProcessingExcel] = useState(false);
  const [propertyToEdit, setPropertyToEdit] = useState<SimplifiedProperty | null>(null);
  
  // Track properties and tenants added WITHIN this wizard session only
  const [wizardAddedProperties, setWizardAddedProperties] = useState<SimplifiedProperty[]>([]);
  const [wizardAddedTenants, setWizardAddedTenants] = useState<SimplifiedTenant[]>([]);

  const totalSteps = 2;
  const propertiesStep = 1;
  const tenantsStep = 2;

  const handleExcelUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls') && !file.name.endsWith('.csv')) {
      alert('Please upload a valid Excel file (.xlsx, .xls) or CSV file');
      return;
    }

    setExcelFile(file);
    setIsProcessingExcel(true);

    // TODO: Implement actual Excel parsing
    // For now, we'll just simulate processing
    setTimeout(() => {
      alert('Excel upload functionality will be available soon. For now, please use manual entry.');
      setIsProcessingExcel(false);
      setExcelFile(null);
      setUploadMethod('manual');
    }, 1500);
  };

  const handleNextStep = () => {
    // Validate properties step - must have added at least one property IN THIS WIZARD
    if (currentStep === propertiesStep && wizardAddedProperties.length === 0) {
      alert('Please add at least one property before proceeding to the next step.');
      return;
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      // Wizard complete
      if (onComplete) {
        onComplete();
      }
    }
  };

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handlePropertyAdded = (property: SimplifiedProperty) => {
    if (propertyToEdit) {
      // Update existing property in the wizard list
      setWizardAddedProperties(prev => 
        prev.map(p => p.id === property.id ? property : p)
      );
      // Also update in the parent component
      onPropertyAdded(property);
      setPropertyToEdit(null);
    } else {
      // Add new property
      onPropertyAdded(property);
      // Track this property as added in the wizard
      setWizardAddedProperties(prev => [...prev, property]);
      // Store the last added property for tenant assignment
      setLastAddedProperty(property);
      // If user selected manual entry, keep that method selected
      if (uploadMethod === null) {
        setUploadMethod('manual');
      }
    }
    setShowPropertyModal(false);
    setShowBulkUploadModal(false);
    // Don't automatically advance - let user review properties and click Next when ready
  };

  const handleTenantAdded = (tenant: SimplifiedTenant) => {
    onTenantAdded(tenant);
    // Track this tenant as added in the wizard
    setWizardAddedTenants(prev => [...prev, tenant]);
    setShowTenantModal(false);
  };

  const renderStepIndicator = () => {
    return (
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {[1, 2].map((step) => (
            <React.Fragment key={step}>
              <div className="flex items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                    step < currentStep
                      ? 'bg-green-500 text-white'
                      : step === currentStep
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {step < currentStep ? (
                    <CheckCircleIcon className="w-6 h-6" />
                  ) : (
                    step
                  )}
                </div>
                <div className="ml-3 hidden sm:block">
                  <div
                    className={`text-sm font-medium ${
                      step === currentStep ? 'text-blue-600' : 'text-gray-500'
                    }`}
                  >
                    {step === 1 ? 'Properties' : 'Tenants'}
                  </div>
                </div>
              </div>
              {step < totalSteps && (
                <div
                  className={`flex-1 h-1 mx-4 ${
                    step < currentStep ? 'bg-green-500' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>
    );
  };

  const renderPropertiesStep = () => {
    // If properties have been added, show them with option to add more
    if (wizardAddedProperties.length > 0) {
      return (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <HomeIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Your Properties
            </h2>
            <p className="text-gray-600">
              Review your properties and add more if needed
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Properties Added:</h3>
              <button
                onClick={() => {
                  setPropertyToEdit(null);
                  setShowPropertyModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center space-x-2"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add Another Property</span>
              </button>
            </div>
            
            <div className="space-y-3">
              {wizardAddedProperties.map((property, index) => (
                <div key={property.id} className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                  <div className="flex items-start">
                    <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                      <HomeIcon className="w-5 h-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-base font-semibold text-gray-900 mb-2">
                        {property.address}
                      </h4>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
                        <div>
                          <span className="font-medium text-gray-700">Type:</span> {property.propertyType === 'hmo' ? 'HMO' : property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)}
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Bedrooms:</span> {property.bedrooms}
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Bathrooms:</span> {property.bathrooms}
                        </div>
                        <div>
                          <span className="font-medium text-gray-700">Target Rent:</span> £{property.targetRent}/mo
                        </div>
                        {property.purchasePrice && property.purchasePrice > 0 && (
                          <div className="col-span-2">
                            <span className="font-medium text-gray-700">Purchase Price:</span> £{property.purchasePrice.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        setPropertyToEdit(property);
                        setShowPropertyModal(true);
                      }}
                      className="ml-3 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-md transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Success indicator */}
            <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                <span className="text-sm text-green-700">
                  Ready to proceed! Click "Next" to add tenants.
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Show method selection when no properties have been added yet
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <HomeIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Add Your Properties
          </h2>
          <p className="text-gray-600">
            Choose how you'd like to add your properties to the system
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Bulk Upload Option */}
          <button
            onClick={() => setShowBulkUploadModal(true)}
            className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-blue-200">
                <DocumentArrowUpIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Bulk Upload</h3>
                <p className="text-sm text-gray-500">Upload Excel file</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm">
              Upload an Excel file with all your properties at once. Perfect for portfolios with multiple properties.
            </p>
            <div className="mt-4 text-xs text-gray-500">
              <p>• Supports .xlsx, .xls, and .csv files</p>
              <p>• AI-powered parsing coming soon</p>
            </div>
          </button>

          {/* Manual Entry Option */}
          <button
            onClick={() => {
              setPropertyToEdit(null);
              setShowPropertyModal(true);
            }}
            className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-blue-200">
                <PlusIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manual Entry</h3>
                <p className="text-sm text-gray-500">Add one by one</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm">
              Add properties manually one at a time. Great for smaller portfolios or when you want to add details carefully.
            </p>
            <div className="mt-4 text-xs text-gray-500">
              <p>• Full control over each property</p>
              <p>• Add detailed information</p>
            </div>
          </button>
        </div>
      </div>
    );
  };

  const renderTenantsStep = () => {
    // If tenants have been added, show them with option to add more
    if (wizardAddedTenants.length > 0) {
      return (
        <div className="space-y-6">
          <div className="text-center mb-8">
            <UserGroupIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Your Tenants
            </h2>
            <p className="text-gray-600">
              Review your tenants and add more if needed
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-gray-700">Tenants Added:</h3>
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    setSelectedTenantType('existing');
                    setShowTenantModal(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center space-x-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Add Existing Tenant</span>
                </button>
                <button
                  onClick={() => {
                    setSelectedTenantType('new');
                    setShowNewTenantOnboarding(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center space-x-2"
                >
                  <PlusIcon className="w-4 h-4" />
                  <span>Add New Tenant</span>
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              {wizardAddedTenants.map((tenant) => {
                const property = wizardAddedProperties.find(p => p.id === tenant.propertyId);
                return (
                  <div key={tenant.id} className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-blue-300 transition-colors">
                    <div className="flex items-start">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                        <UserIcon className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-base font-semibold text-gray-900 mb-2">
                          {tenant.name}
                        </h4>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-gray-600">
                          <div>
                            <span className="font-medium text-gray-700">Email:</span> {tenant.email}
                          </div>
                          {tenant.phone && (
                            <div>
                              <span className="font-medium text-gray-700">Phone:</span> {tenant.phone}
                            </div>
                          )}
                          {property && (
                            <div className="col-span-2">
                              <span className="font-medium text-gray-700">Property:</span> {property.address}
                            </div>
                          )}
                          {tenant.roomName && (
                            <div>
                              <span className="font-medium text-gray-700">Room:</span> {tenant.roomName}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Success indicator with Complete button */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <CheckCircleIcon className="w-5 h-5 text-green-600 mr-2" />
                  <span className="text-sm text-green-700">
                    {wizardAddedTenants.length} {wizardAddedTenants.length === 1 ? 'tenant' : 'tenants'} added. You can add more or complete onboarding.
                  </span>
                </div>
                {onComplete && (
                  <button
                    onClick={onComplete}
                    className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 flex items-center space-x-2"
                  >
                    <CheckCircleIcon className="w-4 h-4" />
                    <span>Complete Onboarding</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Show tenant selection when no tenants have been added yet
    return (
      <div className="space-y-6">
        <div className="text-center mb-8">
          <UserGroupIcon className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Set Up Tenants
          </h2>
          <p className="text-gray-600">
            Add tenants for your new {wizardAddedProperties.length === 1 ? 'property' : 'properties'}. Choose between existing tenants or new tenants.
          </p>
        </div>

        {/* Show properties added in the previous step */}
        {wizardAddedProperties.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">
              {wizardAddedProperties.length === 1 ? 'Property' : 'Properties'} Added:
            </h3>
            <div className="space-y-2">
              {wizardAddedProperties.map((property) => (
                <div key={property.id} className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                      <HomeIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-semibold text-gray-900">
                        {property.address}
                      </h4>
                      <p className="text-xs text-gray-600">
                        {property.propertyType === 'hmo' ? 'HMO' : property.propertyType.charAt(0).toUpperCase() + property.propertyType.slice(1)} • {property.bedrooms} bed{property.bedrooms !== 1 ? 's' : ''} • £{property.targetRent}/mo
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {wizardAddedProperties.length === 0 ? (
          <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-lg text-center">
            <p className="text-yellow-800">
              Please add properties first before adding tenants.
            </p>
            <button
              onClick={() => setCurrentStep(1)}
              className="mt-4 px-4 py-2 bg-yellow-600 text-white text-sm font-medium rounded-md hover:bg-yellow-700"
            >
              Go to Properties Step
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              {/* Existing Tenant Option */}
              <button
                onClick={() => {
                  setSelectedTenantType('existing');
                  setShowTenantModal(true);
                }}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-blue-200">
                    <UserGroupIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">Existing Tenant</h3>
                    <p className="text-sm text-gray-500">Already in the property</p>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Add tenants who are already living in the property. Quick setup with basic information and existing tenancy details.
                </p>
                <div className="text-xs text-gray-500">
                  <p>• Basic tenant information</p>
                  <p>• Existing lease details</p>
                  <p>• Property assignment</p>
                </div>
              </button>

              {/* New Tenant Option */}
              <button
                onClick={() => {
                  setSelectedTenantType('new');
                  setShowNewTenantOnboarding(true);
                }}
                className="p-6 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
              >
                <div className="flex items-center mb-4">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4 group-hover:bg-blue-200">
                    <PlusIcon className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">New Tenant</h3>
                    <p className="text-sm text-gray-500">Full onboarding</p>
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-4">
                  Add new tenants who need full onboarding. Includes credit checks, reference checks, and tenancy agreements.
                </p>
                <div className="text-xs text-gray-500">
                  <p>• Credit checks & references</p>
                  <p>• Tenancy agreement generation</p>
                  <p>• Complete onboarding workflow</p>
                </div>
              </button>
            </div>

            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-700">
                <strong>Optional:</strong> You can skip this step and add tenants later from the Tenants tab.
              </p>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Property Onboarding Wizard
            </h1>
            <p className="text-gray-600">
              Follow this step-by-step guide to onboard your new property and set up tenants
            </p>
          </div>

          {/* Step Indicator */}
          {renderStepIndicator()}

          {/* Step Content */}
          <div className="min-h-[400px]">
            {currentStep === propertiesStep && renderPropertiesStep()}
            {currentStep === tenantsStep && renderTenantsStep()}
          </div>

          {/* Navigation */}
          <div className="pt-6 border-t border-gray-200 mt-8">
            {/* Show warning message when Next is disabled */}
            {currentStep === propertiesStep && wizardAddedProperties.length === 0 && (
              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <p className="text-sm text-amber-800">
                  ℹ️ Please add at least one property to continue to the next step.
                </p>
              </div>
            )}
            
            <div className="flex items-center justify-between">
              {currentStep === tenantsStep && wizardAddedProperties.length > 0 ? (
                <button
                  onClick={handlePreviousStep}
                  className="px-4 py-2 text-sm font-medium rounded-md flex items-center space-x-2 text-gray-700 hover:text-gray-900 hover:bg-gray-100"
                >
                  <ArrowLeftIcon className="w-4 h-4" />
                  <span>Back to Properties</span>
                </button>
              ) : (
                <div></div>
              )}

              <div className="text-sm text-gray-500">
                Step {currentStep} of {totalSteps}
              </div>

              {currentStep < totalSteps && (
                <button
                  onClick={handleNextStep}
                  disabled={currentStep === propertiesStep && wizardAddedProperties.length === 0}
                  className={`px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  <span>Next</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
              )}
              {currentStep === totalSteps && onComplete && (
                <button
                  onClick={onComplete}
                  className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 flex items-center space-x-2"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  <span>Finish</span>
                </button>
              )}
              {currentStep === totalSteps && !onComplete && <div></div>}
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      {/* Property Modals */}
      <SimplifiedAddPropertyModal
        isOpen={showPropertyModal}
        onClose={() => {
          setShowPropertyModal(false);
          setPropertyToEdit(null);
        }}
        onPropertyAdded={handlePropertyAdded}
        propertyToEdit={propertyToEdit || undefined}
      />

      {/* Bulk Upload Modal */}
      {showBulkUploadModal && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
          onClick={() => {
            setShowBulkUploadModal(false);
            setExcelFile(null);
          }}
        >
          <div 
            className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-lg bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <DocumentArrowUpIcon className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Bulk Upload Properties</h3>
                  <p className="text-sm text-gray-500">Upload Excel file with properties</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBulkUploadModal(false);
                  setExcelFile(null);
                }}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors mb-4">
              <DocumentArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <label className="cursor-pointer">
                <span className="text-blue-600 hover:text-blue-800 font-medium">
                  Click to upload
                </span>
                <span className="text-gray-600"> or drag and drop</span>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleExcelUpload}
                  className="hidden"
                  disabled={isProcessingExcel}
                />
              </label>
              <p className="text-xs text-gray-500 mt-2">
                Supports .xlsx, .xls, and .csv files
              </p>
              {isProcessingExcel && (
                <div className="mt-3">
                  <div className="inline-block w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-sm text-gray-600 mt-2">Processing...</p>
                </div>
              )}
              {excelFile && !isProcessingExcel && (
                <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded-md">
                  <p className="text-xs text-blue-700">
                    {excelFile.name}
                  </p>
                </div>
              )}
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
              <p className="text-xs text-yellow-800">
                <strong>Note:</strong> Excel upload with AI parsing coming soon. 
                For now, please use manual entry.
              </p>
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowBulkUploadModal(false);
                  setExcelFile(null);
                }}
                className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  setShowBulkUploadModal(false);
                  setShowPropertyModal(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
              >
                Use Manual Entry
              </button>
            </div>
          </div>
        </div>
      )}

      <SimplifiedAddTenantModal
        isOpen={showTenantModal}
        onClose={() => {
          setShowTenantModal(false);
          setSelectedTenantType(null);
        }}
        onTenantAdded={(tenant) => {
          handleTenantAdded(tenant);
          setSelectedPropertyForTenant(null);
          setLastAddedProperty(null);
        }}
        properties={wizardAddedProperties}
        existingTenants={tenants}
        isExistingTenant={selectedTenantType === 'existing'}
        preselectedPropertyId={lastAddedProperty?.id || ''}
      />

      {/* New Tenant Onboarding Modal - requires creating tenant first */}
      {showNewTenantOnboarding && wizardAddedProperties.length > 0 && (
        <SimplifiedAddTenantModal
          isOpen={showNewTenantOnboarding}
          onClose={() => {
            setShowNewTenantOnboarding(false);
            setSelectedTenantType(null);
          }}
          onTenantAdded={(tenant) => {
            // After creating tenant, just add them - don't redirect anywhere
            handleTenantAdded(tenant);
            setShowNewTenantOnboarding(false);
            setSelectedTenantType(null);
            setLastAddedProperty(null);
            // Note: User can start full onboarding from the tenant table later
          }}
          properties={wizardAddedProperties}
          existingTenants={tenants}
          isExistingTenant={false}
          preselectedPropertyId={lastAddedProperty?.id || ''}
        />
      )}
    </div>
  );
};

