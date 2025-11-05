// =====================================================
// UK Landlord Property Management Types
// Simplified for small retail landlords
// =====================================================

import { CountryCode } from '../lib/countries';

// =====================================================
// USER TYPES
// =====================================================

export type UserType = 'direct_landlord' | 'agent_using_landlord' | 'property_manager';

export interface UserPreferences {
  id: string;
  userEmail: string;
  countryCode: CountryCode;
  userType: UserType;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// AGENT TYPES
// =====================================================

export interface Agent {
  id: string;
  name: string;
  companyName?: string;
  email?: string;
  phone?: string;
  address?: string;
  servicesTenantFinding: boolean;
  servicesRentCollection: boolean;
  servicesPropertyManagement: boolean;
  servicesMaintenance: boolean;
  commissionPercentage?: number;
  monthlyManagementFee?: number;
  contractStartDate?: string;
  contractEndDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// PROPERTY TYPES
// =====================================================

export type PropertyType = 'house' | 'flat' | 'hmo' | 'studio' | 'other';
export type PropertyStatus = 'vacant' | 'occupied' | 'partially_occupied' | 'maintenance' | 'sold';

export interface HMOUnit {
  name: string;
  area: number; // square meters
  targetRent: number;
}

// Occupancy tracking for properties (especially HMOs)
export interface PropertyOccupancy {
  type: 'standard' | 'hmo';
  totalCapacity: number; // For HMO: number of units, for standard: 1
  occupiedCount: number;
  vacantCount?: number; // Only for HMOs
  occupancyRate: number; // Percentage
  vacancyRate: number; // Percentage
  occupancyStatus: 'vacant' | 'occupied' | 'partially_occupied';
}

export interface Property {
  id: string;
  propertyReference: number; // Auto-incrementing reference: 1, 2, 3, etc.
  countryCode: CountryCode;
  
  // Address
  address: string;
  addressLine2?: string;
  city?: string;
  countyState?: string;
  postcode?: string;
  
  // Property Details
  propertyType: PropertyType;
  bedrooms?: number;
  bathrooms?: number;
  squareMeters?: number;
  
  // HMO
  isHMO: boolean;
  hmoLicenseNumber?: string;
  hmoLicenseExpiry?: string;
  units?: HMOUnit[];
  
  // UK-Specific
  councilTaxBand?: string;
  councilTaxAnnual?: number;
  
  // Financial
  purchasePrice?: number;
  purchaseDate?: string;
  currentValue?: number;
  monthlyRent?: number;
  
  // Agent
  agentId?: string;
  agentManaged: boolean;
  
  // Status
  status: PropertyStatus;
  tenantCount: number;
  
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// TENANT TYPES
// =====================================================

export type TenantStatus = 'active' | 'inactive' | 'notice_given' | 'eviction';

export interface Tenant {
  id: string;
  propertyId: string;
  countryCode: CountryCode;
  
  // Personal Info
  name: string;
  email?: string;
  phone?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  
  // HMO-Specific: which unit/room this tenant occupies
  hmoUnitName?: string;
  
  // UK-Specific
  rightToRentChecked: boolean;
  rightToRentCheckDate?: string;
  rightToRentExpiry?: string;
  
  // Tenancy
  leaseStart?: string;
  leaseEnd?: string;
  monthlyRent?: number;
  rentDueDay: number;
  
  // Deposit
  depositAmount?: number;
  depositScheme?: string;
  depositProtectedDate?: string;
  depositCertificateNumber?: string;
  
  // Agent
  foundViaAgentId?: string;
  
  // Status
  status: TenantStatus;
  notes?: string;
  
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// RENT PAYMENT TYPES
// =====================================================

export type RentPaymentStatus = 'pending' | 'paid' | 'late' | 'partial' | 'missed';

export interface RentPayment {
  id: string;
  tenantId: string;
  propertyId: string;
  
  paymentDate: string;
  dueDate: string;
  amountDue: number;
  amountPaid?: number;
  
  status: RentPaymentStatus;
  paymentMethod?: string;
  paymentReference?: string;
  notes?: string;
  
  // Payment period fields
  paymentFrequency?: 'monthly' | 'quarterly' | 'annual';
  periodStart?: string;
  periodEnd?: string;
  isProRated?: boolean;
  proRateDays?: number;
  invoiceNumber?: string;
  invoiceGeneratedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// COMPLIANCE TYPES
// =====================================================

export type ComplianceStatus = 'valid' | 'expiring_soon' | 'expired' | 'not_required' | 'pending';

// UK Compliance Types
export type UKComplianceType = 
  | 'gas_safety'
  | 'eicr'
  | 'epc'
  | 'deposit_protection'
  | 'right_to_rent'
  | 'legionella'
  | 'smoke_alarms'
  | 'co_alarms'
  | 'fire_safety_hmo'
  | 'hmo_license';

// Greece Compliance Types (Placeholder)
export type GreeceComplianceType =
  | 'epc_greece'
  | 'building_permit'
  | 'tax_clearance';

// USA Compliance Types (Placeholder)
export type USAComplianceType =
  | 'lead_paint'
  | 'smoke_detectors_us'
  | 'local_permits';

export type ComplianceType = UKComplianceType | GreeceComplianceType | USAComplianceType;

export interface ComplianceCertificate {
  id: string;
  propertyId: string;
  countryCode: CountryCode;
  
