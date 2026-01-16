// =====================================================
// LEASE PARSING TYPES
// Types for Reducto.ai lease document parsing
// =====================================================

export type SupportedLanguage = 'en' | 'bg' | 'it';

export type ConfidenceLevel = 'high' | 'medium' | 'low';

export interface FieldConfidence {
  field: string;
  confidence: number; // 0-1 scale
  level: ConfidenceLevel;
  rawText?: string; // Original text from document
}

// Schema for fields to extract from lease documents
export interface LeaseExtractionSchema {
  // Tenant Information
  tenantName: {
    type: 'string';
    description: string;
  };
  tenantEmail: {
    type: 'string';
    description: string;
  };
  tenantPhone: {
    type: 'string';
    description: string;
  };
  
  // Lease Terms
  leaseStartDate: {
    type: 'string';
    description: string;
  };
  leaseEndDate: {
    type: 'string';
    description: string;
  };
  
  // Financial
  monthlyRent: {
    type: 'number';
    description: string;
  };
  depositAmount: {
    type: 'number';
    description: string;
  };
  rentDueDay: {
    type: 'number';
    description: string;
  };
  
  // Property
  propertyAddress: {
    type: 'string';
    description: string;
  };
  
  // Landlord
  landlordName: {
    type: 'string';
    description: string;
  };
  landlordContact: {
    type: 'string';
    description: string;
  };
  
  // Additional Terms
  paymentTerms: {
    type: 'string';
    description: string;
  };
  breakClauseDate: {
    type: 'string';
    description: string;
  };
  noticePeriodDays: {
    type: 'number';
    description: string;
  };
}

// Parsed data from lease document
export interface ParsedLeaseData {
  // Tenant Information
  tenantName?: string;
  tenantEmail?: string;
  tenantPhone?: string;
  
  // Lease Terms
  leaseStartDate?: string; // ISO date string
  leaseEndDate?: string; // ISO date string
  
  // Financial
  monthlyRent?: number;
  depositAmount?: number;
  rentDueDay?: number; // 1-28
  currency?: string; // GBP, EUR, USD, BGN, etc.
  
  // Property
  propertyAddress?: string;
  
  // Landlord
  landlordName?: string;
  landlordContact?: string;
  
  // Additional Terms
  paymentTerms?: string;
  breakClauseDate?: string; // ISO date string
  noticePeriodDays?: number;
}

// Response from the parsing API
export interface LeaseParseResponse {
  success: boolean;
  data: ParsedLeaseData;
  confidence: Record<keyof ParsedLeaseData, FieldConfidence>;
  documentLanguage: SupportedLanguage;
  processingTimeMs: number;
  error?: string;
}

// Request to the parsing API
export interface LeaseParseRequest {
  document: string; // Base64 encoded document
  fileName: string;
  fileType: string;
  language?: SupportedLanguage; // Optional - will auto-detect if not provided
}

// Verified field with user confirmation status
export interface VerifiedField<T = string | number> {
  fieldName: keyof ParsedLeaseData;
  parsedValue: T | undefined;
  editedValue: T | undefined;
  confidence: FieldConfidence;
  isVerified: boolean;
  isRejected: boolean;
}

// State for the verification UI
export interface LeaseVerificationState {
  fields: VerifiedField[];
  allVerified: boolean;
  documentPreviewUrl?: string;
}

// Mapping parsed data to tenant form fields
export interface TenantFormMapping {
  firstName: string;
  surname: string;
  email: string;
  phone: string;
  leaseStartDate: string;
  leaseEndDate: string;
  monthlyRent: string;
  depositAmount: string;
  rentDueDay: number;
}

// Helper function to get confidence level from score
export function getConfidenceLevel(score: number): ConfidenceLevel {
  if (score >= 0.8) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

// Helper function to get confidence color for UI
export function getConfidenceColor(level: ConfidenceLevel): string {
  switch (level) {
    case 'high':
      return 'text-green-600 bg-green-50';
    case 'medium':
      return 'text-yellow-600 bg-yellow-50';
    case 'low':
      return 'text-red-600 bg-red-50';
  }
}

// Default extraction schema with descriptions
export const LEASE_EXTRACTION_SCHEMA: LeaseExtractionSchema = {
  tenantName: {
    type: 'string',
    description: 'Full legal name of the tenant(s) as stated in the lease agreement',
  },
  tenantEmail: {
    type: 'string',
    description: 'Email address of the tenant for correspondence',
  },
  tenantPhone: {
    type: 'string',
    description: 'Phone number of the tenant including country code if present',
  },
  leaseStartDate: {
    type: 'string',
    description: 'Start date of the tenancy/lease agreement in ISO format (YYYY-MM-DD)',
  },
  leaseEndDate: {
    type: 'string',
    description: 'End date of the tenancy/lease agreement in ISO format (YYYY-MM-DD)',
  },
  monthlyRent: {
    type: 'number',
    description: 'Monthly rent amount as a number without currency symbol',
  },
  depositAmount: {
    type: 'number',
    description: 'Security deposit amount as a number without currency symbol',
  },
  rentDueDay: {
    type: 'number',
    description: 'Day of the month when rent is due (1-28)',
  },
  propertyAddress: {
    type: 'string',
    description: 'Full address of the rental property including postcode',
  },
  landlordName: {
    type: 'string',
    description: 'Full legal name of the landlord or property owner',
  },
  landlordContact: {
    type: 'string',
    description: 'Contact details of the landlord (email or phone)',
  },
  paymentTerms: {
    type: 'string',
    description: 'Payment terms and conditions, including payment methods accepted',
  },
  breakClauseDate: {
    type: 'string',
    description: 'Date when break clause can be exercised in ISO format (YYYY-MM-DD)',
  },
  noticePeriodDays: {
    type: 'number',
    description: 'Notice period required in days for termination',
  },
};
