import React, { useState, useEffect } from 'react';
import { Tab } from '@headlessui/react';
import { Property, WorkflowInstance } from '../types';
import { supabase } from '../lib/supabase';
import { assetRegisterAI, type AssetRegisterConfig } from '../lib/ai';
import { 
  XMarkIcon,
  BuildingOffice2Icon,
  MapPinIcon,
  CalendarIcon,
  UserIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  HomeIcon,
  MapIcon,
  DocumentTextIcon,
  GlobeAltIcon,
  ScaleIcon,
  SparklesIcon,
  PaperAirplaneIcon,
  PlusIcon,
  EyeSlashIcon,
  CalculatorIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
// import { WorkstreamsTab } from './WorkstreamsTab';
// import { ChatAssistantTab } from './ChatAssistantTab';

interface PropertyPanelProps {
  property: Property | null;
  workflowInstance: WorkflowInstance | null;
  onClose: () => void;
  onWorkflowUpdate: (updates: any) => void;
  onPropertyUpdate: (updatedProperty: Property) => void;
}

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'disposed':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'under_contract':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const getPropertyTypeIcon = (propertyType: string) => {
  switch (propertyType) {
    case 'horizontal_properties':
      return <BuildingOffice2Icon className="w-5 h-5 text-blue-600" />;
    case 'stand_alone_buildings':
      return <HomeIcon className="w-5 h-5 text-green-600" />;
    case 'land':
      return <MapIcon className="w-5 h-5 text-amber-600" />;
    default:
      return <BuildingOffice2Icon className="w-5 h-5 text-gray-600" />;
  }
};

const propertyTypeLabels: Record<string, string> = {
  'horizontal_properties': 'Horizontal Properties',
  'stand_alone_buildings': 'Stand Alone Buildings',
  'land': 'Land',
};

const propertyTypes = [
  { value: 'land', label: 'Land' },
  { value: 'horizontal_properties', label: 'Horizontal Properties' }, 
  { value: 'stand_alone_buildings', label: 'Stand Alone Buildings' },
];

const statusTypes = [
  { value: 'active', label: 'Active' },
  { value: 'disposed', label: 'Disposed' },
  { value: 'under_contract', label: 'Under Contract' },
];

const PropertyField: React.FC<{
  label: string;
  value: string | number | null;
  icon?: React.ReactNode;
  type?: 'text' | 'currency' | 'date' | 'number' | 'select';
  field?: string;
  property?: Property;
  options?: { value: string; label: string }[];
  onUpdate?: (updatedProperty: Property) => void;
  editable?: boolean;
  knownDatabaseFields?: Set<string>;
}> = ({ label, value, icon, type = 'text', field, property, options, onUpdate, editable = false, knownDatabaseFields }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempValue, setTempValue] = useState<any>(value);
  const [saving, setSaving] = useState(false);
  const [saveTimeout, setSaveTimeout] = useState<NodeJS.Timeout | null>(null);

  // Update tempValue when prop value changes (this ensures the UI stays in sync)
  useEffect(() => {
    // Only update if we're not currently editing to avoid overwriting user input
    if (!isEditing) {
      setTempValue(value);
    }
  }, [value, isEditing]);

  const formatValue = () => {
    if (value === null || value === undefined) return '';
    
    switch (type) {
      case 'currency':
        return formatCurrency(Number(value));
      case 'date':
        return formatDate(String(value));
      case 'number':
        return Number(value).toLocaleString();
      case 'select':
        if (options) {
          const option = options.find(opt => opt.value === value);
          return option ? option.label : String(value);
        }
        return String(value);
      default:
        return String(value);
    }
  };

  const saveEdit = async (valueToSave: any) => {
    if (!property || !field || !onUpdate) {
      console.error('Save failed - missing required data:', { property: !!property, field, onUpdate: !!onUpdate });
      return;
    }
    
    console.log('=== SAVE EDIT DEBUG (JSON SYSTEM) ===');
    console.log('Property ID:', property.id);
    console.log('Field:', field);
    console.log('Old Value:', value);
    console.log('New Value:', valueToSave);
    console.log('Value Type:', type);
    
    setSaving(true);
    try {
      // Process the value based on type
      let processedValue = valueToSave;
      if (type === 'number') {
        processedValue = parseInt(valueToSave) || 0;
      } else if (type === 'currency') {
        processedValue = parseFloat(valueToSave) || 0;
      }

      // Check if this is a core field (stored as individual columns)
      const coreFields = ['name', 'address', 'asset_register_id', 'status'];
      
      if (coreFields.includes(field)) {
        // Update core field directly
        const updateData: any = {};
        updateData[field] = processedValue;
        
        console.log('Updating core field:', updateData);
        
        const { data, error } = await supabase
          .from('properties')
          .update(updateData)
          .eq('id', property.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating core field:', error);
          alert(`Failed to save changes: ${error.message}`);
          setTempValue(value);
        } else {
          console.log('Core field save successful!');
          setTempValue(processedValue);
          onUpdate(data);
          setIsEditing(false);
        }
      } else {
        // Update JSON property_data field
        console.log('Updating JSON field in property_data');
        
        // First get current property data
        const { data: currentData, error: fetchError } = await supabase
          .from('properties')
          .select('property_data')
          .eq('id', property.id)
          .single();

        if (fetchError) {
          console.error('Error fetching current property data:', fetchError);
          alert(`Failed to fetch current data: ${fetchError.message}`);
          setTempValue(value);
          setSaving(false);
          return;
        }

        // Merge with existing property_data
        const mergedData = {
          ...(currentData.property_data || {}),
          [field]: processedValue
        };

        console.log('Merged property data:', mergedData);

        const { data, error } = await supabase
          .from('properties')
          .update({ 
            property_data: mergedData,
            updated_at: new Date().toISOString()
          })
          .eq('id', property.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating property data:', error);
          alert(`Failed to save changes: ${error.message}`);
          setTempValue(value);
        } else {
          console.log('JSON field save successful!', data);
          setTempValue(processedValue);
          onUpdate(data);
          setIsEditing(false);
        }
      }
    } catch (error) {
      console.error('Exception during save:', error);
      alert(`Failed to save changes: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setTempValue(value);
    } finally {
      setSaving(false);
    }
  };

  const debouncedSave = (newValue: any) => {
    // Clear existing timeout
    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    // Set new timeout to save after 500ms of no typing
    const timeout = setTimeout(() => {
      if (newValue !== value) {
        saveEdit(newValue);
      }
    }, 500);

    setSaveTimeout(timeout);
  };

  const handleChange = (newValue: any) => {
    setTempValue(newValue);
    debouncedSave(newValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      saveEdit(tempValue);
    } else if (e.key === 'Escape') {
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      setTempValue(value);
      setIsEditing(false);
    }
  };

  if (editable) {
    return (
      <div className="py-3 border-b border-gray-100 last:border-b-0">
        <div className="text-sm font-medium text-gray-700 mb-2">{label}</div>
        {type === 'select' && options ? (
          <select
            value={value || ''}
            onChange={async (e) => {
              if (property && field && onUpdate) {
                setSaving(true);
                
                try {
                  // Check if this is a core field
                  const coreFields = ['name', 'address', 'asset_register_id', 'status'];
                  
                  if (coreFields.includes(field)) {
                    // Update core field directly
                    const updateData: any = {};
                    updateData[field] = e.target.value;
                    
                    const { data, error } = await supabase
                      .from('properties')
                      .update(updateData)
                      .eq('id', property.id)
                      .select()
                      .single();
                      
                    if (!error) {
                      onUpdate(data);
                    } else {
                      console.error('Error updating core field:', error);
                      alert('Failed to save changes');
                    }
                  } else {
                    // Update JSON property_data field
                    const { data: currentData, error: fetchError } = await supabase
                      .from('properties')
                      .select('property_data')
                      .eq('id', property.id)
                      .single();

                    if (fetchError) {
                      console.error('Error fetching current property data:', fetchError);
                      alert('Failed to fetch current data');
                      setSaving(false);
                      return;
                    }

                    const mergedData = {
                      ...(currentData.property_data || {}),
                      [field]: e.target.value
                    };

                    const { data, error } = await supabase
                      .from('properties')
                      .update({ 
                        property_data: mergedData,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', property.id)
                      .select()
                      .single();
                      
                    if (!error) {
                      onUpdate(data);
                    } else {
                      console.error('Error updating property data:', error);
                      alert('Failed to save changes');
                    }
                  }
                } catch (error) {
                  console.error('Exception during select save:', error);
                  alert('Failed to save changes');
                }
                
                setSaving(false);
              }
            }}
            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          >
            {options.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        ) : (
          <input
            type={type === 'currency' || type === 'number' ? 'number' : type === 'date' ? 'date' : 'text'}
            value={tempValue || ''}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={() => setIsEditing(true)}
            onBlur={() => setIsEditing(false)}
            onKeyDown={handleKeyDown}
            placeholder={`Enter ${label.toLowerCase()}...`}
            className="w-full text-sm border border-gray-300 rounded-md px-3 py-2 bg-white hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
          />
        )}
        {saving && (
          <div className="text-xs text-gray-500 mt-1">Saving...</div>
        )}
      </div>
    );
  }

  // Non-editable field
  return (
    <div className="py-3 border-b border-gray-100 last:border-b-0">
      <div className="text-sm font-medium text-gray-700 mb-2">{label}</div>
      <div className="text-sm text-gray-900 py-2">
        {formatValue() || '-'}
      </div>
    </div>
  );
};

export const PropertyPanel: React.FC<PropertyPanelProps> = ({
  property,
  workflowInstance,
  onClose,
  onWorkflowUpdate,
  onPropertyUpdate,
}) => {
  // Add keyboard handler to close modal on Escape
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);
  const [selectedTab, setSelectedTab] = useState(0);
  const [assetConfig, setAssetConfig] = useState(assetRegisterAI.getConfig());

  // Load AI config from Supabase on component mount
  useEffect(() => {
    const loadConfig = async () => {
      try {
        // Ensure config is loaded from Supabase
        await assetRegisterAI.ensureConfigLoaded();
        const newConfig = assetRegisterAI.getConfig();
        console.log('=== AI CONFIG DEBUG ===');
        console.log('Loaded config sections:', Object.keys(newConfig.sections));
        console.log('Basic section fields:', newConfig.sections.basic?.fields?.map(f => f.label));
        console.log('Location section exists:', !!newConfig.sections.location);
        console.log('Property details section exists:', !!newConfig.sections.property_details);
        setAssetConfig(newConfig);
      } catch (error) {
        console.error('Failed to load AI config:', error);
        // Use default config if loading fails
        setAssetConfig(assetRegisterAI.getConfig());
      }
    };
    loadConfig();
  }, []);
  const [aiMessages, setAiMessages] = useState<Array<{
    id: string;
    type: 'user' | 'assistant';
    content: string;
    timestamp: Date;
  }>>([
    {
      id: '1',
      type: 'assistant',
      content: `Hi! I'm your Asset Register AI assistant. I can help you modify the property fields for this specific property:

• Add new fields (e.g., "Add construction year field")
• Hide or show existing fields (e.g., "Hide the PID field") 
• Create calculated fields (e.g., "Calculate property yield")

What would you like to do with the property fields?`,
      timestamp: new Date()
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [aiProcessing, setAiProcessing] = useState(false);

  // Define known database fields that are safe to save
  const knownDatabaseFields = new Set([
    'id', 'asset_register_id', 'name', 'address', 'property_type', 'property_sub_type',
    'units', 'square_feet', 'land_area', 'current_value', 'acquisition_price',
    'acquisition_date', 'status', 'created_at', 'updated_at'
    // Add other actual database columns here
  ]);

  const handleAiMessage = async () => {
    if (!aiInput.trim() || aiProcessing) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user' as const,
      content: aiInput.trim(),
      timestamp: new Date()
    };

    setAiMessages(prev => [...prev, userMessage]);
    setAiInput('');
    setAiProcessing(true);

    try {
      console.log('=== AI REQUEST DEBUG ===');
      console.log('User input:', aiInput.trim());
      
      const result = await assetRegisterAI.processUserRequest(aiInput.trim());
      
      console.log('AI Result:', result);
      console.log('Success:', result.success);
      console.log('Changes:', result.changes);
      console.log('Error:', result.error);
      
      let responseContent = '';
      if (result.success) {
        // Update local config state to reflect changes
        const newConfig = assetRegisterAI.getConfig();
        console.log('Updated config sections:', Object.keys(newConfig.sections));
        console.log('Total fields in all sections:', Object.values(newConfig.sections).reduce((acc, section) => acc + section.fields.length, 0));
        setAssetConfig(newConfig);
        
        responseContent = `Great! I've updated your Asset Register configuration. Here's what I changed:

${result.changes?.map(change => `• ${change}`).join('\n') || 'Configuration updated successfully.'}

The changes are now active in this property panel.`;
      } else {
        responseContent = `I'm sorry, I could not process that request. ${result.error || 'Please try rephrasing your request or be more specific about what you would like to change.'}`;
      }

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant' as const,
        content: responseContent,
        timestamp: new Date()
      };
      
      setAiMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant' as const,
        content: 'I encountered an error while processing your request. Please try again.',
        timestamp: new Date()
      };
      
      setAiMessages(prev => [...prev, errorMessage]);
    } finally {
      setAiProcessing(false);
    }
  };

  const handleAiKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleAiMessage();
    }
  };

  // Helper function to render fields dynamically based on configuration
  const renderDynamicFields = (sectionId: string) => {
    const section = assetConfig.sections[sectionId];
    if (!section || !section.visible) return null;

    const visibleFields = section.fields.filter(field => field.visible);
    if (visibleFields.length === 0) return null;

    return (
      <div className="bg-white border border-gray-200 rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-base font-semibold text-gray-900">{section.label}</h3>
        </div>
        <div className="p-6">
          <div className={`grid grid-cols-${section.columns} gap-x-6 gap-y-4`}>
            {visibleFields.map((fieldConfig) => {
              // Get field value from property object (new JSON system)
              const getFieldValue = () => {
                if (!property) return '';
                
                // Check core fields first (stored as individual columns)
                const coreFields = ['name', 'address', 'asset_register_id', 'status'];
                if (coreFields.includes(fieldConfig.field)) {
                  return property[fieldConfig.field as keyof typeof property] || '';
                }
                
                // Check property_data JSON for all other fields
                const propertyData = (property as any).property_data || {};
                const value = propertyData[fieldConfig.field];
                
                // If field exists in JSON data, return it
                if (value !== undefined && value !== null) {
                  return value;
                }
                
                // If field doesn't exist, return appropriate default based on type
                switch (fieldConfig.type) {
                  case 'number':
                  case 'currency':
                    return 0;
                  case 'boolean':
                    return false;
                  case 'select':
                    return fieldConfig.options?.[0]?.value || '';
                  default:
                    return '';
                }
              };

              // Handle field updates - all fields now save to database (JSON system)
              const handleFieldUpdate = (updatedProperty: Property) => {
                console.log(`Field ${fieldConfig.field} updated:`, updatedProperty);
                onPropertyUpdate(updatedProperty);
              };

              return (
                <PropertyField
                  key={fieldConfig.id}
                  label={fieldConfig.label}
                  value={getFieldValue()}
                  type={fieldConfig.type as any}
                  field={fieldConfig.field}
                  property={property!}
                  options={fieldConfig.options}
                  onUpdate={handleFieldUpdate}
                  editable={fieldConfig.editable}
                  knownDatabaseFields={knownDatabaseFields}
                />
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  if (!property) {
    return null;
  }

  // Calculate metrics using JSON property_data
  const propertyData = (property as any).property_data || {};
  const currentValue = propertyData.current_value || 0;
  const acquisitionPrice = propertyData.acquisition_price || 0;
  const squareFeet = propertyData.square_feet || 0;
  const acquisitionDate = propertyData.acquisition_date;
  
  const appreciation = acquisitionPrice && currentValue 
    ? currentValue - acquisitionPrice 
    : null;
  
  const appreciationPercent = acquisitionPrice && currentValue && acquisitionPrice > 0
    ? ((currentValue - acquisitionPrice) / acquisitionPrice) * 100
    : null;

  const pricePerSqFt = currentValue && squareFeet && squareFeet > 0
    ? currentValue / squareFeet
    : null;

  const acquisitionYears = acquisitionDate 
    ? (new Date().getTime() - new Date(acquisitionDate).getTime()) / (1000 * 60 * 60 * 24 * 365)
    : null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="absolute inset-0 flex justify-end" onClick={onClose}>
        <div 
          className="w-1/3 min-w-96 h-full bg-white shadow-xl flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
      {/* Header */}
      <div className="p-6 border-b border-gray-200 bg-white">
        <div className="flex items-start justify-between">
          <div className="flex-1 mr-4">
            <div className="flex items-center space-x-3 mb-2">
              <span className="font-mono text-sm font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                {property.asset_register_id}
              </span>
              {getPropertyTypeIcon(propertyData.property_type || '')}
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(property.status)}`}>
                {property.status}
              </span>
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-1">{property.name}</h2>
            <p className="text-gray-600 mb-2">{property.address}</p>
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              <span>{propertyTypeLabels[propertyData.property_type] || propertyData.property_type || 'Unknown'}</span>
              {propertyData.property_sub_type && (
                <>
                  <span>•</span>
                  <span className="capitalize">{propertyData.property_sub_type}</span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <Tab.Group selectedIndex={selectedTab} onChange={setSelectedTab}>
        <Tab.List className="flex border-b border-gray-200 bg-gray-50">
          <Tab className={({ selected }) =>
            `flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              selected
                ? 'border-blue-500 text-blue-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-white'
            }`
          }>
            Property Details
          </Tab>
          <Tab className={({ selected }) =>
            `flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              selected
                ? 'border-blue-500 text-blue-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-white'
            }`
          }>
            Workstreams
          </Tab>
          <Tab className={({ selected }) =>
            `flex-1 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
              selected
                ? 'border-blue-500 text-blue-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-white'
            }`
          }>
            AI Assistant
          </Tab>
        </Tab.List>

        <Tab.Panels className="flex-1 overflow-hidden">
          {/* Property Details Tab */}
          <Tab.Panel className="h-full overflow-y-auto bg-white" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            <div className="p-6 space-y-6">
              
              {/* All sections now use dynamic AI configuration */}
              {renderDynamicFields('basic')}
              {renderDynamicFields('location')}
              {renderDynamicFields('property_details')}
              {renderDynamicFields('financial')}
              {renderDynamicFields('client')}
              {renderDynamicFields('ownership')}

              {/* Calculated Fields Section */}
              {(pricePerSqFt || appreciation !== null || appreciationPercent !== null) && (
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-base font-semibold text-gray-900">Calculated Metrics</h3>
                  </div>
                  <div className="p-6">
                    <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                      {pricePerSqFt && (
                        <PropertyField
                          label="Price per m²"
                          value={pricePerSqFt}
                          type="currency"
                        />
                      )}
                      {appreciation !== null && (
                        <PropertyField
                          label="Total Appreciation"
                          value={appreciation}
                          type="currency"
                        />
                      )}
                      {appreciationPercent !== null && (
                        <PropertyField
                          label="Appreciation %"
                          value={`${appreciationPercent > 0 ? '+' : ''}${appreciationPercent.toFixed(1)}%`}
                        />
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Asset Description */}
              <div className="bg-white border border-gray-200 rounded-lg">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                  <h3 className="text-base font-semibold text-gray-900">Asset Description</h3>
                </div>
                <div className="p-6">
                  <div className="text-sm text-gray-900 leading-relaxed">
                    Mezzanine apartment 68.4 m², AKROTIRIOU 36 - PATRA. This property represents a well-positioned residential unit in the city center with good access to local amenities and transportation.
                  </div>
                </div>
              </div>

              {/* Active Workflow */}
              {workflowInstance && (
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-base font-semibold text-gray-900">Active Workflow</h3>
                  </div>
                  <div className="p-6 space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-900">
                        {workflowInstance.name}
                      </span>
                      <span className="text-sm text-gray-500">
                        {workflowInstance.completion_percentage}% complete
                      </span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${workflowInstance.completion_percentage}%` }}
                      ></div>
                    </div>
                    <div className="text-sm text-gray-600 capitalize">
                      Status: {workflowInstance.status?.replace('_', ' ')}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Tab.Panel>

          {/* Workstreams Tab */}
          <Tab.Panel className="h-full overflow-y-auto" style={{ maxHeight: 'calc(100vh - 200px)' }}>
            <div className="p-6">
              <p className="text-gray-500">Workstreams functionality coming soon...</p>
            </div>
          </Tab.Panel>

          {/* AI Assistant Tab */}
          <Tab.Panel className="h-full flex flex-col" style={{ height: 'calc(100vh - 200px)' }}>
            {/* AI Chat Header */}
            <div className="flex-shrink-0 border-b border-gray-200 p-4 bg-gray-50">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center">
                  <SparklesIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-gray-900">Asset Register AI</h3>
                  <p className="text-xs text-gray-500">Configure property fields</p>
                </div>
              </div>
            </div>

            {/* AI Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
              {aiMessages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-md ${message.type === 'user' ? 'order-2' : ''}`}>
                    <div className={`flex items-start space-x-2 ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <div className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${
                        message.type === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-purple-600 text-white'
                      }`}>
                        {message.type === 'user' ? (
                          <span className="text-xs font-medium">U</span>
                        ) : (
                          <SparklesIcon className="w-3 h-3" />
                        )}
                      </div>
                      
                      <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
                        <div className={`inline-block p-3 rounded-lg text-sm ${
                          message.type === 'user' 
                            ? 'bg-blue-600 text-white' 
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <div className="whitespace-pre-wrap">{message.content}</div>
                        </div>
                        <div className={`text-xs text-gray-500 mt-1 ${message.type === 'user' ? 'text-right' : ''}`}>
                          {message.timestamp.toLocaleTimeString()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {aiProcessing && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center">
                      <SparklesIcon className="w-3 h-3" />
                    </div>
                    <div className="bg-gray-100 text-gray-900 p-3 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                          <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                        </div>
                        <span className="text-xs text-gray-600">Processing...</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* AI Input */}
            <div className="flex-shrink-0 border-t border-gray-200 p-4">
              <div className="flex space-x-2">
                <div className="flex-1">
                  <textarea
                    value={aiInput}
                    onChange={(e) => setAiInput(e.target.value)}
                    onKeyPress={handleAiKeyPress}
                    placeholder="Ask me to modify property fields... (e.g., 'Add swimming pool field')"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                    rows={2}
                    disabled={aiProcessing}
                  />
                </div>
                <button
                  onClick={handleAiMessage}
                  disabled={!aiInput.trim() || aiProcessing}
                  className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                >
                  <PaperAirplaneIcon className="w-4 h-4" />
                </button>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Press Enter to send • Modify property fields only
              </div>
            </div>
          </Tab.Panel>
        </Tab.Panels>
      </Tab.Group>
        </div>
      </div>
    </div>
  );
}; 