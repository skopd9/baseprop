import { Property, CountryCode } from '../types';

// Room interface for HMO properties
export interface PropertyRoom {
  id: string;
  name: string;
  area: number; // in square meters
  monthlyRent: number;
  isOccupied: boolean;
  tenantId?: string;
}

// Simplified property interface for residential landlords
export interface SimplifiedProperty {
  id: string;
  propertyReference: number; // Auto-incrementing reference number
  propertyName?: string; // Optional friendly name for the property
  countryCode: CountryCode; // Country code: UK, GR, US
  address: string;
  propertyType: 'house' | 'flat' | 'hmo';
  bedrooms: number;
  bathrooms: number;
  targetRent: number;
  actualRent?: number;
  purchasePrice?: number;
  salesPrice?: number;
  tenantCount: number;
  status: 'under_management' | 'sold';
  units: number | Array<{ name: string; area?: number }>;
  unitDetails?: Array<{ name: string; area: number; targetRent: number }>; // Detailed unit info for HMO
  // Enhanced property details
  totalArea?: number; // Total floor area in square meters
  yearBuilt?: number;
  furnished?: 'furnished' | 'unfurnished' | 'part_furnished';
  parking?: 'none' | 'street' | 'driveway' | 'garage';
  garden?: boolean;
  // HMO specific details
  rooms?: PropertyRoom[]; // Individual rooms for HMOs
  maxOccupancy?: number; // Maximum number of tenants allowed
  licenseRequired?: boolean; // Whether HMO license is required
  licenseNumber?: string; // HMO license number
  licenseExpiry?: Date;
  // Ownership details
  ownershipType?: 'individual' | 'company'; // Type of ownership
  companyName?: string; // Company name if ownership type is company
}

// Onboarding data interfaces
export interface TenantCreditCheck {
  id: string;
  type: 'tenant' | 'guarantor';
  name: string;
  email: string;
  status: 'pending' | 'ordered' | 'completed' | 'failed';
  cost: number;
  provider?: string;
  orderedDate?: string;
  completedDate?: string;
  result?: 'passed' | 'failed' | 'pending';
  failureReason?: string;
}

export interface TenantTenancyAgreement {
  method: 'generate' | 'upload';
  status: 'not_started' | 'generating' | 'ready_for_signing' | 'signed' | 'uploaded';
  generatedDate?: string;
  signedDate?: string;
  uploadedFileName?: string;
  docusignEnvelopeId?: string;
  questions: {
    petsAllowed: boolean;
    smokingAllowed: boolean;
    sublettingAllowed: boolean;
    decoratingAllowed: boolean;
    breakClause: boolean;
    breakClauseMonths?: number;
  };
}

export interface TenantPreparationTask {
  id: string;
  task: string;
  completed: boolean;
  required: boolean;
}

export interface TenantPreparation {
  type: 'diy' | 'concierge';
  checklist: TenantPreparationTask[];
  conciergeOrdered: boolean;
  conciergeOrderedDate?: string;
}

export interface TenantOnboardingData {
  creditChecks: TenantCreditCheck[];
  tenancyAgreement: TenantTenancyAgreement;
  preparation: TenantPreparation;
}

// Simplified tenant interface
export interface SimplifiedTenant {
  id: string;
  name: string;
  phone: string;
  email: string;
  propertyId: string;
  propertyAddress: string;
  unitNumber?: string;
  roomId?: string; // For HMO properties - which specific room
  roomName?: string; // Display name of the room (e.g., "Room 1", "Master Bedroom")
  leaseStart?: Date;
  leaseEnd?: Date;
  monthlyRent: number;
  rentStatus: 'current' | 'overdue';
  daysOverdue?: number;
  depositAmount: number;
  depositWeeks?: number;
  onboardingStatus?: 'not_started' | 'in_progress' | 'completed';
  onboardingProgress?: number;
  onboardingNotes?: string;
  onboardingCompletedAt?: Date;
  onboardingData?: TenantOnboardingData;
  rentDueDay?: number; // Day of month rent is due
}

