import React, { useState, useMemo } from 'react';
import { XMarkIcon, UserIcon, HomeIcon } from '@heroicons/react/24/outline';
import { SimplifiedProperty, SimplifiedTenant, validateTenantData } from '../utils/simplifiedDataTransforms';
import { SimplifiedTenantService } from '../services/SimplifiedTenantService';



interface SimplifiedAddTenantModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTenantAdded: (tenant: SimplifiedTenant) => void;
  properties: SimplifiedProperty[];
  existingTenants: SimplifiedTenant[];
}

export const SimplifiedAddTenantModal: React.FC<SimplifiedAddTenantModalProps> = ({
  isOpen,
  onClose,
  onTenantAdded,
  properties,
  existingTenants,
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    surname: '',
    email: '',
    phone: '',
    propertyId: '',
    unitNumber: '',
    roomId: '',
    roomName: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get available properties (not at full capacity)
  const availableProperties = useMemo(() => {
    const filtered = properties.filter(property => {
      const propertyTenants = existingTenants.filter(t => t.propertyId === property.id);
      
      // Calculate max tenants based on property type and structure
      let maxTenants = 1; // Default for single-unit properties
      
      if (property.propertyType === 'house') {
        maxTenants = property.bedrooms || 1;
      } else if (property.propertyType === 'hmo') {
        // For HMO properties, use bedrooms as max tenants (one tenant per room)
        maxTenants = property.bedrooms || 1;
      } else if (property.propertyType === 'apartment' || property.propertyType === 'flat') {
        // For apartments/flats, typically one tenancy (but could have multiple tenants)
        maxTenants = property.bedrooms || 1;
      } else if (property.units && typeof property.units === 'number') {
        // For properties with defined units
        maxTenants = property.units;
      }
      
      const isAvailable = propertyTenants.length < maxTenants;
      
      // Debug logging
      // Debug logging removed to reduce console noise
      
      return isAvailable;
    });
    
    // Debug logging removed to reduce console noise
    return filtered;
  }, [properties, existingTenants]);

  // Date-related logic removed - now handled in onboarding flow

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
            rent: 500 // Default rent for undefined HMO rooms
          });
        }
      }
      return rooms;
    }

    // For flats, typically whole unit rental
    return [];
  }, [formData.propertyId, properties, existingTenants]);

  // Check if selected property is HMO (House in Multiple Occupation)
  const isHMO = useMemo(() => {
    const selectedProperty = properties.find(p => p.id === formData.propertyId);
    return selectedProperty?.propertyType === 'hmo' || 
           (selectedProperty?.propertyType === 'house' && selectedProperty.bedrooms > 2);
  }, [formData.propertyId, properties]);

  // Rent calculation removed - now handled in onboarding flow

  // Room selection effect - no longer needed for lease dates

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

      if (!formData.phone.trim()) {
        throw new Error('Phone number is required');
      }

      if (!formData.propertyId) {
        throw new Error('Please select a property');
      }

      if (isHMO && !formData.unitNumber) {
        throw new Error('Please select a room for this HMO property');
      }

      // Basic tenant validation only - lease info will be added in onboarding

      // Create tenant data without lease information
      const tenantData = {
        name: `${formData.firstName.trim()} ${formData.surname.trim()}`,
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        propertyId: formData.propertyId,
        unitNumber: isHMO ? formData.unitNumber : undefined,
        roomId: isHMO ? formData.roomId : undefined,
        roomName: isHMO ? formData.roomName : undefined,
      };

      // Basic validation for tenant creation without lease data

      // Create tenant in database
      const createdTenant = await SimplifiedTenantService.createSimplifiedTenant(tenantData);

      if (!createdTenant) {
        throw new Error('Failed to create tenant. Please try again.');
      }

      // Create onboarding process automatically
      const propertyAddress = properties.find(p => p.id === formData.propertyId)?.address || 'Unknown Property';
      
      console.log('Tenant created successfully:', createdTenant.name);

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
      onClose();
    } catch (err) {
      console.error('Error adding tenant:', err);
      setError(err instanceof Error ? err.message : 'Failed to add tenant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'monthlyRent' || name === 'depositAmount' 
        ? parseFloat(value) || 0 
        : value 
    }));
  };

  // No longer setting default lease dates - handled in onboarding

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
        className="relative top-10 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-lg bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Add New Tenant</h3>
              <p className="text-sm text-gray-500">Add a tenant and assign them to a property</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Tenant Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Tenant Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
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
                  Surname *
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
                  Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
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
          </div>

          {/* Property Assignment */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Property Assignment</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={isHMO ? 'md:col-span-1' : 'md:col-span-2'}>
                <label htmlFor="propertyId" className="block text-sm font-medium text-gray-700 mb-1">
                  Property *
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
                  {availableProperties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.address} ({property.propertyType})
                    </option>
                  ))}
                </select>
                {availableProperties.length === 0 && (
                  <p className="text-xs text-red-600 mt-1">
                    No properties available. All properties are at full capacity.
                  </p>
                )}
              </div>

              {isHMO && (
                <div>
                  <label htmlFor="roomId" className="block text-sm font-medium text-gray-700 mb-1">
                    Room *
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
                        unitNumber: selectedRoom?.name || '', // Keep for backward compatibility
                        monthlyRent: selectedRoom?.rent || prev.monthlyRent
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
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start space-x-2">
                  <HomeIcon className="w-4 h-4 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-700">
                    <strong>HMO Property:</strong> This house has multiple bedrooms and can accommodate individual room rentals.
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Note about lease information */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center mt-0.5">
                <div className="w-2 h-2 bg-blue-600 rounded-full" />
              </div>
              <div>
                <h4 className="text-sm font-medium text-blue-900 mb-1">Next Steps</h4>
                <p className="text-sm text-blue-700">
                  After adding this tenant, you'll be able to start the onboarding process which includes:
                </p>
                <ul className="text-sm text-blue-700 mt-2 ml-4 list-disc">
                  <li>Adding lease information and terms</li>
                  <li>Ordering credit reference checks</li>
                  <li>Generating tenancy agreements</li>
                  <li>Preparing for tenancy handover</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting || 
                availableProperties.length === 0
              }
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
          </div>
        </form>
      </div>
    </div>
  );
};