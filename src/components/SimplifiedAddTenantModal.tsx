import React, { useState, useMemo } from 'react';
import { 
  XMarkIcon, 
  UserIcon, 
  HomeIcon, 
  CheckIcon, 
  CheckCircleIcon,
  DocumentTextIcon,
  DocumentCheckIcon,
  ClipboardDocumentCheckIcon,
  ArrowUpTrayIcon,
  ShoppingCartIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { SimplifiedProperty, SimplifiedTenant } from '../utils/simplifiedDataTransforms';
import { SimplifiedTenantService } from '../services/SimplifiedTenantService';
import { useOrganization } from '../contexts/OrganizationContext';

interface SimplifiedAddTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTenantAdded: (tenant: SimplifiedTenant) => void;
  properties: SimplifiedProperty[];
  existingTenants: SimplifiedTenant[];
  isExistingTenant?: boolean;
  preselectedPropertyId?: string;
}

// Define wizard steps for existing tenant
const existingTenantSteps = [
  { key: 'basicInfo', title: 'Basic Info', required: true },
  { key: 'property', title: 'Property', required: true },
  { key: 'creditChecks', title: 'Credit Checks', required: false },
  { key: 'tenancyPrep', title: 'Tenancy Prep', required: false },
  { key: 'documents', title: 'Documents', required: false },
  { key: 'summary', title: 'Summary', required: false }
];

// Define wizard steps for new tenant (includes tenancy preparation)
const newTenantSteps = [
  { key: 'basicInfo', title: 'Basic Info', required: true },
  { key: 'property', title: 'Property', required: true },
  { key: 'creditChecks', title: 'Credit Checks', required: false },
  { key: 'tenancyPrep', title: 'Tenancy Prep', required: false },
  { key: 'documents', title: 'Documents', required: false },
  { key: 'summary', title: 'Summary', required: false }
];

