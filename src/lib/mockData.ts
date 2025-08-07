import { Property, WorkflowTemplate, WorkflowInstance, Workstream, WorkflowStage } from '../types';

export const mockProperties: Property[] = [
  {
    id: '1',
    asset_register_id: '001',
    name: 'Sunset Plaza',
    address: '1234 Sunset Blvd, Los Angeles, CA 90210',
    property_type: 'stand_alone_buildings',
    property_sub_type: 'commercial office',
    latitude: 34.0522, // Los Angeles coordinates
    longitude: -118.2437,
    municipality: 'Los Angeles',
    postal_code: '90210',
    square_feet: 25000,
    units: 15,
    floors: 5,
    year_built: 2018,
    acquisition_date: '2023-01-15',
    acquisition_price: 8500000,
    current_value: 9200000,
    status: 'active',
    created_at: '2023-01-15T00:00:00Z',
    updated_at: '2023-01-15T00:00:00Z'
  },
  {
    id: '2',
    asset_register_id: '002',
    name: 'Riverside Apartments',
    address: '5678 Riverside Dr, Austin, TX 78701',
    property_type: 'horizontal_properties',
    property_sub_type: 'apartment complex',
    latitude: 30.2672, // Austin coordinates
    longitude: -97.7431,
    municipality: 'Austin',
    postal_code: '78701',
    square_feet: 18000,
    units: 24,
    floors: 3,
    year_built: 2020,
    acquisition_date: '2023-03-20',
    acquisition_price: 4200000,
    current_value: 4500000,
    status: 'active',
    created_at: '2023-03-20T00:00:00Z',
    updated_at: '2023-03-20T00:00:00Z'
  },
  {
    id: '3',
    asset_register_id: '003',
    name: 'Downtown Office Tower',
    address: '999 Main St, Chicago, IL 60601',
    property_type: 'stand_alone_buildings',
    property_sub_type: 'office tower',
    latitude: 41.8781, // Chicago coordinates
    longitude: -87.6298,
    municipality: 'Chicago',
    postal_code: '60601',
    square_feet: 45000,
    units: 8,
    floors: 12,
    year_built: 2015,
    acquisition_date: '2022-11-10',
    acquisition_price: 12500000,
    current_value: 13200000,
    status: 'active',
    created_at: '2022-11-10T00:00:00Z',
    updated_at: '2022-11-10T00:00:00Z'
  },
  {
    id: '4',
    asset_register_id: '004',
    name: 'Miami Beach Resort',
    address: '2000 Ocean Drive, Miami Beach, FL 33139',
    property_type: 'stand_alone_buildings',
    property_sub_type: 'hotel resort',
    latitude: 25.7617, // Miami Beach coordinates
    longitude: -80.1918,
    municipality: 'Miami Beach',
    postal_code: '33139',
    square_feet: 75000,
    units: 50,
    floors: 8,
    year_built: 2019,
    acquisition_date: '2023-06-15',
    acquisition_price: 18500000,
    current_value: 19800000,
    status: 'active',
    created_at: '2023-06-15T00:00:00Z',
    updated_at: '2023-06-15T00:00:00Z'
  },
  {
    id: '5',
    asset_register_id: '005',
    name: 'Seattle Tech Campus',
    address: '4500 Tech Way, Seattle, WA 98109',
    property_type: 'horizontal_properties',
    property_sub_type: 'tech campus',
    latitude: 47.6062, // Seattle coordinates
    longitude: -122.3321,
    municipality: 'Seattle',
    postal_code: '98109',
    square_feet: 120000,
    units: 25,
    floors: 4,
    year_built: 2021,
    acquisition_date: '2023-09-10',
    acquisition_price: 25000000,
    current_value: 26500000,
    status: 'active',
    created_at: '2023-09-10T00:00:00Z',
    updated_at: '2023-09-10T00:00:00Z'
  }
];



