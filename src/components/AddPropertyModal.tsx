import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { Property } from '../types';

interface AddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPropertyAdded: (property: Property) => void;
}

export const AddPropertyModal: React.FC<AddPropertyModalProps> = ({
  isOpen,
  onClose,
  onPropertyAdded,
}) => {
  const [formData, setFormData] = useState({
    asset_register_id: '',
    name: '',
    address: '',
    property_type: 'commercial',
    square_feet: '',
    units: '',
    current_value: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Validate required fields
      if (!formData.asset_register_id || !formData.name || !formData.address) {
        throw new Error('Asset Register ID, Name, and Address are required');
      }

      // Prepare property data
      const propertyData = {
        property_type: formData.property_type,
        square_feet: formData.square_feet ? parseInt(formData.square_feet) : null,
        units: formData.units ? parseInt(formData.units) : null,
        current_value: formData.current_value ? parseFloat(formData.current_value) : null,
      };

      // Insert into database
      const { data, error: insertError } = await supabase
        .from('properties')
        .insert({
          asset_register_id: formData.asset_register_id,
          name: formData.name,
          address: formData.address,
          status: 'active',
          property_data: propertyData,
        })
        .select()
        .single();

      if (insertError) {
        throw insertError;
      }

      // Call the callback with the new property
      onPropertyAdded(data);
      
      // Reset form and close modal
      setFormData({
        asset_register_id: '',
        name: '',
        address: '',
        property_type: 'commercial',
        square_feet: '',
        units: '',
        current_value: '',
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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900">Add New Property</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="asset_register_id" className="block text-sm font-medium text-gray-700">
                Asset Register ID *
              </label>
              <input
                type="text"
                id="asset_register_id"
                name="asset_register_id"
                value={formData.asset_register_id}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 006"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                Property Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Ocean View Plaza"
              />
            </div>

            <div>
              <label htmlFor="address" className="block text-sm font-medium text-gray-700">
                Address *
              </label>
              <input
                type="text"
                id="address"
                name="address"
                value={formData.address}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 123 Main St, City, State 12345"
              />
            </div>

            <div>
              <label htmlFor="property_type" className="block text-sm font-medium text-gray-700">
                Property Type
              </label>
              <select
                id="property_type"
                name="property_type"
                value={formData.property_type}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="commercial">Commercial</option>
                <option value="residential">Residential</option>
                <option value="industrial">Industrial</option>
                <option value="land">Land</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="square_feet" className="block text-sm font-medium text-gray-700">
                  Square Feet
                </label>
                <input
                  type="number"
                  id="square_feet"
                  name="square_feet"
                  value={formData.square_feet}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="25000"
                />
              </div>

              <div>
                <label htmlFor="units" className="block text-sm font-medium text-gray-700">
                  Units
                </label>
                <input
                  type="number"
                  id="units"
                  name="units"
                  value={formData.units}
                  onChange={handleChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="15"
                />
              </div>
            </div>

            <div>
              <label htmlFor="current_value" className="block text-sm font-medium text-gray-700">
                Current Value ($)
              </label>
              <input
                type="number"
                id="current_value"
                name="current_value"
                value={formData.current_value}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="1500000"
              />
            </div>

            <div className="flex justify-end space-x-3 pt-4">
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
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSubmitting ? 'Adding...' : 'Add Property'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};