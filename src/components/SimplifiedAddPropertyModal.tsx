import React, { useState } from 'react';
import { XMarkIcon, HomeIcon, CheckIcon, Squares2X2Icon, SparklesIcon, CurrencyPoundIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import { SimplifiedProperty } from '../utils/simplifiedDataTransforms';
import { supabase } from '../lib/supabase';
import { useOrganization } from '../contexts/OrganizationContext';
import { useCurrency } from '../hooks/useCurrency';
import type { CountryCode } from '../types/organizationTypes';

interface SimplifiedAddPropertyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPropertyAdded: (property: SimplifiedProperty) => void;
  propertyToEdit?: SimplifiedProperty; // Optional property to edit
}

interface PropertyDocumentType {
  id: string;
  name: string;
  description: string;
  required?: boolean;
}

interface DocumentChecklistItem {
  documentTypeId: string;
  checked: boolean;
  notes?: string;
  fileName?: string;
  fileSize?: number;
  fileType?: string;
  fileData?: string; // Base64 encoded file data
  uploadedAt?: Date;
}

// Define wizard steps
const wizardSteps = [
  { key: 'address', title: 'Address', icon: HomeIcon, required: true },
  { key: 'specs', title: 'Specs', icon: Squares2X2Icon, required: true },
  { key: 'features', title: 'Features', icon: SparklesIcon, required: false },
  { key: 'financial', title: 'Financial', icon: CurrencyPoundIcon, required: false },
  { key: 'documents', title: 'Documents', icon: DocumentTextIcon, required: false }
];

const UK_PROPERTY_DOCUMENTS: PropertyDocumentType[] = [
  { id: 'title_deeds', name: 'Title Deeds', description: 'Legal ownership documentation', required: false },
  { id: 'property_survey', name: 'Property Survey/Valuation', description: 'Professional property survey report', required: false },
  { id: 'building_insurance', name: 'Building Insurance Policy', description: 'Current building insurance certificate', required: false },
  { id: 'purchase_documents', name: 'Purchase Documents', description: 'Property purchase contracts and completion documents', required: false },
  { id: 'mortgage_documents', name: 'Mortgage Documents', description: 'Mortgage agreement and statements', required: false },
  { id: 'property_tax', name: 'Property Tax Documents', description: 'Council tax, stamp duty, and other tax records', required: false },
  { id: 'epc', name: 'EPC Certificate', description: 'Energy Performance Certificate', required: false },
  { id: 'gas_safety', name: 'Gas Safety Certificate', description: 'Annual gas safety inspection', required: false },
  { id: 'eicr', name: 'EICR Certificate', description: 'Electrical Installation Condition Report', required: false },
  { id: 'other', name: 'Other Documents', description: 'Any other relevant property documents', required: false }
];

const GREECE_PROPERTY_DOCUMENTS: PropertyDocumentType[] = [
  { id: 'title_deeds', name: 'Title Deeds (Τίτλος Ιδιοκτησίας)', description: 'Legal ownership documentation', required: false },
  { id: 'building_permit', name: 'Building Permit (Οικοδομική Άδεια)', description: 'Valid building permit', required: false },
  { id: 'property_tax_greece', name: 'ENFIA Tax Documents', description: 'Property tax documentation', required: false },
  { id: 'cadastral', name: 'Cadastral Registry', description: 'Land registry documentation', required: false },
  { id: 'topographic', name: 'Topographic Diagram', description: 'Official topographic diagram', required: false },
  { id: 'other', name: 'Other Documents', description: 'Any other relevant property documents', required: false }
];

const USA_PROPERTY_DOCUMENTS: PropertyDocumentType[] = [
  { id: 'deed', name: 'Property Deed', description: 'Legal ownership documentation', required: false },
  { id: 'title_insurance', name: 'Title Insurance', description: 'Title insurance policy', required: false },
  { id: 'home_inspection', name: 'Home Inspection Report', description: 'Professional inspection report', required: false },
  { id: 'homeowners_insurance', name: 'Homeowners Insurance', description: 'Property insurance policy', required: false },
  { id: 'property_tax_us', name: 'Property Tax Records', description: 'Property tax assessments and receipts', required: false },
  { id: 'hoa_documents', name: 'HOA Documents', description: 'Homeowners association documentation (if applicable)', required: false },
  { id: 'permits', name: 'Building Permits', description: 'Permits for renovations or improvements', required: false },
  { id: 'other', name: 'Other Documents', description: 'Any other relevant property documents', required: false }
];

