import { SimplifiedProperty, SimplifiedTenant } from '../utils/simplifiedDataTransforms';

// Mock data for 8 residential properties
export const mockSimplifiedProperties: SimplifiedProperty[] = [
  {
    id: 'prop-001',
    address: '123 Oak Street, Manchester M1 2AB',
    propertyType: 'house',
    bedrooms: 4,
    bathrooms: 2,
    targetRent: 2400,
    tenantCount: 4,
    status: 'under_management',
    units: 1
  },
  {
    id: 'prop-002',
    address: '45 Victoria Road, Birmingham B15 3TG',
    propertyType: 'flat',
    bedrooms: 2,
    bathrooms: 1,
    targetRent: 1200,
    tenantCount: 2,
    status: 'under_management',
    units: 1
  },
  {
    id: 'prop-003',
    address: '78 High Street, Leeds LS1 4HY',
    propertyType: 'flat',
    bedrooms: 1,
    bathrooms: 1,
    targetRent: 800,
    tenantCount: 1,
    status: 'under_management',
    units: 1
  },
  {
    id: 'prop-004',
    address: '12 Garden Lane, Liverpool L8 5RT',
    propertyType: 'house',
    bedrooms: 3,
    bathrooms: 2,
    targetRent: 1800,
    tenantCount: 3,
    status: 'under_management',
    units: 1
  },
  {
    id: 'prop-005',
    address: '67 Church Street, Newcastle NE1 6JQ',
    propertyType: 'flat',
    bedrooms: 2,
    bathrooms: 1,
    targetRent: 1100,
    tenantCount: 0,
    status: 'under_management',
    units: 1
  },
  {
    id: 'prop-006',
    address: '34 Mill Road, Sheffield S1 2HX',
    propertyType: 'house',
    bedrooms: 5,
    bathrooms: 3,
    targetRent: 3000,
    tenantCount: 4,
    status: 'under_management',
    units: 1
  },
  {
    id: 'prop-007',
    address: '89 Park Avenue, Bristol BS1 5NR',
    propertyType: 'flat',
    bedrooms: 1,
    bathrooms: 1,
    targetRent: 750,
    tenantCount: 1,
    status: 'under_management',
    units: 1
  },
  {
    id: 'prop-008',
    address: '156 Queen Street, Nottingham NG1 2BL',
    propertyType: 'flat',
    bedrooms: 3,
    bathrooms: 2,
    targetRent: 1600,
    tenantCount: 0,
    status: 'sold',
    units: 1
  }
];

