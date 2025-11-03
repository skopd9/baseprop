# Requirements Document

## Introduction

This feature creates a simplified demo version of the property management system specifically designed for small residential landlords. The demo focuses on managing 8 properties with 20 tenants (including house shares) and emphasizes the core workflows that small landlords need: inspections, repairs, and compliance checklists. The system should be intuitive and easy to use, removing complex features that aren't relevant to small-scale residential property management.

## Requirements

### Requirement 1

**User Story:** As a small residential landlord, I want to see a simplified property overview with minimal essential information, so that I can quickly understand my portfolio without being overwhelmed by unnecessary data.

#### Acceptance Criteria

1. WHEN the landlord logs in THEN the system SHALL display a dashboard showing 8 properties with only essential information (address, property type, tenant count)
2. WHEN viewing property details THEN the system SHALL show only residential-specific fields (bedrooms, bathrooms, property type, rent amount)
3. WHEN displaying tenant information THEN the system SHALL show tenant name, contact details, lease dates, and rent status only
4. IF a property is a house share THEN the system SHALL clearly indicate multiple tenants per property

### Requirement 2

**User Story:** As a small residential landlord, I want tenants to be properly assigned to properties and units, so that I can track who lives where and manage tenant-specific tasks.

#### Acceptance Criteria

1. WHEN viewing a property THEN the system SHALL display all tenants assigned to that property
2. WHEN a property has multiple units THEN the system SHALL show which tenant is assigned to which unit
3. WHEN managing house shares THEN the system SHALL allow multiple tenants to be assigned to the same property
4. WHEN adding a new tenant THEN the system SHALL require assignment to a specific property and unit (if applicable)

### Requirement 3

**User Story:** As a small residential landlord, I want to book and track property inspections, so that I can maintain my properties and ensure tenant compliance.

#### Acceptance Criteria

1. WHEN booking an inspection THEN the system SHALL allow selection of property, inspection type, and date
2. WHEN an inspection is due THEN the system SHALL display it prominently on the dashboard
3. WHEN completing an inspection THEN the system SHALL allow recording of findings and any required actions
4. WHEN viewing inspection history THEN the system SHALL show past inspections with dates and outcomes

### Requirement 4

**User Story:** As a small residential landlord, I want to manage repair requests and maintenance tasks, so that I can keep my properties in good condition and respond to tenant needs.

#### Acceptance Criteria

1. WHEN a repair is needed THEN the system SHALL allow creation of a repair task with property, description, and priority
2. WHEN viewing repairs THEN the system SHALL show status (pending, in progress, completed) and assigned contractor
3. WHEN a repair is completed THEN the system SHALL allow marking as complete with notes and cost
4. WHEN viewing property details THEN the system SHALL show any outstanding repairs for that property

### Requirement 5

**User Story:** As a small residential landlord, I want to manage compliance checklists, so that I can ensure my properties meet legal requirements and safety standards.

#### Acceptance Criteria

1. WHEN viewing compliance THEN the system SHALL show required checks for each property (gas safety, electrical, EPC, etc.)
2. WHEN a compliance check is due THEN the system SHALL highlight it on the dashboard with due date
3. WHEN completing a compliance check THEN the system SHALL allow uploading certificates and setting next due date
4. WHEN viewing compliance history THEN the system SHALL show all past certificates and their expiry dates

### Requirement 6

**User Story:** As a small residential landlord, I want a simple and intuitive interface, so that I can manage my properties efficiently without technical complexity.

#### Acceptance Criteria

1. WHEN navigating the system THEN the interface SHALL use clear, simple language without technical jargon
2. WHEN performing common tasks THEN the system SHALL require no more than 3 clicks to complete
3. WHEN viewing information THEN the system SHALL prioritize the most important data and hide advanced features
4. WHEN using the system THEN all workflows SHALL be optimized for residential property management only