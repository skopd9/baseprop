import React from 'react';
import { WorkstreamDataTable } from './WorkstreamDataTable';
import { Workstream } from '../types';
import { valuationStatusService } from '../services/ValuationStatusService';

interface PropertyDetailsTableProps {
  workstream: Workstream;
  isEditable?: boolean;
  onDataChange?: (updatedWorkstream: Workstream) => void;
}

export const PropertyDetailsTable: React.FC<PropertyDetailsTableProps> = ({
  workstream,
  isEditable = true,
  onDataChange
}) => {
  const handleDataUpdate = async (fieldId: string, value: any) => {
    // Update the workstream form data
    const updatedFormData = {
      ...workstream.form_data,
      [fieldId]: value
    };

    // Create updated workstream
    const updatedWorkstream: Workstream = {
      ...workstream,
      form_data: updatedFormData,
      updated_at: new Date().toISOString()
    };

    // Notify parent component
    if (onDataChange) {
      onDataChange(updatedWorkstream);
    }

    // Update in database
    try {
      await valuationStatusService.updateWorkstreamStatus(
        workstream.id,
        workstream.status,
        updatedFormData
      );
    } catch (error) {
      console.error('Error updating property details:', error);
    }
  };

  const handleSave = async () => {
    // Check if all required fields are completed
    const requiredFields = workstream.fields?.filter(f => f.required) || [];
    const completedRequiredFields = requiredFields.filter(field => {
      const value = workstream.form_data?.[field.id];
      return value && value !== '';
    });

    // Update workstream status based on completion
    let newStatus = workstream.status;
    if (completedRequiredFields.length === requiredFields.length && requiredFields.length > 0) {
      newStatus = 'completed';
    } else if (completedRequiredFields.length > 0) {
      newStatus = 'in_progress';
    }

    try {
      await valuationStatusService.updateWorkstreamStatus(
        workstream.id,
        newStatus,
        workstream.form_data
      );

      // Update local state
      if (onDataChange) {
        onDataChange({
          ...workstream,
          status: newStatus as any,
          updated_at: new Date().toISOString(),
          ...(newStatus === 'completed' && { completed_at: new Date().toISOString() })
        });
      }
    } catch (error) {
      console.error('Error saving property details:', error);
      throw error;
    }
  };

  return (
    <div className="space-y-4">
      {/* Property Details Header */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h2 className="text-lg font-semibold text-blue-900 mb-2">Property Details</h2>
        <p className="text-sm text-blue-700">
          Basic property information and identification details. This information is used throughout 
          the valuation process and should be accurate and complete.
        </p>
        
        {/* Progress Indicator */}
        <div className="mt-3">
          <div className="flex items-center justify-between text-sm text-blue-700 mb-1">
            <span>Completion Progress</span>
            <span>
              {workstream.fields?.filter(f => workstream.form_data?.[f.id]).length || 0} of {workstream.fields?.length || 0} fields
            </span>
          </div>
          <div className="w-full bg-blue-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ 
                width: `${workstream.fields?.length ? 
                  Math.round(((workstream.fields.filter(f => workstream.form_data?.[f.id]).length) / workstream.fields.length) * 100) : 0}%` 
              }}
            />
          </div>
        </div>
      </div>

      {/* Property Details Table */}
      <WorkstreamDataTable
        workstream={workstream}
        isEditable={isEditable}
        onDataUpdate={handleDataUpdate}
        onSave={handleSave}
      />

      {/* Field Descriptions */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Field Descriptions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <strong>Asset ID:</strong> Unique identifier for the property in your asset management system.
          </div>
          <div>
            <strong>Valuation ID:</strong> Specific identifier for this valuation assignment.
          </div>
          <div>
            <strong>Property Name:</strong> Common name or address reference for the property.
          </div>
          <div>
            <strong>Property Type:</strong> Primary classification (Residential, Commercial, Industrial, Mixed Use).
          </div>
          <div>
            <strong>Property Subtype:</strong> More specific classification (Apartment, Office, Retail, etc.).
          </div>
        </div>
      </div>

      {/* Validation Summary */}
      {workstream.fields && workstream.fields.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">Validation Summary</h3>
          <div className="space-y-2">
            {workstream.fields.map(field => {
              const hasValue = workstream.form_data?.[field.id];
              const isRequired = field.required;
              
              return (
                <div key={field.id} className="flex items-center justify-between text-sm">
                  <span className={`${isRequired ? 'font-medium' : ''}`}>
                    {field.label}
                    {isRequired && <span className="text-red-500 ml-1">*</span>}
                  </span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    hasValue 
                      ? 'bg-green-100 text-green-800' 
                      : isRequired 
                        ? 'bg-red-100 text-red-800' 
                        : 'bg-gray-100 text-gray-600'
                  }`}>
                    {hasValue ? 'Complete' : isRequired ? 'Required' : 'Optional'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};