// Transform property data to simplified residential format (updated for new schema)
export const transformToSimplifiedProperty = (property: any, actualTenantCount?: number): SimplifiedProperty => {
  // SCHEMA: Properties table has core columns (id, name, address, status, property_reference)
  // and a JSONB property_data column that contains all the property details
  
  // Extract property data from JSONB field
  const propertyData = property.property_data || {};
  
  // Map property types to simplified residential types
  const getSimplifiedPropertyType = (type: string, subType: string): 'house' | 'flat' | 'hmo' => {
    if (subType === 'hmo') return 'hmo';
    if (subType === 'house') return 'house';
    if (subType === 'flat' || subType === 'studio') return 'flat';
    if (type === 'residential') {
      // Default to flat for residential if no subtype specified
      return 'flat';
    }
    return 'flat';
  };

  // Determine property status (simplified)
  const getPropertyStatus = (status: string, propertyDataStatus?: string): 'under_management' | 'sold' => {
    if (status === 'sold' || status === 'disposed' || propertyDataStatus === 'sold') return 'sold';
    return 'under_management';
  };

  // Use actual tenant count if provided, otherwise fall back to stored count
  const tenantCount = actualTenantCount !== undefined ? actualTenantCount : (propertyData.tenant_count || 0);
  
  // Parse HMO units/rooms if present
  const rooms = propertyData.rooms || [];
  const unitDetails = propertyData.unit_details || [];
  const totalUnits = propertyData.units || (rooms.length > 0 ? rooms.length : 1);

  // Extract country code from database (defaults to UK if not set)
  const countryCode = (property.country_code || propertyData.country_code || 'UK') as CountryCode;

  return {
    id: property.id,
    propertyReference: property.property_reference || 0,
    propertyName: propertyData.property_name || property.name,
    countryCode: countryCode,
    address: property.address,
    propertyType: getSimplifiedPropertyType(
      propertyData.property_type || 'residential', 
      propertyData.property_sub_type || 'flat'
    ),
    bedrooms: propertyData.bedrooms || 2,
    bathrooms: propertyData.bathrooms || 1,
    targetRent: propertyData.target_rent || propertyData.monthly_rent || 1500,
    purchasePrice: propertyData.purchase_price,
    salesPrice: propertyData.sales_price || null,
    tenantCount,
    status: getPropertyStatus(property.status, propertyData.status),
    units: totalUnits,
    unitDetails: unitDetails.length > 0 ? unitDetails : undefined,
    // Enhanced property details
    totalArea: propertyData.total_area,
    yearBuilt: propertyData.year_built,
    furnished: propertyData.furnished || 'unfurnished',
    parking: propertyData.parking || 'none',
    garden: propertyData.garden || false,
    // HMO specific details
    rooms: rooms || [],
    maxOccupancy: propertyData.max_occupancy || (rooms.length > 0 ? rooms.length : undefined),
    licenseRequired: propertyData.license_required || false,
    licenseNumber: propertyData.license_number,
    licenseExpiry: propertyData.license_expiry ? new Date(propertyData.license_expiry) : undefined,
    // Ownership details
    ownershipType: propertyData.ownership_type,
    companyName: propertyData.company_name
  };
};