function getPropertyDocumentTypes(countryCode: CountryCode): PropertyDocumentType[] {
  switch (countryCode) {
    case 'UK':
      return UK_PROPERTY_DOCUMENTS;
    case 'GR':
      return GREECE_PROPERTY_DOCUMENTS;
    case 'US':
      return USA_PROPERTY_DOCUMENTS;
    default:
      return UK_PROPERTY_DOCUMENTS;
  }
}

export const SimplifiedAddPropertyModal: React.FC<SimplifiedAddPropertyModalProps> = ({
  isOpen,
  onClose,
  onPropertyAdded,
  propertyToEdit,
}) => {
  const { currentOrganization } = useOrganization();
  const { currencySymbol } = useCurrency();
  const [currentWizardStep, setCurrentWizardStep] = useState(0);
  
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
    furnished: 'unfurnished' as 'unfurnished' | 'part_furnished' | 'furnished',
    parking: 'none' as 'none' | 'street' | 'driveway' | 'garage',
    garden: false,
  });
  const [documentChecklist, setDocumentChecklist] = useState<DocumentChecklistItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get document types based on organization country
  const documentTypes = React.useMemo(() => {
    return getPropertyDocumentTypes((currentOrganization?.country_code as CountryCode) || 'UK');
  }, [currentOrganization?.country_code]);

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
        furnished: (propertyToEdit as any).furnished || 'unfurnished',
        parking: (propertyToEdit as any).parking || 'none',
        garden: (propertyToEdit as any).garden || false,
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
        furnished: 'unfurnished',
        parking: 'none',
        garden: false,
      });
    }
  }, [isOpen, propertyToEdit]);

  // Reset wizard when modal opens/closes
  React.useEffect(() => {
    if (isOpen) {
      setCurrentWizardStep(0);
      setError(null);
      setDocumentChecklist([]);
    }
  }, [isOpen]);

  const toggleDocument = (documentId: string) => {
    setDocumentChecklist(prev => {
      const existing = prev.find(doc => doc.documentTypeId === documentId);
      if (existing) {
        return prev.map(doc => 
          doc.documentTypeId === documentId 
            ? { ...doc, checked: !doc.checked }
            : doc
        );
      } else {
        return [...prev, { documentTypeId: documentId, checked: true }];
      }
    });
  };

  const updateDocumentNotes = (documentId: string, notes: string) => {
    setDocumentChecklist(prev => {
      const existing = prev.find(doc => doc.documentTypeId === documentId);
      if (existing) {
        return prev.map(doc => 
          doc.documentTypeId === documentId 
            ? { ...doc, notes }
            : doc
        );
      } else {
        return [...prev, { documentTypeId: documentId, checked: false, notes }];
      }
    });
  };

  const isDocumentChecked = (documentId: string) => {
    return documentChecklist.some(doc => doc.documentTypeId === documentId && doc.checked);
  };

  const getDocumentNotes = (documentId: string) => {
    return documentChecklist.find(doc => doc.documentTypeId === documentId)?.notes || '';
  };

  const handleFileUpload = (documentId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    // Read the file and store as base64
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileData = e.target?.result as string;
      
      setDocumentChecklist(prev => {
        const existing = prev.find(doc => doc.documentTypeId === documentId);
        if (existing) {
          return prev.map(doc => 
            doc.documentTypeId === documentId 
              ? { 
                  ...doc, 
                  checked: true,
                  fileName: file.name,
                  fileSize: file.size,
                  fileType: file.type,
                  fileData: fileData,
                  uploadedAt: new Date()
                }
              : doc
          );
        } else {
          return [...prev, { 
            documentTypeId: documentId, 
            checked: true,
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            fileData: fileData,
            uploadedAt: new Date()
          }];
        }
      });
    };

    reader.readAsDataURL(file);
    
    // Clear the file input
    event.target.value = '';
  };

  const removeDocument = (documentId: string) => {
    setDocumentChecklist(prev => 
      prev.map(doc => 
        doc.documentTypeId === documentId 
          ? { documentTypeId: documentId, checked: false, notes: doc.notes || '' }
          : doc
      )
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const getUploadedFile = (documentId: string) => {
    return documentChecklist.find(doc => doc.documentTypeId === documentId && doc.fileName);
  };

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
        // Property features
        furnished: formData.furnished,
        parking: formData.parking,
        garden: formData.garden,
        // Document checklist
        document_checklist: documentChecklist.length > 0 ? documentChecklist : null,
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
        furnished: formData.furnished,
        parking: formData.parking,
        garden: formData.garden,
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
        furnished: 'unfurnished',
        parking: 'none',
        garden: false,
      });
      setDocumentChecklist([]);
      setCurrentWizardStep(0);
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

  const canProceedToNextStep = () => {
    switch (currentWizardStep) {
      case 0: // Address
        return formData.addressLine1.trim() && formData.city.trim() && formData.postcode.trim();
      case 1: // Specs
        return formData.bedrooms >= 0 && formData.bathrooms >= 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentWizardStep < wizardSteps.length - 1 && canProceedToNextStep()) {
      console.log('Moving to step:', currentWizardStep + 1, '/', wizardSteps.length - 1);
      setCurrentWizardStep(currentWizardStep + 1);
      setError(null);
    } else {
      console.log('Cannot proceed:', { currentWizardStep, maxStep: wizardSteps.length - 1, canProceed: canProceedToNextStep() });
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
        className="relative top-10 mx-auto border w-full max-w-2xl shadow-lg rounded-lg bg-white mb-10"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
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
        </div>

        {/* Tab Navigation */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center space-x-8">
            {wizardSteps.map((step, index) => {
              const isActive = index === currentWizardStep;
              const isCompleted = propertyToEdit ? false : index < currentWizardStep; // No completed state in edit mode
              const StepIcon = step.icon;
              const isDisabled = !propertyToEdit && index > currentWizardStep; // Only disable in wizard mode

              return (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => setCurrentWizardStep(index)}
                  disabled={isDisabled}
                  className={`flex items-center space-x-2 pb-2 border-b-2 transition-colors ${
                    isActive 
                      ? 'border-blue-600 text-blue-600' 
                      : isCompleted
                        ? 'border-green-500 text-green-600 hover:text-green-700'
                        : 'border-transparent text-gray-400 hover:text-gray-600'
                  } ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <StepIcon className="w-5 h-5" />
                  <span className="text-sm font-medium">{step.title}</span>
                </button>
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
        <div className="p-6">
          <form 
            onSubmit={(e) => {
              // ALWAYS prevent default form submission
              e.preventDefault();
              console.log('Form submit prevented - step:', currentWizardStep);
            }}
            onKeyDown={(e) => {
              // ALWAYS prevent Enter key from submitting the form
              if (e.key === 'Enter') {
                e.preventDefault();
                // Navigate to next step if possible and not on last step
                if (currentWizardStep < wizardSteps.length - 1 && canProceedToNextStep()) {
                  handleNext();
                }
              }
            }}
          >
          <div className="min-h-[400px]">
            {/* Step 1: Address */}
            {currentWizardStep === 0 && (
          <div className="space-y-4">
            <div className="mb-4">
              <h4 className="text-base font-semibold text-gray-900 mb-2">Property Address</h4>
              <p className="text-sm text-gray-600">Enter the property location details</p>
            </div>
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
          </div>
            )}

            {/* Step 2: Specs */}
            {currentWizardStep === 1 && (
          <div className="space-y-4">
            <div className="mb-4">
              <h4 className="text-base font-semibold text-gray-900 mb-2">Property Specifications</h4>
              <p className="text-sm text-gray-600">Define the property type and basic features</p>
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
          </div>
            )}

            {/* Step 3: Features */}
            {currentWizardStep === 2 && (
          <div className="space-y-4">
            <div className="mb-4">
              <h4 className="text-base font-semibold text-gray-900 mb-2">Property Features</h4>
              <p className="text-sm text-gray-600">Optional: Add additional property features</p>
            </div>

            {/* Furnished Status & Parking */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="furnished" className="block text-sm font-medium text-gray-700 mb-1">
                  Furnished Status
                </label>
                <select
                  id="furnished"
                  name="furnished"
                  value={formData.furnished}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="unfurnished">Unfurnished</option>
                  <option value="part_furnished">Part Furnished</option>
                  <option value="furnished">Fully Furnished</option>
                </select>
              </div>

              <div>
                <label htmlFor="parking" className="block text-sm font-medium text-gray-700 mb-1">
                  Parking
                </label>
                <select
                  id="parking"
                  name="parking"
                  value={formData.parking}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="none">No Parking</option>
                  <option value="street">Street Parking</option>
                  <option value="driveway">Driveway</option>
                  <option value="garage">Garage</option>
                </select>
              </div>
            </div>

            {/* Garden Checkbox */}
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
              <label className="flex items-center space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  id="garden"
                  name="garden"
                  checked={formData.garden}
                  onChange={(e) => setFormData(prev => ({ ...prev, garden: e.target.checked }))}
                  className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                />
                <div>
                  <span className="text-sm font-medium text-gray-900">Property has a garden</span>
                  <p className="text-xs text-gray-500">Check if this property includes garden space</p>
                </div>
              </label>
            </div>
          </div>
            )}

            {/* Step 4: Financial */}
            {currentWizardStep === 3 && (
          <div className="space-y-4">
            <div className="mb-4">
              <h4 className="text-base font-semibold text-gray-900 mb-2">Financial Information</h4>
              <p className="text-sm text-gray-600">Enter rent and purchase information</p>
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
          </div>
            )}

            {/* Step 5: Documents */}
            {currentWizardStep === 4 && (
          <div className="space-y-4">
            <div className="mb-4">
              <h4 className="text-base font-semibold text-gray-900 mb-2">Property Documents Checklist</h4>
              <p className="text-sm text-gray-600">Track which documents you have for this property</p>
            </div>

            {/* Document Checklist with Upload */}
            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
              {documentTypes.map((docType) => {
                const uploadedFile = getUploadedFile(docType.id);
                
                return (
                  <div 
                    key={docType.id} 
                    className={`border rounded-lg p-4 transition-colors ${
                      uploadedFile
                        ? 'border-green-300 bg-green-50' 
                        : isDocumentChecked(docType.id)
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start space-x-3">
                      <input
                        type="checkbox"
                        checked={isDocumentChecked(docType.id)}
                        onChange={() => toggleDocument(docType.id)}
                        className="mt-1 w-5 h-5 rounded border-2 border-gray-300 text-green-600 focus:ring-2 focus:ring-green-500 focus:ring-offset-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900">
                                {docType.name}
                              </span>
                              {uploadedFile && (
                                <CheckIcon className="w-5 h-5 text-green-600 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-gray-500 mt-1">{docType.description}</p>
                          </div>
                        </div>
                        
                        {/* Upload Section */}
                        <div className="mt-3 space-y-2">
                          {uploadedFile ? (
                            // Show uploaded file
                            <div className="flex items-center justify-between p-2 bg-white border border-green-200 rounded-md">
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <DocumentTextIcon className="w-4 h-4 text-green-600 flex-shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-medium text-gray-900 truncate">
                                    {uploadedFile.fileName}
                                  </p>
                                  <p className="text-xs text-gray-500">
                                    {uploadedFile.fileSize && formatFileSize(uploadedFile.fileSize)}
                                  </p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeDocument(docType.id);
                                }}
                                className="text-red-600 hover:text-red-800 text-xs font-medium ml-2 flex-shrink-0"
                              >
                                Remove
                              </button>
                            </div>
                          ) : (
                            // Show upload button
                            <label className="block" onClick={(e) => e.stopPropagation()}>
                              <input
                                type="file"
                                onChange={(e) => handleFileUpload(docType.id, e)}
                                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                                className="hidden"
                                onClick={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                              />
                              <div className="flex items-center justify-center px-3 py-2 border border-dashed border-blue-300 rounded-md cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors">
                                <DocumentTextIcon className="w-4 h-4 text-blue-600 mr-2" />
                                <span className="text-xs font-medium text-blue-600">
                                  Upload Document
                                </span>
                              </div>
                            </label>
                          )}
                          
                          {/* Optional notes field */}
                          <input
                            type="text"
                            placeholder="Add notes (e.g., expiry date, location)..."
                            value={getDocumentNotes(docType.id)}
                            onChange={(e) => {
                              e.stopPropagation();
                              updateDocumentNotes(docType.id, e.target.value);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            onKeyDown={(e) => {
                              // Prevent form navigation on Enter in notes field
                              if (e.key === 'Enter') {
                                e.stopPropagation();
                              }
                            }}
                            className="w-full px-2 py-1 text-xs border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary */}
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Documents checked:</span>
                <span className="font-semibold text-gray-900">
                  {documentChecklist.filter(d => d.checked).length} / {documentTypes.length}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-700">Files uploaded:</span>
                <span className="font-semibold text-green-600">
                  {documentChecklist.filter(d => d.fileName).length}
                </span>
              </div>
            </div>
          </div>
            )}
          </div>
          </form>

          {/* Footer with Navigation Buttons */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-6">
            {/* Left side - Back button and step indicator */}
            <div className="flex items-center space-x-4">
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
              {/* Step indicator */}
              <span className="text-xs text-gray-500">
                Step {currentWizardStep + 1} of {wizardSteps.length} ({wizardSteps[currentWizardStep]?.title})
              </span>
            </div>

            {/* Right side - Action buttons */}
            <div className="flex space-x-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              
              {/* Navigation: Next or Submit button */}
              {currentWizardStep < wizardSteps.length - 1 ? (
                <button
                  type="button"
                  onClick={() => {
                    console.log('Next button clicked at step:', currentWizardStep);
                    handleNext();
                  }}
                  disabled={!propertyToEdit && !canProceedToNextStep()}
                  className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={(e) => {
                    console.log(propertyToEdit ? 'Save Changes button clicked' : 'Add Property button clicked');
                    const fakeEvent = { preventDefault: () => {} } as React.FormEvent;
                    handleSubmit(fakeEvent);
                  }}
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};