import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  HomeIcon,
  BuildingOfficeIcon,
  CurrencyPoundIcon,
  UserGroupIcon,
  CheckIcon,
  ExclamationTriangleIcon,
  MapPinIcon,
  Squares2X2Icon,
  SparklesIcon,
  ShieldCheckIcon,
  InformationCircleIcon,
  DocumentTextIcon,
  ArrowUpTrayIcon,
  TrashIcon,
  EyeIcon,
  PaperClipIcon,
  PhotoIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
  StarIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
import { PropertyPhotoService, PropertyPhoto } from '../services/PropertyPhotoService';
import { SimplifiedProperty, PropertyRoom } from '../utils/simplifiedDataTransforms';
import { validatePropertyData } from '../utils/simplifiedDataTransforms';
import { CountryCode } from '../types';
import { useCurrency } from '../hooks/useCurrency';
import { useOrganization } from '../contexts/OrganizationContext';
import { supabase } from '../lib/supabase';

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

// Property Document Types by Country
interface PropertyDocumentType {
  id: string;
  name: string;
  description: string;
  required?: boolean;
}

const UK_PROPERTY_DOCUMENTS: PropertyDocumentType[] = [
  { id: 'title_deeds', name: 'Title Deeds', description: 'Legal ownership documentation', required: false },
  { id: 'property_survey', name: 'Property Survey/Valuation', description: 'Professional property survey report', required: false },
  { id: 'building_insurance', name: 'Building Insurance Policy', description: 'Current building insurance certificate', required: false },
  { id: 'eicr_property', name: 'EICR Certificate', description: 'Electrical Installation Condition Report', required: false },
  { id: 'epc', name: 'Energy Performance Certificate', description: 'EPC rating certificate', required: false },
  { id: 'purchase_documents', name: 'Purchase Documents', description: 'Property purchase contracts and completion documents', required: false },
  { id: 'mortgage_documents', name: 'Mortgage Documents', description: 'Mortgage agreement and statements', required: false },
  { id: 'property_tax', name: 'Property Tax Documents', description: 'Council tax, stamp duty, and other tax records', required: false },
  { id: 'planning_permission', name: 'Planning Permissions', description: 'Approved planning applications and certificates', required: false },
  { id: 'building_regulations', name: 'Building Regulations Certificates', description: 'Building control completion certificates', required: false },
  { id: 'warranty', name: 'Warranty Documents', description: 'NHBC or other warranty certificates', required: false },
  { id: 'floor_plans', name: 'Floor Plans', description: 'Property layout and floor plans', required: false },
  { id: 'other', name: 'Other Documents', description: 'Any other relevant property documents', required: false }
];