const createMockStages = (workstreamName: string): WorkflowStage[] => {
  const stageTemplates = {
    'Due Diligence': [
      { name: 'Property Inspection', description: 'Conduct thorough property inspection', order: 1, estimated_duration_days: 7 },
      { name: 'Financial Analysis', description: 'Analyze financial statements and projections', order: 2, estimated_duration_days: 5 },
      { name: 'Environmental Review', description: 'Conduct environmental assessment', order: 3, estimated_duration_days: 10 }
    ],
    'Financing': [
      { name: 'Lender Selection', description: 'Identify and select financing partners', order: 1, estimated_duration_days: 3 },
      { name: 'Loan Application', description: 'Submit loan application and documentation', order: 2, estimated_duration_days: 7 },
      { name: 'Underwriting', description: 'Lender underwriting process', order: 3, estimated_duration_days: 14 }
    ],
    'Legal': [
      { name: 'Contract Review', description: 'Review purchase agreement', order: 1, estimated_duration_days: 5 },
      { name: 'Title Search', description: 'Conduct title search and review', order: 2, estimated_duration_days: 7 },
      { name: 'Closing Preparation', description: 'Prepare closing documents', order: 3, estimated_duration_days: 3 }
    ],
    'Marketing': [
      { name: 'Market Research', description: 'Analyze local market conditions', order: 1, estimated_duration_days: 3 },
      { name: 'Marketing Materials', description: 'Create marketing materials and listings', order: 2, estimated_duration_days: 5 },
      { name: 'Tenant Outreach', description: 'Reach out to potential tenants', order: 3, estimated_duration_days: 14 }
    ],
    'Market Research': [
      { name: 'Comparable Sales Analysis', description: 'Research recent comparable property sales', order: 1, estimated_duration_days: 5 },
      { name: 'Market Trends Analysis', description: 'Analyze current market trends and conditions', order: 2, estimated_duration_days: 3 },
      { name: 'Zoning and Development Research', description: 'Research zoning regulations and future development plans', order: 3, estimated_duration_days: 4 }
    ],
    'Property Assessment': [
      { name: 'Physical Inspection', description: 'Conduct thorough property inspection', order: 1, estimated_duration_days: 2 },
      { name: 'Condition Assessment', description: 'Assess property condition and required repairs', order: 2, estimated_duration_days: 3 },
      { name: 'Measurement Verification', description: 'Verify property measurements and specifications', order: 3, estimated_duration_days: 1 }
    ],
    'Financial Analysis': [
      { name: 'Income Analysis', description: 'Analyze current and potential rental income', order: 1, estimated_duration_days: 4 },
      { name: 'Expense Analysis', description: 'Review operating expenses and costs', order: 2, estimated_duration_days: 3 },
      { name: 'Valuation Modeling', description: 'Create detailed valuation models using multiple approaches', order: 3, estimated_duration_days: 5 }
    ],
    'Report Generation': [
      { name: 'Draft Preparation', description: 'Prepare comprehensive valuation report draft', order: 1, estimated_duration_days: 4 },
      { name: 'Quality Review', description: 'Internal review and quality assurance', order: 2, estimated_duration_days: 2 },
      { name: 'Final Report Delivery', description: 'Finalize and deliver valuation report', order: 3, estimated_duration_days: 1 }
    ]
  };

  const stages = stageTemplates[workstreamName as keyof typeof stageTemplates] || [
    { name: 'Planning', description: 'Initial planning phase', order: 1, estimated_duration_days: 3 },
    { name: 'Execution', description: 'Execute the workstream', order: 2, estimated_duration_days: 7 },
    { name: 'Completion', description: 'Finalize and complete', order: 3, estimated_duration_days: 2 }
  ];

  return stages.map((stage, index) => ({
    id: `${workstreamName}-${index + 1}`,
    ...stage,
    status: index === 0 ? 'in_progress' : 'pending',
    required_inputs: [],
    outputs: [],
    assignee: index === 0 ? 'John Smith' : undefined,
    due_date: undefined,
    completed_date: undefined
  }));
};

