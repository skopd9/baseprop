# Design Document

## Overview

The simplified landlord demo transforms the existing complex property management system into a streamlined, user-friendly interface specifically designed for small residential landlords managing 8 properties with 20 tenants. The design focuses on essential workflows (inspections, repairs, compliance) while removing commercial real estate complexity and advanced features that aren't relevant to small-scale residential management.

## Architecture

### Data Model Simplification

The design leverages the existing database schema but simplifies the data presentation and input forms:

- **Properties**: Reduced to essential residential fields (bedrooms, bathrooms, property type, rent amount)
- **Tenants**: Streamlined to basic contact information and lease details
- **Units**: Clear assignment of tenants to properties/units, with support for house shares
- **Workflows**: Focused on residential-specific processes (inspections, repairs, compliance)

### Component Architecture

```
SimplifiedLandlordApp
├── SimplifiedDashboard
├── SimplifiedPropertiesView
│   ├── ResidentialPropertiesTable
│   └── PropertyTenantAssignments
├── SimplifiedTenantsView
│   ├── ResidentialTenantsTable
│   └── TenantPropertyAssignments
├── ResidentialWorkflowsView
│   ├── InspectionWorkflows
│   ├── RepairWorkflows
│   └── ComplianceWorkflows
└── SimplifiedNavigation
```

## Components and Interfaces

### 1. SimplifiedDashboard Component

**Purpose**: Provide an at-a-glance overview optimized for small landlords

**Key Features**:
- Property count (8 properties)
- Tenant count (20 tenants)
- Upcoming inspections
- Outstanding repairs
- Compliance items due
- Simple property map view

**Interface**:
```typescript
interface SimplifiedDashboardProps {
  properties: ResidentialProperty[];
  tenants: ResidentialTenant[];
  upcomingTasks: Task[];
}
```

### 2. ResidentialPropertiesTable Component

**Purpose**: Display properties with residential-specific information only

**Simplified Fields**:
- Property ID
- Address
- Property Type (House, Apartment, Flat)
- Bedrooms/Bathrooms
- Tenant Count
- Monthly Rent
- Status

**Interface**:
```typescript
interface ResidentialProperty {
  id: string;
  address: string;
  propertyType: 'house' | 'apartment' | 'flat';
  bedrooms: number;
  bathrooms: number;
  monthlyRent: number;
  tenantCount: number;
  status: 'occupied' | 'vacant' | 'maintenance';
}
```

### 3. ResidentialTenantsTable Component

**Purpose**: Display tenants with clear property assignments

**Simplified Fields**:
- Tenant Name
- Contact Details (Phone, Email)
- Property Address
- Unit Number (if applicable)
- Lease Start/End Dates
- Rent Status

**Interface**:
```typescript
interface ResidentialTenant {
  id: string;
  name: string;
  phone: string;
  email: string;
  propertyId: string;
  unitNumber?: string;
  leaseStart: Date;
  leaseEnd: Date;
  rentStatus: 'current' | 'overdue' | 'paid';
}
```

### 4. Residential Workflow Components

#### InspectionWorkflows Component
- Book routine inspections
- Schedule move-in/move-out inspections
- Record inspection findings
- Generate simple inspection reports

#### RepairWorkflows Component
- Log repair requests
- Assign to contractors
- Track repair status
- Record completion and costs

#### ComplianceWorkflows Component
- Track gas safety certificates
- Monitor electrical inspections
- Manage EPC certificates
- Handle deposit protection compliance

## Data Models

### Simplified Property Model
```typescript
interface SimplifiedPropertyData {
  // Essential residential fields only
  propertyType: 'house' | 'apartment' | 'flat';
  bedrooms: number;
  bathrooms: number;
  monthlyRent: number;
  furnished: boolean;
  parkingSpaces: number;
  gardenAccess: boolean;
}
```

### Simplified Tenant Model
```typescript
interface SimplifiedTenantData {
  // Basic contact and lease information
  emergencyContact: {
    name: string;
    phone: string;
    relationship: string;
  };
  employmentStatus: string;
  monthlyIncome: number;
  depositAmount: number;
  depositScheme: string;
}
```

### Residential Workflow Templates
```typescript
interface ResidentialWorkflowTemplate {
  id: string;
  name: string;
  category: 'inspection' | 'repair' | 'compliance';
  stages: ResidentialWorkflowStage[];
  estimatedDuration: number; // in days
}

interface ResidentialWorkflowStage {
  name: string;
  description: string;
  requiredFields: string[];
  assigneeType: 'landlord' | 'contractor' | 'tenant';
}
```

## Error Handling

### User-Friendly Error Messages
- Replace technical database errors with plain English
- Provide clear guidance on how to resolve issues
- Use contextual help tooltips for form fields

### Validation Rules
- Ensure tenant assignments don't exceed property capacity
- Validate lease dates don't overlap for same unit
- Check required compliance certificates are not expired

### Graceful Degradation
- Show simplified views if complex data is missing
- Provide default values for optional fields
- Allow partial data entry with save-as-draft functionality

## Testing Strategy

### Unit Testing
- Test simplified data transformations
- Validate residential-specific business rules
- Test tenant-property assignment logic

### Integration Testing
- Test workflow creation for residential scenarios
- Validate data persistence with simplified models
- Test navigation between simplified views

### User Acceptance Testing
- Test with actual small landlords
- Validate workflow efficiency for common tasks
- Ensure interface is intuitive without training

### Performance Testing
- Ensure fast loading with 8 properties and 20 tenants
- Test responsive design on mobile devices
- Validate quick task completion (3-click rule)

## Implementation Approach

### Phase 1: Data Layer Simplification
- Create data transformation utilities
- Implement simplified property/tenant models
- Set up residential workflow templates

### Phase 2: UI Component Development
- Build simplified dashboard
- Create residential-focused tables
- Implement streamlined forms

### Phase 3: Workflow Integration
- Integrate inspection workflows
- Add repair management
- Implement compliance tracking

### Phase 4: Polish and Optimization
- Add contextual help
- Optimize for mobile use
- Implement user onboarding

## Design Decisions and Rationales

### 1. Reuse Existing Database Schema
**Decision**: Keep the existing database structure but simplify the UI layer
**Rationale**: Minimizes development time while allowing future expansion

### 2. Hide Advanced Features
**Decision**: Remove commercial real estate features from the UI
**Rationale**: Reduces cognitive load for small residential landlords

### 3. Tenant-Property Assignment Focus
**Decision**: Make tenant assignments prominent in all views
**Rationale**: Critical for house share management and rent collection

### 4. Mobile-First Design
**Decision**: Optimize for mobile and tablet use
**Rationale**: Small landlords often work on-the-go and use mobile devices

### 5. 3-Click Rule Implementation
**Decision**: Ensure all common tasks can be completed in 3 clicks or less
**Rationale**: Improves efficiency and reduces user frustration

### 6. Contextual Help Integration
**Decision**: Add inline help and tooltips throughout the interface
**Rationale**: Reduces learning curve for non-technical users