export const SimplifiedAddTenantModal: React.FC<SimplifiedAddTenantModalProps> = ({
  isOpen,
  onClose,
  onTenantAdded,
  properties,
  existingTenants,
  isExistingTenant = false,
  preselectedPropertyId = '',
}) => {
  const { currentOrganization } = useOrganization();
  const [currentWizardStep, setCurrentWizardStep] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  
  // Select appropriate wizard steps based on tenant type
  const wizardSteps = isExistingTenant ? existingTenantSteps : newTenantSteps;
  
  const [formData, setFormData] = useState({
    firstName: '',
    surname: '',
    email: '',
    phone: '',
    propertyId: preselectedPropertyId,
    unitNumber: '',
    roomId: '',
    roomName: '',
  });
  
  // State for additional onboarding data
  const [tenancyPrepData, setTenancyPrepData] = useState({
    startDate: '',
    endDate: '',
    monthlyRent: '',
    deposit: '',
    documentOption: '' as '' | 'generate' | 'existing',
    existingDocument: null as File | null,
    documentGenerated: false,
    documentSentForSigning: false,
  });
  
  const [creditCheckData, setCreditCheckData] = useState({
    uploadedFile: null as File | null,
    orderNew: false,
    skipped: false,
    creditCheckStatus: 'pending' as 'pending' | 'ordered' | 'uploaded' | 'completed' | 'skipped',
  });
  
  const [documentsData, setDocumentsData] = useState({
    depositCertificate: false,
    rightToRent: false,
    tenancyAgreement: false,
    inventoryReport: false,
    gasSafetyCertificate: false,
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update propertyId when preselectedPropertyId changes
  React.useEffect(() => {
    if (preselectedPropertyId && isOpen) {
      setFormData(prev => ({ ...prev, propertyId: preselectedPropertyId }));
    }
  }, [preselectedPropertyId, isOpen]);

  // Reset wizard when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setCurrentWizardStep(0);
      setError(null);
      setIsCompleted(false);
    } else {
      // When modal closes, reset completion state
      setIsCompleted(false);
    }
  }, [isOpen]);

  // Get all properties
  const availableProperties = useMemo(() => {
    return properties;
  }, [properties]);

  // Get available rooms/units for selected property
  const availableRooms = useMemo(() => {
    if (!formData.propertyId) return [];
    
    const selectedProperty = properties.find(p => p.id === formData.propertyId);
    if (!selectedProperty) return [];

    const propertyTenants = existingTenants.filter(t => t.propertyId === formData.propertyId);
    const occupiedRoomIds = new Set(propertyTenants.map(t => t.roomId).filter(Boolean));
    const occupiedUnitNumbers = new Set(propertyTenants.map(t => t.unitNumber).filter(Boolean));

    // For HMO properties with defined rooms
    if (selectedProperty.propertyType === 'hmo' && selectedProperty.rooms && selectedProperty.rooms.length > 0) {
      return selectedProperty.rooms
        .filter(room => !room.isOccupied && !occupiedRoomIds.has(room.id))
        .map(room => ({ id: room.id, name: room.name, rent: room.monthlyRent }));
    }

    // For HMO properties with legacy units structure
    if (selectedProperty.propertyType === 'hmo' && Array.isArray(selectedProperty.units)) {
      return selectedProperty.units
        .filter(unit => !occupiedUnitNumbers.has(unit.name))
        .map(unit => ({ id: unit.name, name: unit.name, rent: Math.round(selectedProperty.targetRent / selectedProperty.bedrooms) }));
    }

    // For houses, generate room options based on bedrooms
    if (selectedProperty.propertyType === 'house') {
      const rooms = [];
      for (let i = 1; i <= selectedProperty.bedrooms; i++) {
        const roomName = `Room ${i}`;
        if (!occupiedUnitNumbers.has(roomName)) {
          rooms.push({ 
            id: roomName, 
            name: roomName, 
            rent: Math.round(selectedProperty.targetRent / selectedProperty.bedrooms) 
          });
        }
      }
      return rooms;
    }

    // For HMO properties without defined rooms, fallback to basic room generation
    if (selectedProperty.propertyType === 'hmo') {
      const rooms = [];
      for (let i = 1; i <= selectedProperty.bedrooms; i++) {
        const roomName = `Room ${i}`;
        if (!occupiedUnitNumbers.has(roomName)) {
          rooms.push({ 
            id: roomName, 
            name: roomName, 
            rent: 500
          });
        }
      }
      return rooms;
    }

    return [];
  }, [formData.propertyId, properties, existingTenants]);

  // Check if selected property is HMO
  const isHMO = useMemo(() => {
    const selectedProperty = properties.find(p => p.id === formData.propertyId);
    return selectedProperty?.propertyType === 'hmo' || 
           (selectedProperty?.propertyType === 'house' && selectedProperty.bedrooms > 2);
  }, [formData.propertyId, properties]);

  const selectedProperty = useMemo(() => {
    return properties.find(p => p.id === formData.propertyId);
  }, [formData.propertyId, properties]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.firstName.trim()) {
        throw new Error('First name is required');
      }

      if (!formData.surname.trim()) {
        throw new Error('Surname is required');
      }

      if (!formData.email.trim()) {
        throw new Error('Email address is required for tenant portal access');
      }

      if (!formData.propertyId) {
        throw new Error('Please select a property');
      }

      if (isHMO && !formData.roomId) {
        throw new Error('Please select a room for this HMO property');
      }

      // Create tenant data
      const tenantData = {
        name: `${formData.firstName.trim()} ${formData.surname.trim()}`,
        email: formData.email.trim(),
        phone: formData.phone.trim() || undefined,
        propertyId: formData.propertyId,
        unitNumber: isHMO ? formData.unitNumber : undefined,
        roomId: isHMO ? formData.roomId : undefined,
        roomName: isHMO ? formData.roomName : undefined,
      };

      // Create tenant in database
      const createdTenant = await SimplifiedTenantService.createSimplifiedTenant(
        tenantData,
        currentOrganization?.id
      );

      if (!createdTenant) {
        throw new Error('Failed to create tenant. Please try again.');
      }

      // Call the callback with the new tenant
      onTenantAdded(createdTenant);
      
      // Mark as completed instead of closing
      setIsCompleted(true);
    } catch (err: any) {
      console.error('Error adding tenant:', err);
      
      let errorMessage = 'Failed to add tenant';
      if (err?.message) {
        errorMessage = err.message;
      }
      if (err?.details) {
        errorMessage += ` - ${err.details}`;
      }
      if (err?.hint) {
        errorMessage += ` (Hint: ${err.hint})`;
      }
      
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const canProceedToNextStep = () => {
    switch (currentWizardStep) {
      case 0: // Basic Info
        return formData.firstName.trim() && formData.surname.trim() && formData.email.trim();
      case 1: // Property
        return formData.propertyId && (!isHMO || formData.roomId);
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentWizardStep < wizardSteps.length - 1 && canProceedToNextStep()) {
      setCurrentWizardStep(currentWizardStep + 1);
      setError(null);
    }
  };

  const handleBack = () => {
    if (currentWizardStep > 0) {
      setCurrentWizardStep(currentWizardStep - 1);
      setError(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="relative top-10 mx-auto border w-full max-w-3xl shadow-lg rounded-lg bg-white mb-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <UserIcon className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {isExistingTenant ? 'Add Existing Tenant' : 'Add New Tenant'}
                </h3>
                <p className="text-sm text-gray-500">
                  {isExistingTenant 
                    ? 'Add a tenant who is already living in the property'
                    : 'Add tenant details and assign to a property'}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Wizard Step Navigation - Hidden when completed */}
        {!isCompleted && (
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <div className="flex items-center justify-center gap-4">
              {wizardSteps.map((step, index) => {
              const isActive = index === currentWizardStep;
              const isCompleted = index < currentWizardStep;
              const isLast = index === wizardSteps.length - 1;

              return (
                <React.Fragment key={step.key}>
                  <button
                    type="button"
                    onClick={() => {
                      if (index < currentWizardStep) {
                        setCurrentWizardStep(index);
                      }
                    }}
                    disabled={index > currentWizardStep}
                    className={`flex flex-col items-center gap-2 ${
                      index <= currentWizardStep ? 'cursor-pointer' : 'cursor-not-allowed'
                    }`}
                  >
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isCompleted 
                        ? 'bg-green-500 text-white' 
                        : isActive 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-300 text-gray-600'
                    }`}>
                      {isCompleted ? (
                        <CheckIcon className="w-5 h-5" />
                      ) : (
                        <span className="text-sm font-medium">{index + 1}</span>
                      )}
                    </div>
                    <span className={`text-xs font-medium text-center whitespace-nowrap ${
                      isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {step.title}
                    </span>
                  </button>
                  {!isLast && (
                    <div className={`w-12 h-0.5 mt-[-20px] transition-colors ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </React.Fragment>
              );
              })}
            </div>
          </div>
        )}

        {/* Error Messages - Hidden when completed */}
        {error && !isCompleted && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="p-6">
          <div className="min-h-[300px]">
            {/* Step 1: Basic Info */}
            {currentWizardStep === 0 && (
              <div className="space-y-4">
                <div className="mb-4">
                  <h4 className="text-base font-semibold text-gray-900 mb-2">Tenant Information</h4>
                  <p className="text-sm text-gray-600">Enter the basic details for the tenant</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="firstName"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., John"
                    />
                  </div>

                  <div>
                    <label htmlFor="surname" className="block text-sm font-medium text-gray-700 mb-1">
                      Surname <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      id="surname"
                      name="surname"
                      value={formData.surname}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Smith"
                    />
                  </div>

                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                      Email Address <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="john.smith@email.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="07123 456789"
                    />
                  </div>
                </div>

                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <strong>Note:</strong> The email address will be used for tenant portal access and communication.
                  </p>
                </div>
              </div>
            )}

            {/* Step 2: Property Assignment */}
            {currentWizardStep === 1 && (
              <div className="space-y-4">
                <div className="mb-4">
                  <h4 className="text-base font-semibold text-gray-900 mb-2">Property Assignment</h4>
                  <p className="text-sm text-gray-600">Select the property and room (if applicable)</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={isHMO ? 'md:col-span-1' : 'md:col-span-2'}>
                    <label htmlFor="propertyId" className="block text-sm font-medium text-gray-700 mb-1">
                      Property <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="propertyId"
                      name="propertyId"
                      value={formData.propertyId}
                      onChange={handleChange}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select a property</option>
                      {availableProperties.map((property) => {
                        const propertyTenants = existingTenants.filter(t => t.propertyId === property.id);
                        const tenantCount = propertyTenants.length;
                        return (
                          <option key={property.id} value={property.id}>
                            {property.address} ({property.propertyType}) - {tenantCount} tenant{tenantCount !== 1 ? 's' : ''}
                          </option>
                        );
                      })}
                    </select>
                    {availableProperties.length === 0 && (
                      <p className="text-xs text-red-600 mt-1">
                        No properties found. Please add a property first.
                      </p>
                    )}
                  </div>

                  {isHMO && (
                    <div>
                      <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 mb-1">
                        Room <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="roomId"
                        name="roomId"
                        value={formData.roomId}
                        onChange={(e) => {
                          const selectedRoom = availableRooms.find(room => room.id === e.target.value);
                          setFormData(prev => ({
                            ...prev,
                            roomId: e.target.value,
                            roomName: selectedRoom?.name || '',
                            unitNumber: selectedRoom?.name || '',
                          }));
                        }}
                        required={isHMO}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select a room</option>
                        {availableRooms.map((room) => (
                          <option key={room.id} value={room.id}>
                            {room.name} - £{room.rent}/month
                          </option>
                        ))}
                      </select>
                      {availableRooms.length === 0 && formData.propertyId && (
                        <p className="text-xs text-red-600 mt-1">
                          No rooms available in this property.
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {isHMO && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                    <div className="flex items-start space-x-2">
                      <HomeIcon className="w-4 h-4 text-blue-600 mt-0.5" />
                      <div className="text-sm text-blue-700">
                        <strong>HMO Property:</strong> This property has multiple bedrooms and can accommodate individual room rentals.
                      </div>
                    </div>
                  </div>
                )}

                {/* Show selected property info */}
                {selectedProperty && (
                  <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Selected Property</h5>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><strong>Address:</strong> {selectedProperty.address}</p>
                      <p><strong>Type:</strong> {selectedProperty.propertyType}</p>
                      <p><strong>Bedrooms:</strong> {selectedProperty.bedrooms}</p>
                      {formData.roomId && (
                        <p><strong>Assigned Room:</strong> {formData.roomName}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Tenancy Preparation */}
            {wizardSteps[currentWizardStep]?.key === 'tenancyPrep' && (
              <div className="space-y-4">
                <div className="mb-4">
                  <h4 className="text-base font-semibold text-gray-900 mb-2 flex items-center">
                    <DocumentTextIcon className="w-5 h-5 mr-2 text-blue-600" />
                    Tenancy Preparation
                  </h4>
                  <p className="text-sm text-gray-600">Set up lease details and terms</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Tenancy Start Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        id="startDate"
                        value={tenancyPrepData.startDate}
                        onChange={(e) => setTenancyPrepData(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                        placeholder="Select start date"
                      />
                      <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
                      Tenancy End Date
                    </label>
                    <div className="relative">
                      <input
                        type="date"
                        id="endDate"
                        value={tenancyPrepData.endDate}
                        onChange={(e) => setTenancyPrepData(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer"
                        min={tenancyPrepData.startDate || undefined}
                        placeholder="Select end date"
                      />
                      <CalendarIcon className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="monthlyRent" className="block text-sm font-medium text-gray-700 mb-1">
                      Monthly Rent (£)
                    </label>
                    <input
                      type="number"
                      id="monthlyRent"
                      value={tenancyPrepData.monthlyRent}
                      onChange={(e) => setTenancyPrepData(prev => ({ ...prev, monthlyRent: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 1200"
                    />
                  </div>

                  <div>
                    <label htmlFor="deposit" className="block text-sm font-medium text-gray-700 mb-1">
                      Deposit Amount (£)
                    </label>
                    <input
                      type="number"
                      id="deposit"
                      value={tenancyPrepData.deposit}
                      onChange={(e) => setTenancyPrepData(prev => ({ ...prev, deposit: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., 1200"
                    />
                  </div>
                </div>

                {/* Tenancy Agreement Document */}
                <div className="mt-6 space-y-4">
                  <h5 className="text-sm font-semibold text-gray-900">Tenancy Agreement</h5>
                  
                  {/* Document Options */}
                  {!tenancyPrepData.documentOption && (
                    <div className="grid grid-cols-2 gap-4">
                      <button
                        type="button"
                        onClick={() => setTenancyPrepData(prev => ({ ...prev, documentOption: 'generate' }))}
                        className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center group-hover:bg-blue-200">
                            <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                          </div>
                          <div>
                            <h6 className="text-sm font-semibold text-gray-900">Generate New</h6>
                            <p className="text-xs text-gray-500">Create tenancy agreement</p>
                          </div>
                        </div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setTenancyPrepData(prev => ({ ...prev, documentOption: 'existing' }))}
                        className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center group-hover:bg-green-200">
                            <ArrowUpTrayIcon className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <h6 className="text-sm font-semibold text-gray-900">Upload Existing</h6>
                            <p className="text-xs text-gray-500">Add signed document</p>
                          </div>
                        </div>
                      </button>
                    </div>
                  )}

                  {/* Generate Document Flow */}
                  {tenancyPrepData.documentOption === 'generate' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <DocumentTextIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                          <div className="flex-1">
                            <h6 className="text-sm font-semibold text-blue-900 mb-1">Generate Tenancy Agreement</h6>
                            <p className="text-xs text-blue-700 mb-3">
                              We'll create a tenancy agreement based on the information provided.
                            </p>
                            
                            {!tenancyPrepData.documentGenerated ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setTenancyPrepData(prev => ({ ...prev, documentGenerated: true }));
                                  setTimeout(() => {
                                    setTenancyPrepData(prev => ({ ...prev, documentSentForSigning: true }));
                                  }, 2000);
                                }}
                                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
                              >
                                Generate Agreement
                              </button>
                            ) : !tenancyPrepData.documentSentForSigning ? (
                              <div className="flex items-center space-x-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                <span className="text-sm text-blue-700">Generating document...</span>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <div className="flex items-center space-x-2 text-green-600">
                                  <CheckCircleIcon className="w-5 h-5" />
                                  <span className="text-sm font-medium">Agreement generated successfully!</span>
                                </div>
                                <div className="p-3 bg-white border border-green-200 rounded-md">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center space-x-3">
                                      <DocumentTextIcon className="w-5 h-5 text-gray-600" />
                                      <div>
                                        <p className="text-sm font-medium text-gray-900">Tenancy_Agreement.pdf</p>
                                        <p className="text-xs text-gray-500">Ready to send for signing</p>
                                      </div>
                                    </div>
                                    <button
                                      type="button"
                                      className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700"
                                    >
                                      Send for Signing
                                    </button>
                                  </div>
                                </div>
                                <p className="text-xs text-gray-600">
                                  📧 The tenant will receive an email with a link to sign the agreement electronically.
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTenancyPrepData(prev => ({ 
                            ...prev, 
                            documentOption: '',
                            documentGenerated: false,
                            documentSentForSigning: false 
                          }))}
                          className="mt-3 text-xs text-blue-600 hover:text-blue-800"
                        >
                          ← Change option
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Upload Existing Document Flow */}
                  {tenancyPrepData.documentOption === 'existing' && (
                    <div className="space-y-4">
                      <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <ArrowUpTrayIcon className="w-5 h-5 text-green-600 mt-0.5" />
                          <div className="flex-1">
                            <h6 className="text-sm font-semibold text-green-900 mb-1">Upload Existing Agreement</h6>
                            <p className="text-xs text-green-700 mb-3">
                              Upload a tenancy agreement that has already been signed.
                            </p>
                            
                            {!tenancyPrepData.existingDocument ? (
                              <div>
                                <input
                                  type="file"
                                  id="existingDoc"
                                  accept=".pdf,.doc,.docx"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      setTenancyPrepData(prev => ({ ...prev, existingDocument: file }));
                                    }
                                  }}
                                  className="hidden"
                                />
                                <label
                                  htmlFor="existingDoc"
                                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 cursor-pointer"
                                >
                                  <ArrowUpTrayIcon className="w-4 h-4 mr-2" />
                                  Choose File
                                </label>
                              </div>
                            ) : (
                              <div className="p-3 bg-white border border-green-200 rounded-md">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-3">
                                    <DocumentTextIcon className="w-5 h-5 text-gray-600" />
                                    <div>
                                      <p className="text-sm font-medium text-gray-900">{tenancyPrepData.existingDocument.name}</p>
                                      <p className="text-xs text-gray-500">Uploaded successfully</p>
                                    </div>
                                  </div>
                                  <CheckCircleIcon className="w-5 h-5 text-green-600" />
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => setTenancyPrepData(prev => ({ 
                            ...prev, 
                            documentOption: '',
                            existingDocument: null 
                          }))}
                          className="mt-3 text-xs text-green-600 hover:text-green-800"
                        >
                          ← Change option
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Credit Checks Step */}
            {wizardSteps[currentWizardStep]?.key === 'creditChecks' && (
              <div className="space-y-4">
                <div className="mb-4">
                  <h4 className="text-base font-semibold text-gray-900 mb-2 flex items-center">
                    <DocumentCheckIcon className="w-5 h-5 mr-2 text-blue-600" />
                    Credit Checks
                  </h4>
                  <p className="text-sm text-gray-600">Upload existing credit check, order a new one, or skip this step</p>
                </div>

                <div className="grid md:grid-cols-3 gap-4">
                  {/* Upload Credit Check */}
                  <div className={`p-6 border-2 rounded-lg transition-all cursor-pointer ${
                    creditCheckData.creditCheckStatus === 'uploaded' 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}>
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                        <ArrowUpTrayIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <h5 className="text-sm font-semibold text-gray-900 mb-2">Upload Credit Check</h5>
                      <p className="text-xs text-gray-500 mb-3">Upload an existing credit report</p>
                      <label className="w-full">
                        <input
                          type="file"
                          accept=".pdf,.doc,.docx"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              setCreditCheckData(prev => ({ 
                                ...prev, 
                                uploadedFile: file,
                                creditCheckStatus: 'uploaded',
                                orderNew: false,
                                skipped: false
                              }));
                            }
                          }}
                          className="hidden"
                        />
                        <span className="block w-full px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 cursor-pointer">
                          {creditCheckData.uploadedFile ? creditCheckData.uploadedFile.name : 'Choose File'}
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Order New Credit Check */}
                  <button
                    type="button"
                    onClick={() => setCreditCheckData(prev => ({ 
                      ...prev, 
                      orderNew: !prev.orderNew,
                      creditCheckStatus: prev.orderNew ? 'pending' : 'ordered',
                      uploadedFile: null,
                      skipped: false
                    }))}
                    className={`p-6 border-2 rounded-lg transition-all text-left ${
                      creditCheckData.orderNew 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-3">
                        <ShoppingCartIcon className="w-6 h-6 text-blue-600" />
                      </div>
                      <h5 className="text-sm font-semibold text-gray-900 mb-2">Order Credit Check</h5>
                      <p className="text-xs text-gray-500 mb-3">Order a new credit reference check</p>
                      {creditCheckData.orderNew && (
                        <span className="px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">
                          Selected
                        </span>
                      )}
                    </div>
                  </button>

                  {/* Skip Credit Check */}
                  <button
                    type="button"
                    onClick={() => setCreditCheckData(prev => ({ 
                      ...prev, 
                      skipped: !prev.skipped,
                      creditCheckStatus: prev.skipped ? 'pending' : 'skipped',
                      uploadedFile: null,
                      orderNew: false
                    }))}
                    className={`p-6 border-2 rounded-lg transition-all text-left ${
                      creditCheckData.skipped 
                        ? 'border-gray-400 bg-gray-50' 
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex flex-col items-center text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                        <XMarkIcon className="w-6 h-6 text-gray-600" />
                      </div>
                      <h5 className="text-sm font-semibold text-gray-900 mb-2">Skip Credit Check</h5>
                      <p className="text-xs text-gray-500 mb-3">Proceed without credit check</p>
                      {creditCheckData.skipped && (
                        <span className="px-3 py-1 bg-gray-600 text-white text-xs font-medium rounded-full">
                          Skipped
                        </span>
                      )}
                    </div>
                  </button>
                </div>

                {creditCheckData.orderNew && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-700">
                      <strong>Note:</strong> A credit check will be ordered through our partner service. The tenant will receive an email with instructions.
                    </p>
                  </div>
                )}

                {creditCheckData.skipped && (
                  <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-sm text-amber-800">
                      <strong>⚠️ Note:</strong> Proceeding without a credit check. You can add this later from the tenant details.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Documents Checklist Step */}
            {wizardSteps[currentWizardStep]?.key === 'documents' && (
              <div className="space-y-4">
                <div className="mb-4">
                  <h4 className="text-base font-semibold text-gray-900 mb-2 flex items-center">
                    <ClipboardDocumentCheckIcon className="w-5 h-5 mr-2 text-blue-600" />
                    Documents Checklist
                  </h4>
                  <p className="text-sm text-gray-600">Track required documents for this tenancy</p>
                </div>

                <div className="space-y-3">
                  {[
                    { key: 'depositCertificate', label: 'Deposit Protection Certificate', description: 'Required by law within 30 days' },
                    { key: 'rightToRent', label: 'Right to Rent Documents', description: 'Verify tenant eligibility' },
                    { key: 'tenancyAgreement', label: 'Signed Tenancy Agreement', description: 'Both parties signed' },
                    { key: 'inventoryReport', label: 'Property Inventory Report', description: 'Condition at move-in' },
                    { key: 'gasSafetyCertificate', label: 'Gas Safety Certificate', description: 'Valid annual certificate' },
                  ].map((doc) => (
                    <div key={doc.key} className="p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                      <label className="flex items-start cursor-pointer">
                        <input
                          type="checkbox"
                          checked={documentsData[doc.key as keyof typeof documentsData]}
                          onChange={(e) => setDocumentsData(prev => ({ 
                            ...prev, 
                            [doc.key]: e.target.checked 
                          }))}
                          className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                        />
                        <div className="ml-3 flex-1">
                          <span className="text-sm font-medium text-gray-900 block">{doc.label}</span>
                          <span className="text-xs text-gray-500">{doc.description}</span>
                        </div>
                      </label>
                    </div>
                  ))}
                </div>

                <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <p className="text-sm text-amber-800">
                    <strong>Tip:</strong> You can add these documents now or complete them later from the tenant details page.
                  </p>
                </div>
              </div>
            )}

            {/* Summary Step */}
            {wizardSteps[currentWizardStep]?.key === 'summary' && !isCompleted && (
              <div className="space-y-4">
                <div className="mb-4">
                  <h4 className="text-base font-semibold text-gray-900 mb-2">Summary</h4>
                  <p className="text-sm text-gray-600">Review all details before completing</p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
                  <div>
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Tenant Information</h5>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><strong>Name:</strong> {formData.firstName} {formData.surname}</p>
                      <p><strong>Email:</strong> {formData.email}</p>
                      {formData.phone && <p><strong>Phone:</strong> {formData.phone}</p>}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Property Assignment</h5>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><strong>Property:</strong> {selectedProperty?.address}</p>
                      <p><strong>Type:</strong> {selectedProperty?.propertyType}</p>
                      {formData.roomId && (
                        <p><strong>Room:</strong> {formData.roomName}</p>
                      )}
                    </div>
                  </div>

                  {!isExistingTenant && (tenancyPrepData.startDate || tenancyPrepData.monthlyRent || tenancyPrepData.deposit) && (
                    <div className="border-t border-gray-200 pt-4">
                      <h5 className="text-sm font-medium text-gray-900 mb-2">Tenancy Details</h5>
                      <div className="space-y-1 text-sm text-gray-600">
                        {tenancyPrepData.startDate && <p><strong>Start Date:</strong> {new Date(tenancyPrepData.startDate).toLocaleDateString()}</p>}
                        {tenancyPrepData.monthlyRent && <p><strong>Monthly Rent:</strong> £{tenancyPrepData.monthlyRent}</p>}
                        {tenancyPrepData.deposit && <p><strong>Deposit:</strong> £{tenancyPrepData.deposit}</p>}
                        <p><strong>Contract:</strong> {tenancyPrepData.contractGenerated ? 'Generated ✓' : 'Not generated'}</p>
                      </div>
                    </div>
                  )}

                  <div className="border-t border-gray-200 pt-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Credit Check</h5>
                    <div className="space-y-1 text-sm text-gray-600">
                      {creditCheckData.uploadedFile ? (
                        <p><strong>Status:</strong> Uploaded - {creditCheckData.uploadedFile.name}</p>
                      ) : creditCheckData.orderNew ? (
                        <p><strong>Status:</strong> New check ordered</p>
                      ) : (
                        <p><strong>Status:</strong> Not completed</p>
                      )}
                    </div>
                  </div>

                  <div className="border-t border-gray-200 pt-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-2">Documents Checklist</h5>
                    <div className="space-y-1 text-sm text-gray-600">
                      {Object.entries(documentsData).filter(([_, checked]) => checked).length > 0 ? (
                        <ul className="list-disc list-inside">
                          {documentsData.depositCertificate && <li>Deposit Protection Certificate</li>}
                          {documentsData.rightToRent && <li>Right to Rent Documents</li>}
                          {documentsData.tenancyAgreement && <li>Signed Tenancy Agreement</li>}
                          {documentsData.inventoryReport && <li>Property Inventory Report</li>}
                          {documentsData.gasSafetyCertificate && <li>Gas Safety Certificate</li>}
                        </ul>
                      ) : (
                        <p>No documents marked as completed</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Completion Screen */}
            {isCompleted && (
              <div className="space-y-6 text-center py-8">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                    <CheckCircleIcon className="w-10 h-10 text-green-600" />
                  </div>
                </div>
                
                <div>
                  <h4 className="text-xl font-bold text-gray-900 mb-2">
                    Tenant Successfully Added!
                  </h4>
                  <p className="text-sm text-gray-600">
                    {formData.firstName} {formData.surname} has been added to {selectedProperty?.address}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-left">
                  <h5 className="text-sm font-semibold text-blue-900 mb-2">What's Next?</h5>
                  <ul className="text-sm text-blue-700 space-y-1">
                    <li>• View tenant details from the Tenants tab</li>
                    <li>• Upload additional documents as needed</li>
                    <li>• Set up rent payment tracking</li>
                    <li>• Schedule property inspections</li>
                  </ul>
                </div>

                <button
                  onClick={() => {
                    // Reset all form data
                    setFormData({
                      firstName: '',
                      surname: '',
                      email: '',
                      phone: '',
                      propertyId: '',
                      unitNumber: '',
                      roomId: '',
                      roomName: '',
                    });
                    setTenancyPrepData({
                      startDate: '',
                      monthlyRent: '',
                      deposit: '',
                      contractGenerated: false,
                    });
                    setCreditCheckData({
                      uploadedFile: null,
                      orderNew: false,
                      creditCheckStatus: 'pending',
                    });
                    setDocumentsData({
                      depositCertificate: false,
                      rightToRent: false,
                      tenancyAgreement: false,
                      inventoryReport: false,
                      gasSafetyCertificate: false,
                    });
                    setCurrentWizardStep(0);
                    setIsCompleted(false);
                    onClose();
                  }}
                  className="px-6 py-3 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Close
                </button>
              </div>
            )}
          </div>

          {/* Footer with Navigation Buttons - Hidden when completed */}
          {!isCompleted && (
            <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-6">
              <div>
                {currentWizardStep > 0 && (
                  <button
                    type="button"
                    onClick={handleBack}
                    disabled={isSubmitting}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Back
                  </button>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                
                {currentWizardStep < wizardSteps.length - 1 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    disabled={!canProceedToNextStep()}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isSubmitting || properties.length === 0}
                    className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <div className="flex items-center">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                        Adding...
                      </div>
                    ) : (
                      'Add Tenant'
                    )}
                  </button>
                )}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
};
