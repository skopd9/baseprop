import React, { useState } from 'react';
import { XMarkIcon, HomeIcon } from '@heroicons/react/24/outline';
import { SimplifiedProperty } from '../utils/simplifiedDataTransforms';
import { supabase } from '../lib/supabase';
import { useOrganization } from '../contexts/OrganizationContext';
import { useCurrency } from '../hooks/useCurrency';

interface SimplifiedAddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPropertyAdded: (property: SimplifiedProperty) => void;
  propertyToEdit?: SimplifiedProperty; // Optional property to edit
}

export const SimplifiedAddPropertyModal: React.FC<SimplifiedAddPropertyModalProps> = ({
  isOpen,
  onClose,
  onPropertyAdded,
  propertyToEdit,
}) => {
  const { currentOrganization } = useOrganization();
  const { currencySymbol } = useCurrency();
  const [formData, setFormData] = useState({
    addressLine1: '',
    addressLine2: '',
    city: '',
    postcode: '',
    propertyType: 'house' as 'house' | 'flat' | 'hmo',
    bedrooms: 2,
    bathrooms: 1,
    targetRent: 1200,
    purchasePrice: 0,
    units: [] as Array<{ name: string; area: number; targetRent: number }>,
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Initialize form with property data if editing
  React.useEffect(() => {
    if (isOpen && propertyToEdit) {
      // Parse existing address or structured address from property_data
      const propertyData = (propertyToEdit as any).property_data || {};
      setFormData({
        addressLine1: propertyData.address_line_1 || propertyToEdit.address || '',
        addressLine2: propertyData.address_line_2 || '',
        city: propertyData.city || '',
        postcode: propertyData.postcode || '',
        propertyType: propertyToEdit.propertyType,
        bedrooms: propertyToEdit.bedrooms,
        bathrooms: propertyToEdit.bathrooms,
        targetRent: propertyToEdit.targetRent,
        purchasePrice: propertyToEdit.purchasePrice || 0,
        units: propertyToEdit.unitDetails || [],
      });
    } else if (isOpen && !propertyToEdit) {
      // Reset form for new property
      setFormData({
        addressLine1: '',
        addressLine2: '',
        city: '',
        postcode: '',
        propertyType: 'house',
        bedrooms: 2,
        bathrooms: 1,
        targetRent: 1200,
        purchasePrice: 0,
        units: [],
      });
    }
  }, [isOpen, propertyToEdit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.addressLine1.trim()) {
        throw new Error('Address Line 1 is required');
      }

      if (!formData.city.trim()) {
        throw new Error('City is required');
      }

      if (!formData.postcode.trim()) {
        throw new Error('Postcode/ZIP Code is required');
      }

      if (formData.bedrooms < 0 || formData.bedrooms > 10) {
        throw new Error('Bedrooms must be between 0 and 10');
      }

      if (formData.bathrooms < 0 || formData.bathrooms > 5) {
        throw new Error('Bathrooms must be between 0 and 5');
      }

      if (formData.targetRent < 0) {
        throw new Error('Target rent cannot be negative');
      }

      if (formData.purchasePrice < 0) {
        throw new Error('Purchase price cannot be negative');
      }

      if (formData.propertyType === 'hmo' && formData.units.length === 0) {
        throw new Error('HMO properties must have at least one unit defined');
      }

      // Validate HMO units
      if (formData.propertyType === 'hmo') {
        for (const unit of formData.units) {
          if (!unit.name.trim()) {
            throw new Error('All units must have a name');
          }
          if (unit.area <= 0) {
            throw new Error('All units must have a valid area (sqm)');
          }
          if (unit.targetRent <= 0) {
            throw new Error('All units must have a valid target rent');
          }
        }
      }

      // Validate organization
      if (!currentOrganization?.id) {
        throw new Error('No organization selected. Please ensure you are part of an organization.');
      }

      // Get organization country code
      const orgCountryCode = currentOrganization.country_code || 'UK';

      // Generate a unique asset register ID
      const assetRegisterId = `SIMP-${Date.now().toString().slice(-6)}`;
      
      // Calculate total target rent for HMO properties
      const totalTargetRent = formData.propertyType === 'hmo' 
        ? formData.units.reduce((sum, unit) => sum + unit.targetRent, 0)
        : formData.targetRent;

      // Build full address string for backward compatibility
      const fullAddress = [
        formData.addressLine1,
        formData.addressLine2,
        formData.city,
        formData.postcode
      ].filter(Boolean).join(', ');

      // Prepare property data for database with structured address
      const propertyData = {
        property_type: 'residential',
        property_sub_type: formData.propertyType,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        target_rent: totalTargetRent,
        purchase_price: formData.purchasePrice || null,
        units: formData.propertyType === 'hmo' ? formData.units : 1,
        unit_details: formData.propertyType === 'hmo' ? formData.units : null,
        tenant_count: 0,
        is_simplified_demo: true,
        // Structured address fields
        address_line_1: formData.addressLine1,
        address_line_2: formData.addressLine2,
        city: formData.city,
        postcode: formData.postcode,
      };

      let data;
      
      if (propertyToEdit) {
        // Update existing property
        const { data: updateData, error: updateError } = await supabase
          .from('properties')
          .update({
            name: `Property at ${fullAddress}`,
            address: fullAddress,
            property_data: propertyData,
          })
          .eq('id', propertyToEdit.id)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }
        data = updateData;
      } else {
        // Insert new property with organization's country code
        const { data: insertData, error: insertError } = await supabase
          .from('properties')
          .insert({
            asset_register_id: assetRegisterId,
            name: `Property at ${fullAddress}`,
            address: fullAddress,
            status: 'vacant',
            property_data: propertyData,
            organization_id: currentOrganization.id,
            country_code: orgCountryCode, // Auto-set from organization
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }
        data = insertData;
      }

      // Transform to simplified format
      const simplifiedProperty: SimplifiedProperty = {
        id: data.id,
        propertyReference: data.property_reference || 0,
        countryCode: data.country_code || orgCountryCode,
        address: fullAddress,
        propertyType: formData.propertyType,
        bedrooms: formData.bedrooms,
        bathrooms: formData.bathrooms,
        targetRent: totalTargetRent,
        purchasePrice: formData.purchasePrice || undefined,
        tenantCount: propertyToEdit?.tenantCount || 0,
        status: propertyToEdit?.status || 'under_management',
        units: formData.propertyType === 'hmo' ? formData.units : 1,
        unitDetails: formData.propertyType === 'hmo' ? formData.units : undefined,
      };

      // Call the callback with the property
      onPropertyAdded(simplifiedProperty);
      
      // Reset form and close modal
      setFormData({
        addressLine1: '',
        addressLine2: '',
        city: '',
        postcode: '',
        propertyType: 'house',
        bedrooms: 2,
        bathrooms: 1,
        targetRent: 1200,
        purchasePrice: 0,
        units: [],
      });
      onClose();
    } catch (err) {
      console.error('Error adding property:', err);
      setError(err instanceof Error ? err.message : 'Failed to add property');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'bedrooms' || name === 'bathrooms' || name === 'targetRent'
        ? parseInt(value) || 0 
        : name === 'purchasePrice'
        ? value === '' ? 0 : parseFloat(value) || 0
        : value 
    }));
  };

  const addUnit = () => {
    setFormData(prev => ({
      ...prev,
      units: [...prev.units, { 
        name: `Unit ${prev.units.length + 1}`, 
        area: 12, // Default area in sqm
        targetRent: 400 // Default rent per unit
      }]
    }));
  };

  const updateUnit = (index: number, field: 'name' | 'area' | 'targetRent', value: string | number) => {
    setFormData(prev => ({
      ...prev,
      units: prev.units.map((unit, i) => 
        i === index ? { ...unit, [field]: value } : unit
      )
    }));
  };

  const removeUnit = (index: number) => {
    setFormData(prev => ({
      ...prev,
      units: prev.units.filter((_, i) => i !== index)
    }));
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
        className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-lg bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <HomeIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {propertyToEdit ? 'Edit Property' : 'Add New Property'}
              </h3>
              <p className="text-sm text-gray-500">
                {propertyToEdit ? 'Update property details' : 'Add a residential property to your portfolio'}
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

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Structured Address Fields */}
          <div className="space-y-3">
            <div>
              <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 1 *
              </label>
              <input
                type="text"
                id="addressLine1"
                name="addressLine1"
                value={formData.addressLine1}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white"
                placeholder={currentOrganization?.country_code === 'US' ? 'e.g., 123 Main Street' : 'e.g., 123 High Street'}
              />
            </div>

            <div>
              <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700 mb-1">
                Address Line 2
              </label>
              <input
                type="text"
                id="addressLine2"
                name="addressLine2"
                value={formData.addressLine2}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white"
                placeholder="Apartment, suite, unit, etc."
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                  City *
                </label>
                <input
                  type="text"
                  id="city"
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white"
                  placeholder={currentOrganization?.country_code === 'US' ? 'New York' : currentOrganization?.country_code === 'GR' ? 'Athens' : 'London'}
                />
              </div>

              <div>
                <label htmlFor="postcode" className="block text-sm font-medium text-gray-700 mb-1">
                  {currentOrganization?.country_code === 'US' ? 'ZIP Code' : 'Postcode'} *
                </label>
                <input
                  type="text"
                  id="postcode"
                  name="postcode"
                  value={formData.postcode}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white"
                  placeholder={currentOrganization?.country_code === 'US' ? '10001' : currentOrganization?.country_code === 'GR' ? '106 82' : 'SW1A 1AA'}
                />
              </div>
            </div>
          </div>

          <div>
            <label htmlFor="propertyType" className="block text-sm font-medium text-gray-700 mb-1">
              Property Type
            </label>
            <select
              id="propertyType"
              name="propertyType"
              value={formData.propertyType}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white"
            >
              <option value="house">House</option>
              <option value="flat">Flat</option>
              <option value="hmo">HMO (House in Multiple Occupation)</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="bedrooms" className="block text-sm font-medium text-gray-700 mb-1">
                Bedrooms
              </label>
              <input
                type="number"
                id="bedrooms"
                name="bedrooms"
                value={formData.bedrooms}
                onChange={handleChange}
                min="0"
                max="10"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white"
              />
            </div>

            <div>
              <label htmlFor="bathrooms" className="block text-sm font-medium text-gray-700 mb-1">
                Bathrooms
              </label>
              <input
                type="number"
                id="bathrooms"
                name="bathrooms"
                value={formData.bathrooms}
                onChange={handleChange}
                min="0"
                max="5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="targetRent" className="block text-sm font-medium text-gray-700 mb-1">
              Target Rent ({currencySymbol}) {formData.propertyType === 'hmo' && <span className="text-gray-400">(calculated from units)</span>}
            </label>
            <input
              type="number"
              id="targetRent"
              name="targetRent"
              value={formData.propertyType === 'hmo' 
                ? formData.units.reduce((sum, unit) => sum + unit.targetRent, 0)
                : formData.targetRent
              }
              onChange={handleChange}
              min="0"
              step="1"
              disabled={formData.propertyType === 'hmo'}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                formData.propertyType === 'hmo' ? 'bg-gray-100 text-gray-500' : 'bg-white text-gray-900'
              }`}
              placeholder="1200"
            />
          </div>

          <div>
            <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Price ({currencySymbol})
            </label>
            <input
              type="number"
              id="purchasePrice"
              name="purchasePrice"
              value={formData.purchasePrice === 0 ? '' : formData.purchasePrice}
              onChange={handleChange}
              min="0"
              step="any"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white"
              placeholder="250000"
            />
          </div>

          {formData.propertyType === 'hmo' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Units/Rooms
              </label>
              <div className="space-y-3">
                {formData.units.map((unit, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Unit {index + 1}</span>
                      <button
                        type="button"
                        onClick={() => removeUnit(index)}
                        className="text-red-600 hover:text-red-800 text-sm"
                      >
                        Remove
                      </button>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      <input
                        type="text"
                        value={unit.name}
                        onChange={(e) => updateUnit(index, 'name', e.target.value)}
                        placeholder="e.g., Bedroom 1, Studio A"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-sm"
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Area (sqm)</label>
                          <input
                            type="number"
                            value={unit.area}
                            onChange={(e) => updateUnit(index, 'area', parseInt(e.target.value) || 0)}
                            placeholder="12"
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-sm"
                          />
                        </div>
                        <div>
                          <label className="block text-xs text-gray-500 mb-1">Target Rent ({currencySymbol})</label>
                          <input
                            type="number"
                            value={unit.targetRent}
                            onChange={(e) => updateUnit(index, 'targetRent', parseInt(e.target.value) || 0)}
                            placeholder="400"
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:bg-white text-sm"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addUnit}
                  className="w-full px-3 py-2 border border-dashed border-blue-300 rounded-md text-sm text-blue-600 hover:border-blue-400 hover:text-blue-800 hover:bg-blue-50"
                >
                  + Add Unit
                </button>
                {formData.units.length > 0 && (
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-sm text-blue-700">
                      <strong>Total Target Rent:</strong> {currencySymbol}{formData.units.reduce((sum, unit) => sum + unit.targetRent, 0)}/month
                      <br />
                      <strong>Total Area:</strong> {formData.units.reduce((sum, unit) => sum + unit.area, 0)} sqm
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

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
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  {propertyToEdit ? 'Saving...' : 'Adding...'}
                </div>
              ) : (
                propertyToEdit ? 'Save Changes' : 'Add Property'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};