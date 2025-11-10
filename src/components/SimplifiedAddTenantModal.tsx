import React, { useState, useMemo } from 'react';
import { XMarkIcon, UserIcon, HomeIcon, CheckIcon } from '@heroicons/react/24/outline';
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

// Define wizard steps
const wizardSteps = [
  { key: 'basicInfo', title: 'Basic Info', required: true },
  { key: 'property', title: 'Property', required: true },
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
      
      // Reset form and close modal
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
      setCurrentWizardStep(0);
      onClose();
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

        {/* Wizard Step Navigation */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {wizardSteps.map((step, index) => {
              const isActive = index === currentWizardStep;
              const isCompleted = index < currentWizardStep;
              const isLast = index === wizardSteps.length - 1;

              return (
                <div key={step.key} className="flex items-center flex-1">
                  <button
                    type="button"
                    onClick={() => {
                      if (index < currentWizardStep) {
                        setCurrentWizardStep(index);
                      }
                    }}
                    disabled={index > currentWizardStep}
                    className={`flex items-center space-x-2 ${
                      index <= currentWizardStep ? 'cursor-pointer' : 'cursor-not-allowed'
                    }`}
                  >
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
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
                    <div className="text-left">
                      <p className={`text-sm font-medium ${
                        isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </p>
                    </div>
                  </button>
                  {!isLast && (
                    <div className={`flex-1 h-0.5 mx-2 transition-colors ${
                      isCompleted ? 'bg-green-500' : 'bg-gray-300'
                    }`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Messages */}
        {error && (
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

            {/* Step 3: Summary */}
            {currentWizardStep === 2 && (
              <div className="space-y-4">
                <div className="mb-4">
                  <h4 className="text-base font-semibold text-gray-900 mb-2">Summary</h4>
                  <p className="text-sm text-gray-600">Review the tenant details before adding</p>
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
                </div>

                {!isExistingTenant && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start space-x-2">
                      <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-blue-900 mb-1">Next Steps</h4>
                        <p className="text-sm text-blue-700 mb-2">
                          After adding this tenant, you'll be able to start the onboarding process which includes:
                        </p>
                        <ul className="text-sm text-blue-700 ml-4 list-disc space-y-1">
                          <li>Adding lease information and terms</li>
                          <li>Ordering credit reference checks</li>
                          <li>Generating tenancy agreements</li>
                          <li>Preparing for tenancy handover</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer with Navigation Buttons */}
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
        </form>
      </div>
    </div>
  );
};
