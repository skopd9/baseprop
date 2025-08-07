export interface Module {
  id: string;
  name: string; // 'valuations', 'lease_management', 'acquisition', 'asset_management'
  display_name: string;
  description: string;
  icon: string;
  color_theme: string;
  is_active: boolean;
  sort_order: number;
  module_config: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface UserModuleAccess {
  id: string;
  user_id: string;
  module_id: string;
  role: 'admin' | 'manager' | 'user' | 'viewer';
  is_default: boolean;
  last_accessed_at?: string;
  created_at: string;
}

export interface Property {
  id: string;
  asset_register_id: string; // Human readable ID like '001', '002'
  name: string;
  address: string;
  property_type: 'land' | 'horizontal_properties' | 'stand_alone_buildings';
  property_sub_type?: string; // plot, maisonette, retail, office, etc.
  
  // Module association
  module_id?: string;
  
  // Location data
  latitude?: number;
  longitude?: number;
  municipality?: string;
  postal_code?: string;
  
  // Property details
  square_feet?: number;
  units?: number;
  floors?: number;
  year_built?: number;
  
  // Financial
  acquisition_date?: string;
  acquisition_price?: number;
  current_value?: number;
  
  status: 'active' | 'disposed' | 'under_contract';
  created_at: string;
  updated_at: string;
}

export interface WorkflowStage {
  id: string;
  name: string;
  description: string;
  order: number;
  status: 'pending' | 'in_progress' | 'completed' | 'blocked';
  required_inputs: string[];
  outputs: string[];
  estimated_duration_days: number;
  assignee?: string;
  due_date?: string;
  completed_date?: string;
}

export interface Workstream {
  id: string;
  workflow_instance_id: string;
  template_workstream_key: string;
  name: string;
  description?: string;
  order_index: number;
  
  // Field definitions and data
  fields: WorkflowTemplateField[];
  form_data: Record<string, any>;
  
  // Status and progression
  status: 'pending' | 'started' | 'in_progress' | 'completed' | 'blocked' | 'skipped';
  completion_triggers?: Record<string, any>;
  can_start: boolean;
  
  // Assignment and tracking
  assignee_id?: string;
  started_at?: string;
  completed_at?: string;
  due_date?: string;
  
  created_at: string;
  updated_at: string;
}

export interface WorkflowTemplateField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'file' | 'formula';
  options?: string[];
  formula?: string;
}

export interface WorkflowTemplateWorkstream {
  key: string;
  name: string;
  fields?: WorkflowTemplateField[];
}

export interface WorkflowTemplate {
  id: string;
  key: string;
  name: string;
  description: string;
  category?: 'acquisition' | 'capex' | 'lease_renewal' | 'disposal' | 'lease_up' | 'auction_sales' | 'valuation' | 'lease_management' | 'asset_management';
  stages?: string[];
  workstreams?: WorkflowTemplateWorkstream[];
  default_workstreams?: string[];
  triggers?: string[]; // IDs of workflows this can trigger
  module_id?: string;
  is_global?: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowInstance {
  id: string;
  property_id: string;
  template_id: string;
  user_id: string;
  name: string;
  status: 'not_started' | 'started' | 'in_progress' | 'completed' | 'paused' | 'cancelled';
  
  // Progress tracking
  current_workstream_id?: string;
  completion_percentage: number;
  
  // Workstreams data
  workstreams?: Workstream[];
  
  // Dates
  started_at?: string;
  completed_at?: string;
  due_date?: string;
  
  // Module association
  module_id?: string;
  
  created_at: string;
  updated_at: string;
}

export interface WorkflowLink {
  id: string;
  source_workflow_id: string;
  target_workflow_id: string;
  trigger_condition: string; // e.g., "completion", "stage_completed:offer_received"
  created_at: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  workflow_instance_id?: string;
}

export interface AIWorkflowUpdate {
  action: 'add_workstream' | 'remove_workstream' | 'modify_stage' | 'add_stage' | 'remove_stage';
  target: string; // workstream_id or stage_id
  changes: any;
  reasoning: string;
} 