const GREECE_PROPERTY_DOCUMENTS: PropertyDocumentType[] = [
  { id: 'title_deeds', name: 'Title Deeds (Τίτλος Ιδιοκτησίας)', description: 'Legal ownership documentation', required: false },
  { id: 'building_permit', name: 'Building Permit (Οικοδομική Άδεια)', description: 'Valid building permit', required: false },
  { id: 'epc_greece', name: 'Energy Certificate (ΠΕΑ)', description: 'Energy Performance Certificate', required: false },
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
  { id: 'lead_paint', name: 'Lead Paint Disclosure', description: 'Required for pre-1978 properties', required: false },
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

interface PropertyDocument {
  id: string;
  documentTypeId: string;
  fileName: string;
  fileSize: number;
  uploadedAt: Date;
  fileUrl?: string;
  fileType: string;
  fileData?: string; // Base64 encoded file data for preview
}

export const PropertyEditModal: React.FC<PropertyEditModalProps> = ({
  property,
  isOpen,
  onClose,
  onSave
}) => {
  const { formatCurrency } = useCurrency();
  const { currentOrganization } = useOrganization();
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
  
  // Structured address fields
  const [addressFields, setAddressFields] = useState({
    addressLine1: '',
    addressLine2: '',
    city: '',
    postcode: ''
  });
  
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [documents, setDocuments] = useState<PropertyDocument[]>([]);
  const [selectedDocumentType, setSelectedDocumentType] = useState<string>('');
  const [viewingDocument, setViewingDocument] = useState<PropertyDocument | null>(null);
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
  const [loadingPhotos, setLoadingPhotos] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number | null>(null);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);

  // Load photos when property changes
  useEffect(() => {
    if (property && isOpen) {
      loadPhotos();
    } else {
      setPhotos([]);
      setSelectedPhotoIndex(null);
    }
  }, [property?.id, isOpen]);

  const loadPhotos = async () => {
    if (!property?.id) return;

    setLoadingPhotos(true);
    try {
      const propertyPhotos = await PropertyPhotoService.getPropertyPhotos(property.id);
      setPhotos(propertyPhotos);
      // Auto-select first photo (or primary photo if available)
      if (propertyPhotos.length > 0) {
        const primaryIndex = propertyPhotos.findIndex(p => p.isPrimary);
        setSelectedPhotoIndex(primaryIndex >= 0 ? primaryIndex : 0);
      } else {
        setSelectedPhotoIndex(null);
      }
    } catch (error) {
      console.error('Error loading photos:', error);
    } finally {
      setLoadingPhotos(false);
    }
  };

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length === 0 || !property?.id || !currentOrganization?.id) return;

    setUploadingPhotos(true);
    setErrors([]);

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Validate file type
        if (!file.type.startsWith('image/')) {
          setErrors(prev => [...prev, `${file.name} is not an image file`]);
          continue;
        }

        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          setErrors(prev => [...prev, `${file.name} exceeds 10MB limit`]);
          continue;
        }

        // Upload photo
        await PropertyPhotoService.uploadPhoto({
          propertyId: property.id,
          organizationId: currentOrganization.id,
          file: file,
          isPrimary: photos.length === 0 && i === 0, // First photo if no photos exist
          displayOrder: photos.length + i,
        });
      }

      // Reload photos after upload
      await loadPhotos();
    } catch (error) {
      console.error('Error uploading photos:', error);
      setErrors(prev => [...prev, error instanceof Error ? error.message : 'Failed to upload photos']);
    } finally {
      setUploadingPhotos(false);
      // Clear file input
      event.target.value = '';
    }
  };

  const handleDeletePhoto = async (photoId: string) => {
    if (!confirm('Are you sure you want to delete this photo?')) return;

    setDeletingPhotoId(photoId);
    try {
      await PropertyPhotoService.deletePhoto(photoId);
      
      // Reload photos after deletion
      await loadPhotos();
      
      // If we deleted the selected photo, select the first remaining photo
      if (photos.length > 1) {
        setSelectedPhotoIndex(0);
      } else {
        setSelectedPhotoIndex(null);
      }
    } catch (error) {
      console.error('Error deleting photo:', error);
      setErrors(prev => [...prev, 'Failed to delete photo']);
    } finally {
      setDeletingPhotoId(null);
    }
  };

  const handleSetPrimaryPhoto = async (photoId: string) => {
    if (!property?.id) return;

    try {
      await PropertyPhotoService.setPrimaryPhoto(photoId, property.id);
      // Reload photos to update primary status
      await loadPhotos();
    } catch (error) {
      console.error('Error setting primary photo:', error);
      setErrors(prev => [...prev, 'Failed to set primary photo']);
    }
  };

  // Update form data when property changes
  useEffect(() => {
    if (property && isOpen) {
      // Fetch property_data from database to get structured address
      const loadPropertyData = async () => {
        try {
          const { data: propertyRecord, error } = await supabase
            .from('properties')
            .select('property_data, address')
            .eq('id', property.id)
            .single();

          if (error) {
            console.error('Error loading property data:', error);
          }

          const propertyData = propertyRecord?.property_data || {};
          
          // Try to parse structured address from property_data
          let addressLine1 = '';
          let addressLine2 = '';
          let city = '';
          let postcode = '';
          
          if (propertyData.address_line_1) {
            addressLine1 = propertyData.address_line_1;
            addressLine2 = propertyData.address_line_2 || '';
            city = propertyData.city || '';
            postcode = propertyData.postcode || '';
          } else if (propertyRecord?.address || property.address) {
            // Fallback: try to parse from full address string
            const fullAddress = propertyRecord?.address || property.address || '';
            const addressParts = fullAddress.split(',').map(s => s.trim());
            if (addressParts.length >= 2) {
              addressLine1 = addressParts[0];
              if (addressParts.length >= 3) {
                addressLine2 = addressParts[1];
                city = addressParts[addressParts.length - 2] || '';
                postcode = addressParts[addressParts.length - 1] || '';
              } else {
                city = addressParts[addressParts.length - 2] || '';
                postcode = addressParts[addressParts.length - 1] || '';
              }
            } else {
              addressLine1 = fullAddress;
            }
          }
          
          setAddressFields({
            addressLine1,
            addressLine2,
            city,
            postcode
          });
        } catch (err) {
          console.error('Error in loadPropertyData:', err);
        }
      };

      loadPropertyData();
      
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
  }, [property, isOpen]);

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
    // Validate address fields
    if (!addressFields.addressLine1.trim()) {
      setErrors(['Address Line 1 is required']);
      return;
    }
    if (!addressFields.city.trim()) {
      setErrors(['City is required']);
      return;
    }
    if (!addressFields.postcode.trim()) {
      setErrors([`${currentOrganization?.country_code === 'US' ? 'ZIP Code' : 'Postcode'} is required`]);
      return;
    }
    
    const validationErrors = validatePropertyData(formData);
    
    if (validationErrors.length > 0) {
      setErrors(validationErrors);
      return;
    }

    // Build full address string for backward compatibility
    const fullAddress = [
      addressFields.addressLine1,
      addressFields.addressLine2,
      addressFields.city,
      addressFields.postcode
    ].filter(Boolean).join(', ');

    // Update formData with full address and structured address fields
    const updatedFormData = {
      ...formData,
      address: fullAddress,
      // Store structured address in a way that can be passed to the save function
      // We'll need to update the save function to handle this
    };

    setIsSaving(true);
    
    try {
      // Pass structured address fields along with formData
      await onSave({
        ...updatedFormData,
        // Add structured address fields that will be saved to property_data
        _addressFields: addressFields
      } as any);
      onClose();
    } catch (error) {
      console.error('Error saving property:', error);
      setErrors(['Failed to save property. Please try again.']);
    } finally {
      setIsSaving(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedDocumentType) return;

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setErrors(['File size must be less than 10MB']);
      return;
    }

    // Read the file and store as base64 for preview
    const reader = new FileReader();
    reader.onload = (e) => {
      const fileData = e.target?.result as string;
      
      // Create a new document entry
      const newDocument: PropertyDocument = {
        id: `doc-${Date.now()}`,
        documentTypeId: selectedDocumentType,
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        uploadedAt: new Date(),
        fileData: fileData, // Store base64 data for preview
        // In production, you'd upload to Supabase Storage and store the URL instead
      };

      setDocuments(prev => [...prev, newDocument]);
      setSelectedDocumentType('');
    };

    reader.readAsDataURL(file);
    
    // Clear the file input
    event.target.value = '';
  };

  const handleDeleteDocument = (documentId: string) => {
    setDocuments(prev => prev.filter(doc => doc.id !== documentId));
  };

  const handleViewDocument = (document: PropertyDocument) => {
    setViewingDocument(document);
  };

  const handleDownloadDocument = (document: PropertyDocument) => {
    if (!document.fileData) return;
    
    // Create a download link
    const link = window.document.createElement('a');
    link.href = document.fileData;
    link.download = document.fileName;
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const availableDocumentTypes = getPropertyDocumentTypes(property?.countryCode || 'UK');

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

          <div className="space-y-5">
            {/* SECTION 1: Basic Information */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center space-x-2 mb-4">
                <HomeIcon className="w-5 h-5 text-blue-600" />
                <h3 className="text-base font-semibold text-gray-900">Basic Information</h3>
              </div>
              
              <div className="space-y-4">
                {/* Property Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Name <span className="text-gray-400 font-normal">(Optional)</span>
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

                {/* Structured Address Fields */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address Line 1 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={addressFields.addressLine1}
                      onChange={(e) => setAddressFields(prev => ({ ...prev, addressLine1: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder={currentOrganization?.country_code === 'US' ? 'e.g., 123 Main Street' : 'e.g., 123 High Street'}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Address Line 2 <span className="text-gray-400 font-normal">(optional)</span>
                    </label>
                    <input
                      type="text"
                      value={addressFields.addressLine2}
                      onChange={(e) => setAddressFields(prev => ({ ...prev, addressLine2: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Apartment, suite, unit, etc."
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        City <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={addressFields.city}
                        onChange={(e) => setAddressFields(prev => ({ ...prev, city: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={currentOrganization?.country_code === 'US' ? 'New York' : currentOrganization?.country_code === 'GR' ? 'Athens' : 'London'}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {currentOrganization?.country_code === 'US' ? 'ZIP Code' : 'Postcode'} <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={addressFields.postcode}
                        onChange={(e) => setAddressFields(prev => ({ ...prev, postcode: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder={currentOrganization?.country_code === 'US' ? '10001' : currentOrganization?.country_code === 'GR' ? '106 82' : 'SW1A 1AA'}
                      />
                    </div>
                  </div>
                </div>

                {/* Property Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Property Type <span className="text-red-500">*</span>
                  </label>
                  <div className="grid grid-cols-1 gap-2">
                    {propertyTypeOptions.map((option) => {
                      const Icon = option.icon;
                      return (
                        <button
                          key={option.value}
                          type="button"
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

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Status
                  </label>
                  <div className="space-y-2">
                    {statusOptions.map((option) => (
                      <button
                        key={option.value}
                        type="button"
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
              </div>
            </div>

            {/* SECTION 2: Property Specifications */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center space-x-2 mb-4">
                <Squares2X2Icon className="w-5 h-5 text-purple-600" />
                <h3 className="text-base font-semibold text-gray-900">Property Specifications</h3>
              </div>
              
              <div className="space-y-4">
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
              </div>
            </div>

            {/* SECTION 3: Features & Amenities */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center space-x-2 mb-4">
                <SparklesIcon className="w-5 h-5 text-amber-600" />
                <h3 className="text-base font-semibold text-gray-900">Features & Amenities</h3>
              </div>
              
              <div className="space-y-4">
                {/* Furnished & Parking */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Furnished Status
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
                <div className="border border-gray-200 rounded-lg p-3">
                  <label className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.garden || false}
                      onChange={(e) => handleInputChange('garden', e.target.checked)}
                      className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 checked:bg-blue-600 checked:border-blue-600"
                      style={{ backgroundColor: formData.garden ? '' : 'white' }}
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Property has a garden</span>
                      <p className="text-xs text-gray-500">Check if this property includes garden space</p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* SECTION 4: Financial Details */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center space-x-2 mb-4">
                <CurrencyPoundIcon className="w-5 h-5 text-green-600" />
                <h3 className="text-base font-semibold text-gray-900">Financial Details</h3>
              </div>
              
              <div className="space-y-4">
                {/* Target Rent - Hidden for HMO properties */}
                {formData.propertyType !== 'hmo' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Target Monthly Rent
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
                      {formatCurrency(formData.targetRent)} per month
                    </p>
                  </div>
                )}

                {/* HMO Total Rent Display */}
                {formData.propertyType === 'hmo' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2 mb-1">
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
                    </div>
                  </div>
                )}

                {/* Purchase Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Purchase Price <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <CurrencyPoundIcon className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={formData.purchasePrice || ''}
                      onChange={(e) => handleInputChange('purchasePrice', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="250000"
                    />
                  </div>
                  {formData.purchasePrice && (
                    <p className="mt-1 text-sm text-gray-500">
                      {formatCurrency(formData.purchasePrice)}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    The original acquisition cost of this property
                  </p>
                </div>
              </div>
            </div>

            {/* SECTION 5: HMO-Specific Details (only shown for HMO properties) */}
            {formData.propertyType === 'hmo' && (
              <div className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-center space-x-2 mb-4">
                  <ShieldCheckIcon className="w-5 h-5 text-indigo-600" />
                  <h3 className="text-base font-semibold text-gray-900">HMO Details</h3>
                </div>
                
                <div className="space-y-4">
                  {/* Max Occupancy */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Maximum Occupancy
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
                    <p className="mt-1 text-xs text-gray-500">
                      Maximum number of tenants allowed in this HMO
                    </p>
                  </div>

                  {/* License Requirement */}
                  <div className="border border-gray-200 rounded-lg p-3">
                    <label className="flex items-start space-x-3 cursor-pointer">
                      <input
                        type="checkbox"
                        id="licenseRequired"
                        checked={formData.licenseRequired || false}
                        onChange={(e) => {
                          handleInputChange('licenseRequired', e.target.checked);
                          if (!e.target.checked) {
                            handleInputChange('licenseNumber', undefined);
                            handleInputChange('licenseExpiry', undefined);
                          }
                        }}
                        className="w-5 h-5 mt-0.5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 checked:bg-blue-600 checked:border-blue-600"
                        style={{ backgroundColor: formData.licenseRequired ? '' : 'white' }}
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">HMO License Required</span>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Check if your local authority requires an HMO license for this property
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* License Details - Only show if license is required */}
                  {formData.licenseRequired && (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            License Number <span className="text-red-500">*</span>
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
                            License Expiry Date <span className="text-red-500">*</span>
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
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">Room Configuration</h4>
                        <p className="text-xs text-gray-500 mt-0.5">Define individual rooms and their rent</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const newRoom = {
                            id: `room-${Date.now()}`,
                            name: `Room ${(formData.rooms || []).length + 1}`,
                            area: 12,
                            monthlyRent: 500,
                            isOccupied: false
                          };
                          handleInputChange('rooms', [...(formData.rooms || []), newRoom]);
                        }}
                        className="px-3 py-1.5 text-xs font-medium bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      >
                        + Add Room
                      </button>
                    </div>
                    
                    <div className="space-y-3">
                      {(formData.rooms || []).map((room, index) => (
                        <div key={room.id} className="border border-gray-200 rounded-lg p-3 bg-white">
                          <div className="space-y-3">
                            <div>
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
                                className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                placeholder="e.g. Master Bedroom"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                              <div>
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
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-gray-700 mb-1">
                                  Monthly Rent
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
                                  className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded bg-white text-gray-900 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                const updatedRooms = (formData.rooms || []).filter((_, i) => i !== index);
                                handleInputChange('rooms', updatedRooms);
                              }}
                              className="w-full px-2 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50 rounded transition-colors"
                            >
                              Remove Room
                            </button>
                          </div>
                        </div>
                      ))}
                      
                      {(!formData.rooms || formData.rooms.length === 0) && (
                        <div className="text-center py-6 text-gray-500 text-sm bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                          <HomeIcon className="w-8 h-8 mx-auto text-gray-400 mb-2" />
                          <p className="font-medium">No rooms defined yet</p>
                          <p className="text-xs mt-1">Click "Add Room" to create rooms for this HMO</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* SECTION 6: Property Photos */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <PhotoIcon className="w-5 h-5 text-blue-600" />
                  <h3 className="text-base font-semibold text-gray-900">Property Photos</h3>
                </div>
                {/* Add Photos Button */}
                <label className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500">
                  <PhotoIcon className="w-4 h-4 mr-2" />
                  {uploadingPhotos ? 'Uploading...' : 'Add Photos'}
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    disabled={uploadingPhotos}
                    className="sr-only"
                  />
                </label>
              </div>
              
              {loadingPhotos ? (
                <div className="text-center py-8">
                  <ArrowPathIcon className="w-8 h-8 text-gray-400 animate-spin mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Loading photos...</p>
                </div>
              ) : photos.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                  <PhotoIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm font-medium text-gray-600 mb-1">No photos available</p>
                  <p className="text-xs text-gray-500 mb-4">Click "Add Photos" above to upload property images</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Main Photo Display */}
                  {selectedPhotoIndex !== null && selectedPhotoIndex < photos.length && photos[selectedPhotoIndex] && (
                    <div className="relative bg-gray-900 rounded-lg overflow-hidden" style={{ aspectRatio: '16/9' }}>
                      <img
                        src={photos[selectedPhotoIndex].url || ''}
                        alt={photos[selectedPhotoIndex].caption || `Photo ${selectedPhotoIndex + 1}`}
                        className="w-full h-full object-contain"
                      />
                      {/* Primary Badge and Set Primary Button */}
                      <div className="absolute top-2 left-2 flex items-center space-x-2">
                        {photos[selectedPhotoIndex].isPrimary ? (
                          <div className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium flex items-center space-x-1">
                            <StarIconSolid className="w-3 h-3" />
                            <span>Primary</span>
                          </div>
                        ) : (
                          <button
                            onClick={() => handleSetPrimaryPhoto(photos[selectedPhotoIndex].id)}
                            className="bg-gray-800 bg-opacity-70 hover:bg-opacity-90 text-white px-2 py-1 rounded text-xs font-medium flex items-center space-x-1 transition-all"
                            title="Set as primary photo"
                          >
                            <StarIcon className="w-3 h-3" />
                            <span>Set Primary</span>
                          </button>
                        )}
                      </div>
                      {/* Delete Button */}
                      <button
                        onClick={() => handleDeletePhoto(photos[selectedPhotoIndex].id)}
                        disabled={deletingPhotoId === photos[selectedPhotoIndex].id}
                        className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white p-2 rounded-full transition-all disabled:opacity-50"
                        title="Delete photo"
                      >
                        {deletingPhotoId === photos[selectedPhotoIndex].id ? (
                          <ArrowPathIcon className="w-4 h-4 animate-spin" />
                        ) : (
                          <TrashIcon className="w-4 h-4" />
                        )}
                      </button>
                      {photos.length > 1 && (
                        <>
                          <button
                            onClick={() => setSelectedPhotoIndex(selectedPhotoIndex > 0 ? selectedPhotoIndex - 1 : photos.length - 1)}
                            className="absolute left-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full transition-all"
                          >
                            <ChevronLeftIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setSelectedPhotoIndex(selectedPhotoIndex < photos.length - 1 ? selectedPhotoIndex + 1 : 0)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-2 rounded-full transition-all"
                          >
                            <ChevronRightIcon className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )}

                  {/* Thumbnail Grid */}
                  {photos.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-700 mb-2">
                        {photos.length} {photos.length === 1 ? 'photo' : 'photos'}
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {photos.map((photo, index) => (
                          <div
                            key={photo.id}
                            className={`relative group aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                              selectedPhotoIndex === index
                                ? 'border-blue-600 ring-2 ring-blue-200'
                                : 'border-gray-200'
                            }`}
                          >
                            <button
                              onClick={() => setSelectedPhotoIndex(index)}
                              className="w-full h-full"
                            >
                              <img
                                src={photo.url || ''}
                                alt={`Thumbnail ${index + 1}`}
                                className="w-full h-full object-cover"
                              />
                            </button>
                            {/* Primary Badge */}
                            {photo.isPrimary ? (
                              <div className="absolute top-1 left-1 bg-blue-600 text-white text-xs px-1 py-0.5 rounded flex items-center">
                                <StarIconSolid className="w-2.5 h-2.5 mr-0.5" />
                                <span>P</span>
                              </div>
                            ) : (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleSetPrimaryPhoto(photo.id);
                                }}
                                className="absolute top-1 left-1 bg-gray-800 bg-opacity-70 hover:bg-opacity-90 text-white p-1 rounded-full transition-all opacity-0 group-hover:opacity-100"
                                title="Set as primary photo"
                              >
                                <StarIcon className="w-3 h-3" />
                              </button>
                            )}
                            {/* Delete Button on Thumbnail */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePhoto(photo.id);
                              }}
                              disabled={deletingPhotoId === photo.id}
                              className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white p-1 rounded-full transition-all opacity-0 group-hover:opacity-100 disabled:opacity-50"
                              title="Delete photo"
                            >
                              {deletingPhotoId === photo.id ? (
                                <ArrowPathIcon className="w-3 h-3 animate-spin" />
                              ) : (
                                <TrashIcon className="w-3 h-3" />
                              )}
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* SECTION 7: Property Documents */}
            <div className="bg-white border border-gray-200 rounded-lg p-5">
              <div className="flex items-center space-x-2 mb-4">
                <DocumentTextIcon className="w-5 h-5 text-teal-600" />
                <h3 className="text-base font-semibold text-gray-900">Property Documents</h3>
              </div>
              
              <div className="space-y-4">
                {/* Upload New Document */}
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3">Upload New Document</h4>
                  
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Document Type
                      </label>
                      <select
                        value={selectedDocumentType}
                        onChange={(e) => setSelectedDocumentType(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select document type...</option>
                        {availableDocumentTypes.map(docType => (
                          <option key={docType.id} value={docType.id}>
                            {docType.name}
                          </option>
                        ))}
                      </select>
                      {selectedDocumentType && (
                        <p className="text-xs text-gray-500 mt-1">
                          {availableDocumentTypes.find(dt => dt.id === selectedDocumentType)?.description}
                        </p>
                      )}
                    </div>

                    {selectedDocumentType && (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-white">
                        <ArrowUpTrayIcon className="w-10 h-10 text-gray-400 mx-auto mb-3" />
                        <label className="cursor-pointer">
                          <span className="text-blue-600 hover:text-blue-800 font-medium">
                            Click to upload
                          </span>
                          <span className="text-gray-600"> or drag and drop</span>
                          <input
                            type="file"
                            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                        <p className="text-xs text-gray-500 mt-2">
                          PDF, DOC, DOCX, JPG, PNG up to 10MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Uploaded Documents List */}
                {documents.length > 0 ? (
                  <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-gray-900">Uploaded Documents</h4>
                    <div className="space-y-2">
                      {documents.map(doc => {
                        const docType = availableDocumentTypes.find(dt => dt.id === doc.documentTypeId);
                        return (
                          <div 
                            key={doc.id}
                            className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:shadow-sm transition-shadow"
                          >
                            <div className="flex items-center space-x-3 flex-1 min-w-0">
                              <div className="p-2 bg-teal-100 rounded-lg flex-shrink-0">
                                <PaperClipIcon className="w-4 h-4 text-teal-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
                                  {doc.fileName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {docType?.name} • {formatFileSize(doc.fileSize)} • {doc.uploadedAt.toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center space-x-1 ml-3">
                              <button
                                type="button"
                                onClick={() => handleViewDocument(doc)}
                                className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                title="View document"
                              >
                                <EyeIcon className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadDocument(doc)}
                                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                title="Download document"
                              >
                                <ArrowUpTrayIcon className="w-4 h-4 transform rotate-180" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDocument(doc.id)}
                                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Delete document"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border-2 border-dashed border-gray-200">
                    <DocumentTextIcon className="w-10 h-10 mx-auto text-gray-400 mb-2" />
                    <p className="text-sm font-medium text-gray-600">No documents uploaded yet</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Select a document type above to upload property documents
                    </p>
                  </div>
                )}
              </div>
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

      {/* Document Viewer Modal */}
      {viewingDocument && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-75 z-[60]"
            onClick={() => setViewingDocument(null)}
          />
          
          {/* Viewer Modal */}
          <div className="fixed inset-4 md:inset-8 lg:inset-16 bg-white rounded-lg shadow-2xl z-[70] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-3 flex-1 min-w-0">
                <DocumentTextIcon className="w-6 h-6 text-teal-600 flex-shrink-0" />
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 truncate">
                    {viewingDocument.fileName}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {availableDocumentTypes.find(dt => dt.id === viewingDocument.documentTypeId)?.name} • {formatFileSize(viewingDocument.fileSize)}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2 ml-4">
                <button
                  onClick={() => handleDownloadDocument(viewingDocument)}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
                >
                  <ArrowUpTrayIcon className="w-4 h-4 transform rotate-180" />
                  <span>Download</span>
                </button>
                <button
                  onClick={() => setViewingDocument(null)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-6 h-6 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Document Content */}
            <div className="flex-1 overflow-auto bg-gray-100 p-4">
              {viewingDocument.fileType === 'application/pdf' ? (
                // PDF Viewer
                <div className="h-full bg-white rounded-lg shadow-sm">
                  <iframe
                    src={viewingDocument.fileData}
                    className="w-full h-full rounded-lg"
                    title={viewingDocument.fileName}
                  />
                </div>
              ) : viewingDocument.fileType.startsWith('image/') ? (
                // Image Viewer
                <div className="h-full flex items-center justify-center">
                  <img
                    src={viewingDocument.fileData}
                    alt={viewingDocument.fileName}
                    className="max-w-full max-h-full object-contain rounded-lg shadow-lg"
                  />
                </div>
              ) : (
                // Unsupported file type
                <div className="h-full flex items-center justify-center">
                  <div className="text-center">
                    <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-900 mb-2">Preview not available</p>
                    <p className="text-sm text-gray-600 mb-4">
                      This file type cannot be previewed in the browser.
                    </p>
                    <button
                      onClick={() => handleDownloadDocument(viewingDocument)}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors inline-flex items-center space-x-2"
                    >
                      <ArrowUpTrayIcon className="w-4 h-4 transform rotate-180" />
                      <span>Download to view</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}

    </>
  );
};