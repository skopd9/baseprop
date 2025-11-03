import { Property } from '../types';

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
  propertyName?: string; // Optional friendly name for the property
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
  leaseStart: Date;
  leaseEnd: Date;
  monthlyRent: number;
  rentStatus: 'current' | 'overdue';
  daysOverdue?: number;
  depositAmount: number;
  onboardingStatus?: 'not_started' | 'in_progress' | 'completed';
  onboardingProgress?: number;
  onboardingNotes?: string;
  rentDueDay?: number; // Day of month rent is due
}

// Transform property data to simplified residential format (updated for new schema)
export const transformToSimplifiedProperty = (property: any, actualTenantCount?: number): SimplifiedProperty => {
  // NEW SCHEMA: Uses regular columns instead of JSONB property_data
  
  // Map property types to simplified residential types
  const getSimplifiedPropertyType = (type: string, isHMO: boolean): 'house' | 'flat' | 'hmo' => {
    if (isHMO) return 'hmo';
    if (type === 'house') return 'house';
    if (type === 'flat' || type === 'studio') return 'flat';
    return 'flat';
  };

  // Determine property status (simplified)
  const getPropertyStatus = (status: string): 'under_management' | 'sold' => {
    if (status === 'sold') return 'sold';
    return 'under_management';
  };

  // Use actual tenant count if provided, otherwise fall back to stored count
  const tenantCount = actualTenantCount !== undefined ? actualTenantCount : (property.tenant_count || 0);
  
  // Parse HMO units if present (stored as JSONB in new schema)
  const hmoUnits = property.units ? (Array.isArray(property.units) ? property.units : JSON.parse(property.units)) : [];
  const totalUnits = Array.isArray(hmoUnits) && hmoUnits.length > 0 ? hmoUnits.length : 1;

  return {
    id: property.id,
    propertyName: property.name,
    address: property.address,
    propertyType: getSimplifiedPropertyType(
      property.property_type || 'flat', 
      property.is_hmo || false
    ),
    bedrooms: property.bedrooms || 2,
    bathrooms: property.bathrooms || 1,
    targetRent: property.monthly_rent || 1500,
    purchasePrice: property.purchase_price,
    salesPrice: null, // Not in new schema yet, can add if needed
    tenantCount,
    status: getPropertyStatus(property.status || 'vacant'),
    units: totalUnits,
    unitDetails: hmoUnits.length > 0 ? hmoUnits : undefined,
    // Enhanced property details
    totalArea: property.square_meters,
    yearBuilt: undefined, // Can add to schema if needed
    furnished: 'unfurnished', // Can add to schema if needed
    parking: 'none', // Can add to schema if needed
    garden: false, // Can add to schema if needed
    // HMO specific details
    rooms: [], // Can populate from units if needed
    maxOccupancy: hmoUnits.length,
    licenseRequired: property.is_hmo || false,
    licenseNumber: property.hmo_license_number,
    licenseExpiry: property.hmo_license_expiry ? new Date(property.hmo_license_expiry) : undefined
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
  const leaseStart = tenant.lease_start || tenantData.lease_start_date || new Date();
  const leaseEnd = tenant.lease_end || tenantData.lease_end_date || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
  const monthlyRent = tenant.monthly_rent || tenantData.monthly_rent || 0;
  const rentDueDay = tenant.rent_due_day || 1;

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
    leaseStart: leaseStart instanceof Date ? leaseStart : new Date(leaseStart),
    leaseEnd: leaseEnd instanceof Date ? leaseEnd : new Date(leaseEnd),
    monthlyRent: monthlyRent,
    rentStatus: rentStatus,
    daysOverdue: daysOverdue,
    depositAmount: tenant.deposit_amount || tenantData.deposit_amount || 0,
    onboardingStatus: tenantData.onboarding_status || 'not_started',
    onboardingProgress: tenantData.onboarding_progress || 0,
    onboardingNotes: tenantData.onboarding_notes,
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

  if (property.monthlyRent < 0) {
    errors.push('Monthly rent cannot be negative');
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

  if (tenant.leaseEnd <= tenant.leaseStart) {
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
  const occupancyStatus = getOccupancyStatus(property, tenants);
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