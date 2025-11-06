// =====================================================
// TENANT DOCUMENT TYPES
// Manages personal documents for tenants (country-specific)
// =====================================================

export type CountryCode = 'UK' | 'GR' | 'US';

export type DocumentStatus = 'pending' | 'uploaded' | 'verified' | 'rejected' | 'expired';

// UK-specific document types
export type UKDocumentType =
  | 'id_proof'
  | 'right_to_rent'
  | 'proof_of_address'
  | 'bank_statement'
  | 'employment_reference'
  | 'landlord_reference'
  | 'guarantor_id'
  | 'guarantor_income'
  | 'tenancy_agreement_signed'
  | 'inventory_signed'
  | 'check_in_report'
  | 'deposit_receipt';

// Greece-specific document types
export type GreeceDocumentType =
  | 'id_proof'
  | 'tax_number'
  | 'tax_clearance'
  | 'bank_statement'
  | 'employment_reference'
  | 'income_declaration'
  | 'tenancy_agreement_signed'
  | 'inventory_signed';

// USA-specific document types
export type USADocumentType =
  | 'id_proof'
  | 'ssn_verification'
  | 'credit_report'
  | 'bank_statement'
  | 'pay_stubs'
  | 'employment_verification'
  | 'tax_return'
  | 'previous_landlord_reference'
  | 'tenancy_agreement_signed'
  | 'inventory_signed'
  | 'renter_insurance';

export type DocumentType = UKDocumentType | GreeceDocumentType | USADocumentType;

export interface TenantDocument {
  id: string;
  tenantId: string;
  propertyId: string;
  countryCode: CountryCode;
  
  // Document details
  documentType: DocumentType;
  documentName: string;
  description?: string;
  
  // File information
  fileName: string;
  fileSize?: number; // in bytes
  fileType?: string; // MIME type
  storagePath: string;
  
  // Status
  status: DocumentStatus;
  isRequired: boolean;
  
  // Dates
  uploadedAt?: string;
  verifiedAt?: string;
  verifiedBy?: string;
  expiryDate?: string;
  
  // Metadata
  notes?: string;
  rejectionReason?: string;
  
  // Links
  relatedTo?: 'tenant' | 'guarantor' | 'onboarding';
  guarantorName?: string;
  
  createdAt: string;
  updatedAt: string;
}

export interface TenantDocumentRequirement {
  id: string;
  countryCode: CountryCode;
  documentType: DocumentType;
  documentLabel: string;
  description?: string;
  isRequired: boolean;
  requiredForOnboarding: boolean;
  requiredForExisting: boolean;
  canExpire: boolean;
  typicalExpiryYears?: number;
  orderIndex: number;
}

export interface DocumentUploadRequest {
  tenantId: string;
  propertyId: string;
  countryCode: CountryCode;
  documentType: DocumentType;
  documentName: string;
  description?: string;
  file: File;
  relatedTo?: 'tenant' | 'guarantor' | 'onboarding';
  guarantorName?: string;
  expiryDate?: string;
}

export interface DocumentCheckResult {
  documentType: DocumentType;
  documentLabel: string;
  isRequired: boolean;
  isUploaded: boolean;
  status: DocumentStatus;
}

export interface ExpiringDocument {
  documentId: string;
  tenantId: string;
  tenantName: string;
  documentType: DocumentType;
  documentName: string;
  expiryDate: string;
  daysUntilExpiry: number;
}

// Helper function to get document type label
export function getDocumentTypeLabel(documentType: DocumentType, countryCode: CountryCode): string {
  const labels: Record<CountryCode, Record<string, string>> = {
    UK: {
      id_proof: 'Photo ID (Passport/Driving License)',
      right_to_rent: 'Right to Rent Document',
      proof_of_address: 'Proof of Address',
      bank_statement: 'Bank Statements (3 months)',
      employment_reference: 'Employment Reference',
      landlord_reference: 'Previous Landlord Reference',
      guarantor_id: 'Guarantor Photo ID',
      guarantor_income: 'Guarantor Income Proof',
      tenancy_agreement_signed: 'Signed Tenancy Agreement',
      inventory_signed: 'Signed Inventory',
      check_in_report: 'Check-In Report',
      deposit_receipt: 'Deposit Receipt',
    },
    GR: {
      id_proof: 'Photo ID (ID Card/Passport)',
      tax_number: 'Tax Identification Number (ΑΦΜ)',
      tax_clearance: 'Tax Clearance Certificate',
      bank_statement: 'Bank Statements (3 months)',
      employment_reference: 'Employment Verification',
      income_declaration: 'Income Declaration (E1)',
      tenancy_agreement_signed: 'Signed Tenancy Agreement',
      inventory_signed: 'Signed Inventory',
    },
    US: {
      id_proof: 'Photo ID (Driver\'s License/Passport)',
      ssn_verification: 'Social Security Number',
      credit_report: 'Credit Report',
      bank_statement: 'Bank Statements (2-3 months)',
      pay_stubs: 'Pay Stubs (2-3 months)',
      employment_verification: 'Employment Verification Letter',
      tax_return: 'Tax Return (W-2)',
      previous_landlord_reference: 'Previous Landlord Reference',
      tenancy_agreement_signed: 'Signed Lease Agreement',
      inventory_signed: 'Signed Move-In Checklist',
      renter_insurance: 'Renter\'s Insurance',
    },
  };
  
  return labels[countryCode]?.[documentType] || documentType;
}

// Helper function to format file size
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

// Helper function to get status badge color
export function getDocumentStatusColor(status: DocumentStatus): string {
  const colors: Record<DocumentStatus, string> = {
    pending: 'bg-gray-100 text-gray-800 border-gray-200',
    uploaded: 'bg-blue-100 text-blue-800 border-blue-200',
    verified: 'bg-green-100 text-green-800 border-green-200',
    rejected: 'bg-red-100 text-red-800 border-red-200',
    expired: 'bg-orange-100 text-orange-800 border-orange-200',
  };
  
  return colors[status];
}

// Helper function to get status label
export function getDocumentStatusLabel(status: DocumentStatus): string {
  const labels: Record<DocumentStatus, string> = {
    pending: 'Pending Upload',
    uploaded: 'Uploaded',
    verified: 'Verified',
    rejected: 'Rejected',
    expired: 'Expired',
  };
  
  return labels[status];
}