  certificateType: ComplianceType;
  certificateNumber?: string;
  issueDate?: string;
  expiryDate?: string;
  
  status: ComplianceStatus;
  
  contractorName?: string;
  contractorCompany?: string;
  contractorPhone?: string;
  contractorEmail?: string;
  
  documentUrl?: string;
  
  reminderSent: boolean;
  reminderDate?: string;
  
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// INSPECTION TYPES
// =====================================================

export type InspectionType = 'routine' | 'move_in' | 'move_out' | 'maintenance' | 'compliance';
export type InspectionStatus = 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';

export interface Inspection {
  id: string;
  propertyId: string;
  tenantId?: string;
  
  type: InspectionType;
  scheduledDate: string;
  completedDate?: string;
  
  inspectorName?: string;
  inspectorCompany?: string;
  
  status: InspectionStatus;
  
  findings?: string;
  issuesFound?: string[];
  photosUrls?: string[];
  
  requiresFollowup: boolean;
  followupNotes?: string;
  
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// REPAIR TYPES
// =====================================================

export type RepairCategory = 'plumbing' | 'electrical' | 'heating' | 'structural' | 'appliance' | 'other';
export type RepairPriority = 'low' | 'medium' | 'high' | 'urgent';
export type RepairStatus = 'reported' | 'acknowledged' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';

export interface Repair {
  id: string;
  propertyId: string;
  tenantId?: string;
  
  title: string;
  description?: string;
  category?: RepairCategory;
  
  priority: RepairPriority;
  status: RepairStatus;
  
  reportedDate: string;
  scheduledDate?: string;
  completedDate?: string;
  
  contractorName?: string;
  contractorCompany?: string;
  contractorPhone?: string;
  
  estimatedCost?: number;
  actualCost?: number;
  
  isEmergency: boolean;
  
  photosUrls?: string[];
  invoiceUrl?: string;
  
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// EXPENSE TYPES
// =====================================================

export type ExpenseCategory = 
  | 'maintenance'
  | 'insurance'
  | 'property_tax'
  | 'mortgage'
  | 'agent_fees'
  | 'utilities'
  | 'other';

export interface Expense {
  id: string;
  propertyId: string;
  
  description: string;
  category: ExpenseCategory;
  amount: number;
  expenseDate: string;
  
  isTaxDeductible: boolean;
  
  paymentMethod?: string;
  paymentReference?: string;
  
  receiptUrl?: string;
  invoiceUrl?: string;
  
  repairId?: string;
  
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// SIMPLIFIED WORKFLOW TYPES (For standard templates)
// =====================================================

export type WorkflowType = 
  | 'property_onboarding'
  | 'tenant_onboarding'
  | 'tenancy_end'
  | 'compliance_renewal';

export type WorkflowStatus = 'not_started' | 'in_progress' | 'completed' | 'cancelled';

export interface WorkflowStep {
  id: string;
  name: string;
  description: string;
  completed: boolean;
  completedDate?: string;
  dueDate?: string;
  notes?: string;
}

export interface SimpleWorkflow {
  id: string;
  propertyId?: string;
  tenantId?: string;
  
  workflowType: WorkflowType;
  status: WorkflowStatus;
  
  steps: WorkflowStep[];
  currentStepIndex: number;
  
  startedAt?: string;
  completedAt?: string;
  
  createdAt: string;
  updatedAt: string;
}

// =====================================================
// DASHBOARD TYPES
// =====================================================

export interface DashboardStats {
  totalProperties: number;
  occupiedProperties: number;
  vacantProperties: number;
  totalTenants: number;
  monthlyRentTotal: number;
  overdueRentCount: number;
  upcomingInspections: number;
  expiringCompliance: number;
  pendingRepairs: number;
}

// =====================================================
// NOTIFICATION TYPES
// =====================================================

export type NotificationType = 
  | 'rent_overdue'
  | 'rent_due_soon'
  | 'compliance_expiring'
  | 'compliance_expired'
  | 'inspection_due'
  | 'repair_urgent'
  | 'lease_ending'
  | 'general';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  propertyId?: string;
  tenantId?: string;
  complianceId?: string;
  read: boolean;
  createdAt: string;
}

// =====================================================
// HELPER TYPES
// =====================================================

export interface Address {
  line1: string;
  line2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
}

export interface ContactInfo {
  name: string;
  email?: string;
  phone?: string;
  address?: string;
}

export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface FilterOptions {
  countryCode?: CountryCode;
  propertyType?: PropertyType;
  status?: PropertyStatus | TenantStatus;
  dateRange?: DateRange;
}