// Transform tenant data to simplified format (updated for new schema)
// Note: This function now expects rent status to be calculated externally using RentPaymentService
export const transformToSimplifiedTenant = (
  tenant: any, 
  propertyInfo?: any,
  rentStatusResult?: { status: 'current' | 'overdue'; daysOverdue?: number }
): SimplifiedTenant => {
  // Extract rent status from payment service result or default
  const rentStatus = rentStatusResult?.status || 'current';
  const daysOverdue = rentStatusResult?.daysOverdue;

  // Extract from tenant_data if main columns don't exist (backward compatibility)
  const tenantData = tenant.tenant_data || {};
  // Only set lease dates if they exist - don't default to today/1 year from now
  const leaseStartRaw = tenant.lease_start || tenantData.lease_start_date;
  const leaseEndRaw = tenant.lease_end || tenantData.lease_end_date;
  const leaseStart = leaseStartRaw ? (leaseStartRaw instanceof Date ? leaseStartRaw : new Date(leaseStartRaw)) : undefined;
  const leaseEnd = leaseEndRaw ? (leaseEndRaw instanceof Date ? leaseEndRaw : new Date(leaseEndRaw)) : undefined;
  const monthlyRent = tenant.monthly_rent || tenantData.monthly_rent || 0;
  const rentDueDay = tenant.rent_due_day || 1;
  
  // Parse onboarding data from JSONB column
  const onboardingData = tenant.onboarding_data || null;
  const onboardingCompletedAt = tenant.onboarding_completed_at ? new Date(tenant.onboarding_completed_at) : undefined;

  return {
    id: tenant.id,
    name: tenant.name,
    phone: tenant.phone || '',
    email: tenant.email || '',
    propertyId: tenant.property_id || tenantData.property_id || '',
    propertyAddress: propertyInfo?.address || 'Unknown Property',
    unitNumber: tenantData.unit_number,
    roomId: tenantData.room_id,
    roomName: tenantData.room_name,
    leaseStart: leaseStart,
    leaseEnd: leaseEnd,
    monthlyRent: monthlyRent,
    rentStatus: rentStatus,
    daysOverdue: daysOverdue,
    depositAmount: tenant.deposit_amount || tenantData.deposit_amount || 0,
    depositWeeks: tenant.deposit_weeks || 4,
    onboardingStatus: tenant.onboarding_status || tenantData.onboarding_status || 'not_started',
    onboardingProgress: tenant.onboarding_progress || tenantData.onboarding_progress || 0,
    onboardingNotes: tenant.onboarding_notes || tenantData.onboarding_notes,
    onboardingCompletedAt: onboardingCompletedAt,
    onboardingData: onboardingData,
    rentDueDay: rentDueDay,
  };
};

// Validation functions for residential property constraints
export const validatePropertyData = (property: SimplifiedProperty): string[] => {
  const errors: string[] = [];

  if (!property.address.trim()) {
    errors.push('Property address is required');
  }

  if (property.bedrooms < 0 || property.bedrooms > 10) {
    errors.push('Bedrooms must be between 0 and 10');
  }

  if (property.bathrooms < 0 || property.bathrooms > 5) {
    errors.push('Bathrooms must be between 0 and 5');
  }

  if (property.targetRent < 0) {
    errors.push('Target rent cannot be negative');
  }

  if (property.tenantCount > property.units * 4) {
    errors.push('Too many tenants for the number of units available');
  }

  return errors;
};

export const validateTenantData = (tenant: SimplifiedTenant): string[] => {
  const errors: string[] = [];

  if (!tenant.name.trim()) {
    errors.push('Tenant name is required');
  }

  if (tenant.email && !isValidEmail(tenant.email)) {
    errors.push('Please enter a valid email address');
  }

  if (tenant.phone && !isValidPhone(tenant.phone)) {
    errors.push('Please enter a valid phone number');
  }

  if (tenant.leaseStart && tenant.leaseEnd && tenant.leaseEnd <= tenant.leaseStart) {
    errors.push('Lease end date must be after start date');
  }

  if (tenant.monthlyRent < 0) {
    errors.push('Monthly rent cannot be negative');
  }

  if (tenant.depositAmount < 0) {
    errors.push('Deposit amount cannot be negative');
  }

  return errors;
};

// Helper validation functions
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;
  return phoneRegex.test(phone.replace(/[\s\-\(\)]/g, ''));
};