export const mockWorkflowTemplates: WorkflowTemplate[] = [
  {
    id: '1',
    key: 'valuations',
    name: 'Group Valuations',
    description: 'Streamlined 4-stage valuation workflow: Assign valuer, complete fields, review, and finalize',
    category: 'valuation',
    stages: ['Valuer Assignment', 'Field Completion', 'Review', 'Completed'],
    workstreams: [
      {
        key: 'valuer_assignment',
        name: 'Valuer Assignment',
        fields: [
          { id: 'valuer_name', label: 'Valuer Name', type: 'text' },
          { id: 'valuer_email', label: 'Valuer Email', type: 'text' },
          { id: 'assignment_date', label: 'Assignment Date', type: 'text' },
          { id: 'expected_completion', label: 'Expected Completion Date', type: 'text' },
          { id: 'assignment_notes', label: 'Assignment Notes', type: 'textarea' },
          { id: 'notification_sent', label: 'Notification Sent', type: 'select', options: ['Yes', 'No'] }
        ]
      },
      {
        key: 'field_completion',
        name: 'Field Completion',
        fields: [
          { id: 'property_details', label: 'Property Details', type: 'textarea' },
          { id: 'gross_rental_income', label: 'Gross Rental Income', type: 'number' },
          { id: 'operating_expenses', label: 'Operating Expenses', type: 'number' },
          { id: 'net_operating_income', label: 'Net Operating Income', type: 'formula', formula: 'gross_rental_income - operating_expenses' },
          { id: 'cap_rate', label: 'Cap Rate %', type: 'number' },
          { id: 'property_value', label: 'Property Value', type: 'formula', formula: 'net_operating_income / (cap_rate / 100)' },
          { id: 'valuation_method', label: 'Valuation Method', type: 'select', options: ['Income Capitalization', 'Sales Comparison', 'Cost Approach', 'DCF Analysis'] },
          { id: 'price_per_sqft', label: 'Price per Sq Ft', type: 'formula', formula: 'property_value / property_area' },
          { id: 'supporting_evidence', label: 'Supporting Evidence', type: 'text' },
          { id: 'valuation_notes', label: 'Valuation Notes', type: 'textarea' },
          { id: 'completion_date', label: 'Completion Date', type: 'text' },
          { id: 'ready_for_review', label: 'Ready for Review', type: 'select', options: ['Yes', 'No', 'Pending'] }
        ]
      },
      {
        key: 'review',
        name: 'Review',
        fields: [
          { id: 'reviewer_name', label: 'Reviewer Name', type: 'text' },
          { id: 'reviewer_email', label: 'Reviewer Email', type: 'text' },
          { id: 'review_date', label: 'Review Date', type: 'text' },
          { id: 'market_value_estimate', label: 'Market Value Estimate', type: 'number' },
          { id: 'variance_percentage', label: 'Variance %', type: 'formula', formula: '((market_value_estimate - property_value) / property_value) * 100' },
          { id: 'confidence_score', label: 'Confidence Score', type: 'formula', formula: 'IF(ABS(variance_percentage) < 5, 95, IF(ABS(variance_percentage) < 10, 85, 70))' },
          { id: 'review_decision', label: 'Review Decision', type: 'select', options: ['Approved', 'Rejected', 'Needs Revision', 'Under Review'] },
          { id: 'review_comments', label: 'Review Comments', type: 'textarea' },
          { id: 'revision_required', label: 'Revision Required', type: 'select', options: ['Yes', 'No'] },
          { id: 'revision_notes', label: 'Revision Notes', type: 'textarea' }
        ]
      },
      {
        key: 'completion',
        name: 'Completion',
        fields: [
          { id: 'final_approval_date', label: 'Final Approval Date', type: 'text' },
          { id: 'approved_by', label: 'Approved By', type: 'text' },
          { id: 'final_valuation_amount', label: 'Final Valuation Amount', type: 'text' },
          { id: 'completion_notes', label: 'Completion Notes', type: 'textarea' },
          { id: 'valuation_report', label: 'Valuation Report', type: 'text' },
          { id: 'workflow_completed', label: 'Workflow Completed', type: 'select', options: ['Yes', 'No', 'In Progress'] }
        ]
      },
      {
        key: 'valuation_esg',
        name: 'ESG Features',
        fields: [
          { id: 'green_works', label: 'Includes Green Works', type: 'select', options: ['Yes', 'No'] },
          { id: 'energy_performance', label: 'Energy Performance Category', type: 'text' },
          { id: 'co2_emissions', label: 'Annual CO2 Emissions', type: 'number' }
        ]
      },
      {
        key: 'valuation_assumptions',
        name: 'Assumptions',
        fields: [
          { id: 'assumptions', label: 'Assumptions / Special Assumptions', type: 'textarea' }
        ]
      }
    ],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  },
  {
    id: '2',
    key: 'lease_management',
    name: 'Lease Management',
    description: 'Complete lease lifecycle management from tenant screening to renewal',
    category: 'lease_management',
    stages: ['Tenant Screening', 'Lease Execution', 'Active Management', 'Renewal'],
    workstreams: [
      {
        key: 'tenant_screening',
        name: 'Tenant Screening',
        fields: [
          { id: 'tenant_name', label: 'Tenant Name', type: 'text' },
          { id: 'credit_score', label: 'Credit Score', type: 'number' },
          { id: 'income_verification', label: 'Income Verification', type: 'file' },
          { id: 'background_check', label: 'Background Check', type: 'file' }
        ]
      },
      {
        key: 'lease_negotiation',
        name: 'Lease Negotiation',
        fields: [
          { id: 'rent_amount', label: 'Rent Amount', type: 'currency' },
          { id: 'lease_term', label: 'Lease Term (months)', type: 'number' },
          { id: 'security_deposit', label: 'Security Deposit', type: 'currency' },
          { id: 'special_terms', label: 'Special Terms', type: 'textarea' }
        ]
      }
    ],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z'
  }
];