// Mock data for 20 tenants with proper property assignments
export const mockSimplifiedTenants: SimplifiedTenant[] = [
  // Property 1 - House share with 4 tenants
  {
    id: 'tenant-001',
    name: 'Sarah Johnson',
    phone: '07123 456789',
    email: 'sarah.johnson@email.com',
    propertyId: 'prop-001',
    propertyAddress: '123 Oak Street, Manchester M1 2AB',
    unitNumber: 'Room 1',
    leaseStart: new Date('2023-09-01'),
    leaseEnd: new Date('2024-08-31'),
    monthlyRent: 600,
    rentStatus: 'current',
    depositAmount: 600
  },
  {
    id: 'tenant-002',
    name: 'Michael Chen',
    phone: '07234 567890',
    email: 'michael.chen@email.com',
    propertyId: 'prop-001',
    propertyAddress: '123 Oak Street, Manchester M1 2AB',
    unitNumber: 'Room 2',
    leaseStart: new Date('2023-09-01'),
    leaseEnd: new Date('2024-08-31'),
    monthlyRent: 600,
    rentStatus: 'current',
    depositAmount: 600
  },
  {
    id: 'tenant-003',
    name: 'Emma Williams',
    phone: '07345 678901',
    email: 'emma.williams@email.com',
    propertyId: 'prop-001',
    propertyAddress: '123 Oak Street, Manchester M1 2AB',
    unitNumber: 'Room 3',
    leaseStart: new Date('2023-10-15'),
    leaseEnd: new Date('2024-10-14'),
    monthlyRent: 600,
    rentStatus: 'overdue',
    depositAmount: 600
  },
  {
    id: 'tenant-004',
    name: 'James Brown',
    phone: '07456 789012',
    email: 'james.brown@email.com',
    propertyId: 'prop-001',
    propertyAddress: '123 Oak Street, Manchester M1 2AB',
    unitNumber: 'Room 4',
    leaseStart: new Date('2023-11-01'),
    leaseEnd: new Date('2024-10-31'),
    monthlyRent: 600,
    rentStatus: 'paid',
    depositAmount: 600
  },
  
  // Property 2 - Couple
  {
    id: 'tenant-005',
    name: 'David & Lisa Thompson',
    phone: '07567 890123',
    email: 'thompson.couple@email.com',
    propertyId: 'prop-002',
    propertyAddress: '45 Victoria Road, Birmingham B15 3TG',
    leaseStart: new Date('2023-06-01'),
    leaseEnd: new Date('2024-05-31'),
    monthlyRent: 1200,
    rentStatus: 'current',
    depositAmount: 1200
  },
  
  // Property 3 - Single tenant
  {
    id: 'tenant-006',
    name: 'Rachel Green',
    phone: '07678 901234',
    email: 'rachel.green@email.com',
    propertyId: 'prop-003',
    propertyAddress: '78 High Street, Leeds LS1 4HY',
    leaseStart: new Date('2023-08-15'),
    leaseEnd: new Date('2024-08-14'),
    monthlyRent: 800,
    rentStatus: 'current',
    depositAmount: 800
  },
  
  // Property 4 - House share with 3 tenants
  {
    id: 'tenant-007',
    name: 'Tom Wilson',
    phone: '07789 012345',
    email: 'tom.wilson@email.com',
    propertyId: 'prop-004',
    propertyAddress: '12 Garden Lane, Liverpool L8 5RT',
    unitNumber: 'Room 1',
    leaseStart: new Date('2023-07-01'),
    leaseEnd: new Date('2024-06-30'),
    monthlyRent: 600,
    rentStatus: 'current',
    depositAmount: 600
  },
  {
    id: 'tenant-008',
    name: 'Sophie Davis',
    phone: '07890 123456',
    email: 'sophie.davis@email.com',
    propertyId: 'prop-004',
    propertyAddress: '12 Garden Lane, Liverpool L8 5RT',
    unitNumber: 'Room 2',
    leaseStart: new Date('2023-07-01'),
    leaseEnd: new Date('2024-06-30'),
    monthlyRent: 600,
    rentStatus: 'paid',
    depositAmount: 600
  },
  {
    id: 'tenant-009',
    name: 'Alex Martinez',
    phone: '07901 234567',
    email: 'alex.martinez@email.com',
    propertyId: 'prop-004',
    propertyAddress: '12 Garden Lane, Liverpool L8 5RT',
    unitNumber: 'Room 3',
    leaseStart: new Date('2023-09-15'),
    leaseEnd: new Date('2024-09-14'),
    monthlyRent: 600,
    rentStatus: 'overdue',
    depositAmount: 600
  },
  
  // Property 6 - Large house share with 4 tenants
  {
    id: 'tenant-010',
    name: 'Oliver Taylor',
    phone: '07012 345678',
    email: 'oliver.taylor@email.com',
    propertyId: 'prop-006',
    propertyAddress: '34 Mill Road, Sheffield S1 2HX',
    unitNumber: 'Room 1',
    leaseStart: new Date('2023-05-01'),
    leaseEnd: new Date('2024-04-30'),
    monthlyRent: 750,
    rentStatus: 'current',
    depositAmount: 750
  },
  {
    id: 'tenant-011',
    name: 'Grace Anderson',
    phone: '07123 456789',
    email: 'grace.anderson@email.com',
    propertyId: 'prop-006',
    propertyAddress: '34 Mill Road, Sheffield S1 2HX',
    unitNumber: 'Room 2',
    leaseStart: new Date('2023-05-01'),
    leaseEnd: new Date('2024-04-30'),
    monthlyRent: 750,
    rentStatus: 'current',
    depositAmount: 750
  },
  {
    id: 'tenant-012',
    name: 'Harry Jackson',
    phone: '07234 567890',
    email: 'harry.jackson@email.com',
    propertyId: 'prop-006',
    propertyAddress: '34 Mill Road, Sheffield S1 2HX',
    unitNumber: 'Room 3',
    leaseStart: new Date('2023-08-01'),
    leaseEnd: new Date('2024-07-31'),
    monthlyRent: 750,
    rentStatus: 'paid',
    depositAmount: 750
  },
  {
    id: 'tenant-013',
    name: 'Chloe White',
    phone: '07345 678901',
    email: 'chloe.white@email.com',
    propertyId: 'prop-006',
    propertyAddress: '34 Mill Road, Sheffield S1 2HX',
    unitNumber: 'Room 4',
    leaseStart: new Date('2023-10-01'),
    leaseEnd: new Date('2024-09-30'),
    monthlyRent: 750,
    rentStatus: 'current',
    depositAmount: 750
  },
  
  // Property 7 - Single tenant
  {
    id: 'tenant-014',
    name: 'Ben Clark',
    phone: '07456 789012',
    email: 'ben.clark@email.com',
    propertyId: 'prop-007',
    propertyAddress: '89 Park Avenue, Bristol BS1 5NR',
    leaseStart: new Date('2023-04-01'),
    leaseEnd: new Date('2024-03-31'),
    monthlyRent: 750,
    rentStatus: 'current',
    depositAmount: 750
  }
];