// Utility to check if tenant assignments don't exceed property capacity
export const validateTenantAssignment = (
  propertyId: string, 
  unitNumber: string | undefined, 
  existingTenants: SimplifiedTenant[], 
  property: SimplifiedProperty
): string[] => {
  const errors: string[] = [];
  
  // Count existing tenants in this property/unit
  const existingInUnit = existingTenants.filter(t => 
    t.propertyId === propertyId && 
    (unitNumber ? t.unitNumber === unitNumber : true)
  ).length;

  // For house shares, allow up to 4 tenants per unit
  const maxTenantsPerUnit = property.propertyType === 'house' ? 4 : 2;
  
  if (existingInUnit >= maxTenantsPerUnit) {
    errors.push(`This ${unitNumber ? 'unit' : 'property'} is already at maximum capacity (${maxTenantsPerUnit} tenants)`);
  }

  return errors;
};

// Helper function to infer occupancy status based on tenant count
export const getOccupancyStatus = (property: SimplifiedProperty, tenants: SimplifiedTenant[]): 'occupied' | 'vacant' => {
  if (property.status === 'sold') {
    return 'vacant'; // Sold properties are considered vacant for landlord purposes
  }
  
  // Safety check: ensure tenants is an array
  const tenantsArray = Array.isArray(tenants) ? tenants : [];
  const propertyTenants = tenantsArray.filter(tenant => tenant.propertyId === property.id);
  return propertyTenants.length > 0 ? 'occupied' : 'vacant';
};

// Helper function to get occupancy display info
export const getOccupancyDisplay = (property: SimplifiedProperty, tenants: SimplifiedTenant[]) => {
  // Safety check: ensure tenants is an array
  const tenantsArray = Array.isArray(tenants) ? tenants : [];
  const propertyTenants = tenantsArray.filter(tenant => tenant.propertyId === property.id);
  
  if (property.status === 'sold') {
    return {
      status: 'sold',
      label: 'Sold',
      color: 'text-gray-700 bg-gray-50 border-gray-200',
      tenantInfo: null
    };
  }
  
  // Special handling for HMO properties
  if (property.propertyType === 'hmo' && property.unitDetails && property.unitDetails.length > 0) {
    const totalUnits = property.unitDetails.length;
    
    // Count unique occupied units (based on roomName field)
    const occupiedUnits = new Set(
      propertyTenants
        .filter(t => t.roomName)
        .map(t => t.roomName)
    ).size;
    
    const vacantUnits = totalUnits - occupiedUnits;
    
    if (occupiedUnits === 0) {
      return {
        status: 'vacant',
        label: 'Vacant',
        color: 'text-yellow-700 bg-yellow-50 border-yellow-200',
        tenantInfo: null,
        occupancyDetails: {
          type: 'hmo',
          totalUnits,
          occupiedUnits: 0,
          vacantUnits: totalUnits
        }
      };
    }
    
    if (occupiedUnits === totalUnits) {
      return {
        status: 'occupied',
        label: `Fully Occupied (${occupiedUnits}/${totalUnits})`,
        color: 'text-green-700 bg-green-50 border-green-200',
        tenantInfo: propertyTenants,
        occupancyDetails: {
          type: 'hmo',
          totalUnits,
          occupiedUnits,
          vacantUnits: 0
        }
      };
    }
    
    // Partially occupied
    return {
      status: 'partially_occupied',
      label: `Partially Occupied (${occupiedUnits}/${totalUnits})`,
      color: 'text-blue-700 bg-blue-50 border-blue-200',
      tenantInfo: propertyTenants,
      occupancyDetails: {
        type: 'hmo',
        totalUnits,
        occupiedUnits,
        vacantUnits
      }
    };
  }
  
  // Standard property (non-HMO)
  const occupancyStatus = getOccupancyStatus(property, tenants);
  
  if (occupancyStatus === 'occupied') {
    return {
      status: 'occupied',
      label: `Occupied (${propertyTenants.length} tenant${propertyTenants.length > 1 ? 's' : ''})`,
      color: 'text-green-700 bg-green-50 border-green-200',
      tenantInfo: propertyTenants
    };
  }
  
  return {
    status: 'vacant',
    label: 'Vacant',
    color: 'text-yellow-700 bg-yellow-50 border-yellow-200',
    tenantInfo: null
  };
};