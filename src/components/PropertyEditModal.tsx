import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  HomeIcon,
  BuildingOfficeIcon,
  CurrencyPoundIcon,
  UserGroupIcon,
  CheckIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { SimplifiedProperty, PropertyRoom } from '../utils/simplifiedDataTransforms';
import { validatePropertyData } from '../utils/simplifiedDataTransforms';

interface PropertyEditModalProps {
  property: SimplifiedProperty | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (property: SimplifiedProperty) => void;
}

const propertyTypeOptions = [
  { value: 'house', label: 'House', icon: HomeIcon },
  { value: 'flat', label: 'Flat', icon: BuildingOfficeIcon },
  { value: 'hmo', label: 'HMO', icon: UserGroupIcon }
];

const statusOptions = [
  { value: 'under_management', label: 'Under Management', color: 'text-blue-700 bg-blue-50 border-blue-200' },
  { value: 'sold', label: 'Sold', color: 'text-gray-700 bg-gray-50 border-gray-200' }
];

export const PropertyEditModal: React.FC<PropertyEditModalProps> = ({
  property,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<SimplifiedProperty>({
    id: '',
    propertyName: '',
    address: '',
    propertyType: 'house',
    bedrooms: 2,
    bathrooms: 1,
    targetRent: 1200,
    tenantCount: 0,
    status: 'under_management',
    units: 1,
    totalArea: undefined,
    yearBuilt: undefined,
    furnished: 'unfurnished',
    parking: 'none',
    garden: false,
    maxOccupancy: undefined,
    licenseRequired: false,
    licenseNumber: undefined,
    licenseExpiry: undefined,
    rooms: []
  });
  
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Update form data when property changes
  useEffect(() => {
    if (property) {
      setFormData({
        ...property,
        // Ensure all fields have proper defaults
        propertyName: property.propertyName || '',
        address: property.address || '',
        propertyType: property.propertyType || 'house',
        bedrooms: property.bedrooms || 2,
        bathrooms: property.bathrooms || 1,
        targetRent: property.targetRent || 1200,
        tenantCount: property.tenantCount || 0,
        status: property.status || 'under_management',
        units: property.units || 1,
        purchasePrice: property.purchasePrice || undefined,
        salesPrice: property.salesPrice || undefined,
        actualRent: property.actualRent || undefined,
        totalArea: property.totalArea || undefined,
        yearBuilt: property.yearBuilt || undefined,
        furnished: property.furnished || 'unfurnished',
        parking: property.parking || 'none',
        garden: property.garden || false,
        maxOccupancy: property.maxOccupancy || undefined,
        licenseRequired: property.licenseRequired || false,
        licenseNumber: property.licenseNumber || undefined,
        licenseExpiry: property.licenseExpiry || undefined,
        rooms: property.rooms || []
      });
      setErrors([]);
    }
  }, [property]);

  const handleInputChange = (field: keyof SimplifiedProperty, value: any) => {
    setFormData(prev => {
      const updated = {
        ...prev,
        [field]: value
      };
      
      // For HMO properties, calculate targetRent from room rents
      if (updated.propertyType === 'hmo' && field === 'rooms') {
        updated.targetRent = (value || []).reduce((sum: number, room: any) => sum + room.monthlyRent, 0);
      }
      
      return updated;
    });
    
    // Clear errors when user starts typing
    if (errors.length > 0) {
      setErrors([]);
    }
  };

  const handleSave = async () => {
    const validationErrors = validatePropertyData(formData);
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    setIsSaving(true);
    
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error('Error saving property:', error);
      setErrors(['Failed to save property. Please try again.']);
    } finally {
      setIsSaving(false);
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

  if (!isOpen || !property) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-25 z-40"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="fixed right-0 top-0 h-full w-1/3 min-w-[500px] bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <HomeIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Edit Property</h2>
              <p className="text-sm text-gray-500">Update property information</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Error Messages */}
          {errors.length > 0 && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-start space-x-2">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="text-sm font-medium text-red-800">Please fix the following errors:</h3>
                  <ul className="mt-2 text-sm text-red-700 space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Property Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Name (Optional)
              </label>
              <input
                type="text"
                value={formData.propertyName || ''}
                onChange={(e) => handleInputChange('propertyName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g. Sunset House, Victoria Apartments..."
              />
              <p className="text-xs text-gray-500 mt-1">
                Give your property a memorable name for easy reference
              </p>
            </div>

            {/* Address */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Address
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                placeholder="Enter full property address..."
              />
            </div>

            {/* Property Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Type
              </label>
              <div className="grid grid-cols-1 gap-2">
                {propertyTypeOptions.map((option) => {
                  const Icon = option.icon;
                  return (
                    <button
                      key={option.value}
                      onClick={() => handleInputChange('propertyType', option.value as SimplifiedProperty['propertyType'])}
                      className={`flex items-center space-x-3 p-3 border rounded-lg transition-colors ${
                        formData.propertyType === option.value
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{option.label}</span>
                      {formData.propertyType === option.value && (
                        <CheckIcon className="w-4 h-4 ml-auto" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bedrooms & Bathrooms */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bedrooms
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  value={formData.bedrooms}
                  onChange={(e) => handleInputChange('bedrooms', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bathrooms
                </label>
                <input
                  type="number"
                  min="0"
                  max="5"
                  value={formData.bathrooms}
                  onChange={(e) => handleInputChange('bathrooms', parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            {/* Target Rent - Hidden for HMO properties */}
            {formData.propertyType !== 'hmo' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Target Rent
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <CurrencyPoundIcon className="w-4 h-4 text-gray-400" />
                  </div>
                  <input
                  type="number"
                  min="0"
                  step="1"
                  value={formData.targetRent}
                  onChange={(e) => handleInputChange('targetRent', parseInt(e.target.value) || 0)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="1200"
                />
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Current value: {formatCurrency(formData.targetRent)}
              </p>
            </div>
            )}

            {/* HMO Total Rent Display */}
            {formData.propertyType === 'hmo' && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center space-x-2 mb-2">
                  <CurrencyPoundIcon className="w-4 h-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Total Monthly Rent</span>
                </div>
                <p className="text-2xl font-bold text-blue-900">
                  {formatCurrency((formData.rooms || []).reduce((sum, room) => sum + room.monthlyRent, 0))}
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  Calculated from {(formData.rooms || []).length} room{(formData.rooms || []).length !== 1 ? 's' : ''}
                </p>
              </div>
            )}

            {/* Status */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Property Status
              </label>
              <div className="space-y-2">
                {statusOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleInputChange('status', option.value as SimplifiedProperty['status'])}
                    className={`w-full flex items-center justify-between p-3 border rounded-lg transition-colors ${
                      formData.status === option.value
                        ? option.color + ' border-current'
                        : 'border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <span className="font-medium">{option.label}</span>
                    {formData.status === option.value && (
                      <CheckIcon className="w-4 h-4" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Property Details */}
            <div className="space-y-4 border-t border-gray-200 pt-6">
              <h3 className="text-lg font-medium text-gray-900">Property Details</h3>
              
              {/* Total Area & Year Built */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Area (m²)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.totalArea || ''}
                    onChange={(e) => handleInputChange('totalArea', e.target.value ? parseFloat(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. 120"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Year Built
                  </label>
                  <input
                    type="number"
                    min="1800"
                    max={new Date().getFullYear()}
                    value={formData.yearBuilt || ''}
                    onChange={(e) => handleInputChange('yearBuilt', e.target.value ? parseInt(e.target.value) : undefined)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="e.g. 1995"
                  />
                </div>
              </div>

              {/* Furnished & Parking */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Furnished
                  </label>
                  <select
                    value={formData.furnished || 'unfurnished'}
                    onChange={(e) => handleInputChange('furnished', e.target.value as 'furnished' | 'unfurnished' | 'part_furnished')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="unfurnished">Unfurnished</option>
                    <option value="part_furnished">Part Furnished</option>
                    <option value="furnished">Fully Furnished</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Parking
                  </label>
                  <select
                    value={formData.parking || 'none'}
                    onChange={(e) => handleInputChange('parking', e.target.value as 'none' | 'street' | 'driveway' | 'garage')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="none">No Parking</option>
                    <option value="street">Street Parking</option>
                    <option value="driveway">Driveway</option>
                    <option value="garage">Garage</option>
                  </select>
                </div>
              </div>

              {/* Garden */}
              <div>
                <label className="flex items-center space-x-3">
                  <input
                    type="checkbox"
                    checked={formData.garden || false}
                    onChange={(e) => handleInputChange('garden', e.target.checked)}
                    className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 checked:bg-blue-600 checked:border-blue-600"
                    style={{ backgroundColor: formData.garden ? '' : 'white' }}
                  />
                  <span className="text-sm font-medium text-gray-700">Has Garden</span>
                </label>
              </div>

              {/* HMO Specific Fields */}
              {formData.propertyType === 'hmo' && (
                <div className="space-y-4 border-t border-gray-200 pt-4">
                  <h4 className="text-md font-medium text-gray-900">HMO Details</h4>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Max Occupancy
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="20"
                        value={formData.maxOccupancy || ''}
                        onChange={(e) => handleInputChange('maxOccupancy', e.target.value ? parseInt(e.target.value) : undefined)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g. 6"
                      />
                    </div>
                  </div>

                  {/* License Requirement */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center space-x-3">
                      <input
                        type="checkbox"
                        id="licenseRequired"
                        checked={formData.licenseRequired || false}
                        onChange={(e) => {
                          handleInputChange('licenseRequired', e.target.checked);
                          // Clear license fields if not required
                          if (!e.target.checked) {
                            handleInputChange('licenseNumber', undefined);
                            handleInputChange('licenseExpiry', undefined);
                          }
                        }}
                        className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 checked:bg-blue-600 checked:border-blue-600"
                        style={{ backgroundColor: formData.licenseRequired ? '' : 'white' }}
                      />
                      <label htmlFor="licenseRequired" className="text-sm font-medium text-gray-700">
                        HMO License Required
                      </label>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      Check this if your local authority requires an HMO license for this property
                    </p>
                  </div>

                  {/* License Details - Only show if license is required */}
                  {formData.licenseRequired && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            License Number
                          </label>
                          <input
                            type="text"
                            value={formData.licenseNumber || ''}
                            onChange={(e) => handleInputChange('licenseNumber', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder="HMO License Number"
                            required={formData.licenseRequired}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            License Expiry Date
                          </label>
                          <input
                            type="date"
                            value={formData.licenseExpiry ? formData.licenseExpiry.toISOString().split('T')[0] : ''}
                            onChange={(e) => handleInputChange('licenseExpiry', e.target.value ? new Date(e.target.value) : undefined)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            required={formData.licenseRequired}
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Room Management */}
                  <div className="border-t border-gray-200 pt-4">
                    <div className="flex items-center justify-between mb-3">
                      <h5 className="text-sm font-medium text-gray-900">Rooms</h5>
                      <button
                        type="button"
                        onClick={() => {
                          const newRoom = {
                            id: `room-${Date.now()}`,
                            name: `Room ${(formData.rooms || []).length + 1}`,
                            area: 12,
                            monthlyRent: 500, // Default room rent
                            isOccupied: false
                          };
                          handleInputChange('rooms', [...(formData.rooms || []), newRoom]);
                        }}
                        className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Add Room
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {(formData.rooms || []).map((room, index) => (
                        <div key={room.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                          <div className="flex items-end gap-3">
                            <div className="flex-1">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Room Name
                              </label>
                              <input
                                type="text"
                                value={room.name}
                                onChange={(e) => {
                                  const updatedRooms = [...(formData.rooms || [])];
                                  updatedRooms[index] = { ...room, name: e.target.value };
                                  handleInputChange('rooms', updatedRooms);
                                }}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="e.g. Master Bedroom"
                              />
                            </div>
                            <div className="w-24">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Area (m²)
                              </label>
                              <input
                                type="number"
                                min="1"
                                value={room.area}
                                onChange={(e) => {
                                  const updatedRooms = [...(formData.rooms || [])];
                                  updatedRooms[index] = { ...room, area: parseFloat(e.target.value) || 0 };
                                  handleInputChange('rooms', updatedRooms);
                                }}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <div className="w-32">
                              <label className="block text-xs font-medium text-gray-700 mb-1">
                                Monthly Rent (£)
                              </label>
                              <input
                                type="number"
                                min="0"
                                value={room.monthlyRent}
                                onChange={(e) => {
                                  const updatedRooms = [...(formData.rooms || [])];
                                  updatedRooms[index] = { ...room, monthlyRent: parseFloat(e.target.value) || 0 };
                                  handleInputChange('rooms', updatedRooms);
                                }}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updatedRooms = (formData.rooms || []).filter((_, i) => i !== index);
                                handleInputChange('rooms', updatedRooms);
                              }}
                              className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {(!formData.rooms || formData.rooms.length === 0) && (
                        <div className="text-center py-4 text-gray-500 text-sm">
                          No rooms defined. Click "Add Room" to create rooms for this HMO.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Current Tenants Info */}
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <UserGroupIcon className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Current Tenants</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{formData.tenantCount}</p>
              <p className="text-xs text-gray-500">
                {formData.tenantCount === 0 ? 'No tenants assigned' : 
                 formData.tenantCount === 1 ? '1 tenant assigned' : 
                 `${formData.tenantCount} tenants assigned`}
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
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
          </div>
        </div>
      </div>
    </>
  );
};