// Residential workflow templates for inspections, repairs, and compliance
export interface ResidentialWorkflowTemplate {
  id: string;
  name: string;
  category: 'inspection' | 'repair' | 'compliance';
  description: string;
  stages: ResidentialWorkflowStage[];
  estimatedDuration: number; // in days
}

export interface ResidentialWorkflowStage {
  id: string;
  name: string;
  description: string;
  requiredFields: string[];
  assigneeType: 'landlord' | 'contractor' | 'tenant';
  order: number;
}

export const mockResidentialWorkflowTemplates: ResidentialWorkflowTemplate[] = [
  {
    id: 'inspection-routine',
    name: 'Routine Property Inspection',
    category: 'inspection',
    description: 'Regular property inspection to check condition and maintenance needs',
    estimatedDuration: 1,
    stages: [
      {
        id: 'schedule',
        name: 'Schedule Inspection',
        description: 'Book inspection date with tenant',
        requiredFields: ['inspection_date', 'tenant_notified', 'access_arranged'],
        assigneeType: 'landlord',
        order: 1
      },
      {
        id: 'conduct',
        name: 'Conduct Inspection',
        description: 'Perform the property inspection',
        requiredFields: ['condition_rating', 'issues_found', 'photos_taken', 'tenant_present'],
        assigneeType: 'landlord',
        order: 2
      },
      {
        id: 'report',
        name: 'Complete Report',
        description: 'Document findings and any required actions',
        requiredFields: ['inspection_report', 'action_items', 'next_inspection_date'],
        assigneeType: 'landlord',
        order: 3
      }
    ]
  },
  {
    id: 'repair-general',
    name: 'General Repair Request',
    category: 'repair',
    description: 'Handle general maintenance and repair requests',
    estimatedDuration: 7,
    stages: [
      {
        id: 'log',
        name: 'Log Repair Request',
        description: 'Record the repair issue and assess urgency',
        requiredFields: ['issue_description', 'urgency_level', 'reported_by', 'photos'],
        assigneeType: 'landlord',
        order: 1
      },
      {
        id: 'quote',
        name: 'Get Quotes',
        description: 'Obtain quotes from contractors',
        requiredFields: ['contractor_contacted', 'quote_received', 'estimated_cost'],
        assigneeType: 'landlord',
        order: 2
      },
      {
        id: 'approve',
        name: 'Approve Work',
        description: 'Approve the repair work and schedule',
        requiredFields: ['work_approved', 'contractor_selected', 'scheduled_date'],
        assigneeType: 'landlord',
        order: 3
      },
      {
        id: 'complete',
        name: 'Complete Repair',
        description: 'Verify work completion and quality',
        requiredFields: ['work_completed', 'quality_check', 'final_cost', 'tenant_satisfied'],
        assigneeType: 'contractor',
        order: 4
      }
    ]
  },
  {
    id: 'compliance-gas',
    name: 'Gas Safety Certificate',
    category: 'compliance',
    description: 'Annual gas safety inspection and certification',
    estimatedDuration: 3,
    stages: [
      {
        id: 'book',
        name: 'Book Gas Engineer',
        description: 'Schedule gas safety inspection',
        requiredFields: ['engineer_booked', 'inspection_date', 'tenant_notified'],
        assigneeType: 'landlord',
        order: 1
      },
      {
        id: 'inspect',
        name: 'Gas Safety Inspection',
        description: 'Conduct gas safety check',
        requiredFields: ['inspection_completed', 'safety_status', 'issues_found'],
        assigneeType: 'contractor',
        order: 2
      },
      {
        id: 'certificate',
        name: 'Issue Certificate',
        description: 'Receive and file gas safety certificate',
        requiredFields: ['certificate_received', 'expiry_date', 'tenant_copy_provided'],
        assigneeType: 'landlord',
        order: 3
      }
    ]
  },
  {
    id: 'compliance-electrical',
    name: 'Electrical Safety Certificate',
    category: 'compliance',
    description: '5-year electrical safety inspection and certification',
    estimatedDuration: 5,
    stages: [
      {
        id: 'book',
        name: 'Book Electrician',
        description: 'Schedule electrical safety inspection',
        requiredFields: ['electrician_booked', 'inspection_date', 'tenant_notified'],
        assigneeType: 'landlord',
        order: 1
      },
      {
        id: 'inspect',
        name: 'Electrical Inspection',
        description: 'Conduct electrical safety check',
        requiredFields: ['inspection_completed', 'safety_status', 'remedial_work_needed'],
        assigneeType: 'contractor',
        order: 2
      },
      {
        id: 'certificate',
        name: 'Issue Certificate',
        description: 'Receive and file electrical safety certificate',
        requiredFields: ['certificate_received', 'expiry_date', 'tenant_copy_provided'],
        assigneeType: 'landlord',
        order: 3
      }
    ]
  }
];

// Calculate summary statistics for the demo
export const getDemoSummaryStats = () => {
  const totalProperties = mockSimplifiedProperties.length;
  const totalTenants = mockSimplifiedTenants.length;
  const occupiedProperties = mockSimplifiedProperties.filter(p => p.status === 'occupied').length;
  const vacantProperties = mockSimplifiedProperties.filter(p => p.status === 'vacant').length;
  const maintenanceProperties = mockSimplifiedProperties.filter(p => p.status === 'maintenance').length;
  
  const totalMonthlyRent = mockSimplifiedTenants.reduce((sum, tenant) => sum + tenant.monthlyRent, 0);
  const overdueRent = mockSimplifiedTenants.filter(t => t.rentStatus === 'overdue').length;
  
  const leasesExpiringIn3Months = mockSimplifiedTenants.filter(tenant => {
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return tenant.leaseEnd <= threeMonthsFromNow;
  }).length;

  return {
    totalProperties,
    totalTenants,
    occupiedProperties,
    vacantProperties,
    maintenanceProperties,
    totalMonthlyRent,
    overdueRent,
    leasesExpiringIn3Months,
    occupancyRate: Math.round((occupiedProperties / totalProperties) * 100)
  };
};