export const mockWorkflowInstances: WorkflowInstance[] = [
  {
    id: '1',
    property_id: '1',
    template_id: '1',
    user_id: 'user-1',
    name: '001 - Group Valuation',
    status: 'active',
    current_workstream_id: '1-1',
    completion_percentage: 25,
    workstreams: [
      {
        id: '1-1',
        workflow_instance_id: '1',
        template_workstream_key: 'valuer_assignment',
        name: 'Valuer Assignment',
        description: 'Assign a valuer to the property and send notification',
        order_index: 1,
        fields: [
          { id: 'valuer_name', label: 'Valuer Name', type: 'text' },
          { id: 'valuer_email', label: 'Valuer Email', type: 'text' },
          { id: 'assignment_date', label: 'Assignment Date', type: 'text' },
          { id: 'expected_completion', label: 'Expected Completion Date', type: 'text' },
          { id: 'assignment_notes', label: 'Assignment Notes', type: 'textarea' },
          { id: 'notification_sent', label: 'Notification Sent', type: 'text' }
        ],
        form_data: {
          valuer_name: 'John Smith',
          valuer_email: 'john.smith@valuations.com',
          assignment_date: '2023-01-15',
          expected_completion: '2023-02-15',
          assignment_notes: 'Standard valuation required for annual review',
          notification_sent: 'Yes'
        },
        status: 'in_progress',
        completion_triggers: {},
        can_start: true,
        assignee_id: 'valuer-1',
        started_at: '2023-01-15T00:00:00Z',
        due_date: '2023-02-15T00:00:00Z',
        created_at: '2023-01-15T00:00:00Z',
        updated_at: '2023-01-15T00:00:00Z'
      },

      {
        id: '1-2',
        workflow_instance_id: '1',
        template_workstream_key: 'field_completion',
        name: 'Field Completion',
        description: 'Valuer completes all required valuation fields',
        order_index: 2,
        fields: [
          { id: 'property_details', label: 'Property Details', type: 'textarea' },
          { id: 'valuation_calculation', label: 'Valuation Amount', type: 'text' },
          { id: 'valuation_method', label: 'Valuation Method', type: 'select', options: ['Income Capitalization', 'Sales Comparison', 'Cost Approach', 'DCF Analysis'] },
          { id: 'supporting_evidence', label: 'Supporting Evidence', type: 'text' },
          { id: 'valuation_notes', label: 'Valuation Notes', type: 'textarea' },
          { id: 'completion_date', label: 'Completion Date', type: 'text' },
          { id: 'ready_for_review', label: 'Ready for Review', type: 'select', options: ['Yes', 'No', 'Pending'] }
        ],
        form_data: {
          property_details: 'Commercial office building with 5 floors',
          valuation_calculation: '9,200,000',
          valuation_method: 'Income Capitalization',
          supporting_evidence: 'Market comparables and income analysis',
          valuation_notes: 'Based on current market conditions and rental income',
          completion_date: '',
          ready_for_review: 'No'
        },
        status: 'pending',
        completion_triggers: {},
        can_start: false,
        assignee_id: undefined,
        due_date: '2023-03-15T00:00:00Z',
        created_at: '2023-01-15T00:00:00Z',
        updated_at: '2023-01-15T00:00:00Z'
      },

      {
        id: '1-3',
        workflow_instance_id: '1',
        template_workstream_key: 'review',
        name: 'Review',
        description: 'Senior reviewer reviews the valuation and makes decision',
        order_index: 3,
        fields: [
          { id: 'reviewer_name', label: 'Reviewer Name', type: 'text' },
          { id: 'reviewer_email', label: 'Reviewer Email', type: 'text' },
          { id: 'review_date', label: 'Review Date', type: 'text' },
          { id: 'review_decision', label: 'Review Decision', type: 'select', options: ['Approved', 'Rejected', 'Needs Revision', 'Under Review'] },
          { id: 'review_comments', label: 'Review Comments', type: 'textarea' },
          { id: 'revision_required', label: 'Revision Required', type: 'select', options: ['Yes', 'No'] },
          { id: 'revision_notes', label: 'Revision Notes', type: 'textarea' }
        ],
        form_data: {
          reviewer_name: '',
          reviewer_email: '',
          review_date: '',
          review_decision: '',
          review_comments: '',
          revision_required: '',
          revision_notes: ''
        },
        status: 'pending',
        completion_triggers: {},
        can_start: false,
        assignee_id: undefined,
        due_date: '2023-04-15T00:00:00Z',
        created_at: '2023-01-15T00:00:00Z',
        updated_at: '2023-01-15T00:00:00Z'
      },
      {
        id: '1-4',
        workflow_instance_id: '1',
        template_workstream_key: 'completion',
        name: 'Completion',
        description: 'Final completion and documentation',
        order_index: 4,
        fields: [
          { id: 'final_approval_date', label: 'Final Approval Date', type: 'text' },
          { id: 'approved_by', label: 'Approved By', type: 'text' },
          { id: 'final_valuation_amount', label: 'Final Valuation Amount', type: 'text' },
          { id: 'completion_notes', label: 'Completion Notes', type: 'textarea' },
          { id: 'valuation_report', label: 'Valuation Report', type: 'text' },
          { id: 'workflow_completed', label: 'Workflow Completed', type: 'select', options: ['Yes', 'No', 'In Progress'] }
        ],
        form_data: {
          final_approval_date: '',
          approved_by: '',
          final_valuation_amount: '',
          completion_notes: '',
          valuation_report: '',
          workflow_completed: ''
        },
        status: 'pending',
        completion_triggers: {},
        can_start: false,
        assignee_id: undefined,
        due_date: '2023-05-15T00:00:00Z',
        created_at: '2023-01-15T00:00:00Z',
        updated_at: '2023-01-15T00:00:00Z'
      }
    ],
    started_at: '2023-01-15T00:00:00Z',
    created_at: '2023-01-15T00:00:00Z',
    updated_at: '2023-01-15T00:00:00Z'
  }
]; 