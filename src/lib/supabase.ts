import { createClient } from '@supabase/supabase-js';
import { Module, UserModuleAccess } from '../types';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing required environment variables: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// =====================================================
// Authentication Service Functions
// =====================================================
export const auth = {
  // Send magic link to email
  async signInWithMagicLink(email: string) {
    return await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}`
      }
    });
  },

  // Sign out current user
  async signOut() {
    return await supabase.auth.signOut();
  },

  // Get current user
  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  // Get current session
  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    return session;
  },

  // Listen to auth state changes
  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback);
  }
};

// Database service functions
export const db = {
  // Properties
  async getProperties() {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data;
  },

  async getProperty(id: string) {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Workflow Templates
  async getWorkflowTemplates() {
    const { data, error } = await supabase
      .from('workflow_templates')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  },

  // Workflow Instances
  async getWorkflowInstances(propertyId?: string) {
    let query = supabase
      .from('workflow_instances')
      .select(`
        *,
        workstreams (*),
        properties (*),
        workflow_templates (*)
      `)
      .order('created_at', { ascending: false });
    
    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async createWorkflowInstance(instance: any) {
    const { data, error } = await supabase
      .from('workflow_instances')
      .insert(instance)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Workstreams
  async updateWorkstream(id: string, updates: any) {
    const { data, error } = await supabase
      .from('workstreams')
      .update(updates)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  // Tenants
  async getTenants() {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async getTenant(id: string) {
    const { data, error } = await supabase
      .from('tenants')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Units
  async getUnits(propertyId?: string) {
    let query = supabase
      .from('units')
      .select('*')
      .order('unit_number');
    
    if (propertyId) {
      query = query.eq('property_id', propertyId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async getUnit(id: string) {
    const { data, error } = await supabase
      .from('units')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Unit-Tenant relationships
  async getUnitTenants(unitId?: string, tenantId?: string) {
    let query = supabase
      .from('unit_tenants')
      .select(`
        *,
        units (*),
        tenants (*)
      `)
      .order('lease_start_date', { ascending: false });
    
    if (unitId) {
      query = query.eq('unit_id', unitId);
    }
    
    if (tenantId) {
      query = query.eq('tenant_id', tenantId);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  // Chat Messages
  async getChatMessages(workflowInstanceId: string) {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('workflow_instance_id', workflowInstanceId)
      .order('timestamp', { ascending: true });
    
    if (error) throw error;
    return data;
  },

  async addChatMessage(message: any) {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert(message)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Helper functions for JSON-based property system

export interface PropertyData {
  id: string;
  asset_register_id: string;
  name: string;
  address: string;
  config_id: string;
  property_data: Record<string, any>;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AssetRegisterConfig {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
  config: any;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

// Get property with combined core + JSON data
export async function getProperty(id: string): Promise<PropertyData | null> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching property:', error);
    return null;
  }

  return data;
}

// Get all properties with their data
export async function getAllProperties(): Promise<PropertyData[]> {
  const { data, error } = await supabase
    .from('properties')
    .select('*')
    .order('asset_register_id');

  if (error) {
    console.error('Error fetching properties:', error);
    return [];
  }

  return data || [];
}

// Update property data (merges with existing JSON)
export async function updatePropertyData(
  id: string, 
  updates: Record<string, any>
): Promise<boolean> {
  try {
    // First get current property data
    const { data: currentData, error: fetchError } = await supabase
      .from('properties')
      .select('property_data, name, address')
      .eq('id', id)
      .single();

    if (fetchError) {
      console.error('Error fetching current property data:', fetchError);
      return false;
    }

    // Merge updates with existing data
    const mergedData = {
      ...currentData.property_data,
      ...updates
    };

    // Handle core fields separately
    const coreUpdates: any = {};
    if (updates.name) coreUpdates.name = updates.name;
    if (updates.address) coreUpdates.address = updates.address;

    // Update property
    const { error } = await supabase
      .from('properties')
      .update({
        ...coreUpdates,
        property_data: mergedData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('Error updating property:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error in updatePropertyData:', error);
    return false;
  }
}

// Get field value from property (handles core fields + JSON data)
export function getPropertyFieldValue(
  property: PropertyData, 
  fieldName: string
): any {
  // Check core fields first
  if (fieldName === 'name') return property.name;
  if (fieldName === 'address') return property.address;
  if (fieldName === 'asset_register_id') return property.asset_register_id;
  if (fieldName === 'status') return property.status;

  // Check JSON data
  return property.property_data[fieldName];
}

// Get default Asset Register configuration
export async function getDefaultAssetRegisterConfig(): Promise<AssetRegisterConfig | null> {
  const { data, error } = await supabase
    .from('asset_register_configs')
    .select('*')
    .eq('is_default', true)
    .single();

  if (error) {
    console.error('Error fetching default config:', error);
    return null;
  }

  return data;
}

// Create or update Asset Register configuration
export async function saveAssetRegisterConfig(
  config: any,
  name: string = 'AI Modified Configuration',
  description: string = 'Configuration modified by AI assistant'
): Promise<string | null> {
  try {
    // Create new configuration
    const { data, error } = await supabase
      .from('asset_register_configs')
      .insert({
        name,
        description,
        is_default: true,
        config
      })
      .select('id')
      .single();

    if (error) {
      console.error('Failed to create config in Supabase:', error);
      return null;
    }

    if (data) {
      // Update any existing default to false
      await supabase
        .from('asset_register_configs')
        .update({ is_default: false })
        .neq('id', data.id);

      return data.id;
    }

    return null;
  } catch (error) {
    console.error('Error saving config to Supabase:', error);
    return null;
  }
};

// Module service functions
export const moduleService = {
  async getModules(): Promise<Module[]> {
    const { data, error } = await supabase
      .from('modules')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    
    if (error) throw error;
    return data || [];
  },

  async getUserModules(userId: string): Promise<(Module & { user_module_access: UserModuleAccess })[]> {
    const { data, error } = await supabase
      .from('modules')
      .select(`
        *,
        user_module_access!inner(*)
      `)
      .eq('user_module_access.user_id', userId)
      .eq('is_active', true)
      .order('sort_order');
    
    if (error) throw error;
    return data || [];
  },

  async getUserDefaultModule(userId: string): Promise<Module | null> {
    const { data, error } = await supabase
      .from('modules')
      .select(`
        *,
        user_module_access!inner(*)
      `)
      .eq('user_module_access.user_id', userId)
      .eq('user_module_access.is_default', true)
      .eq('is_active', true)
      .single();
    
    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data || null;
  },

  async setUserDefaultModule(userId: string, moduleId: string) {
    // First, clear existing default
    await supabase
      .from('user_module_access')
      .update({ is_default: false })
      .eq('user_id', userId);
    
    // Then set new default
    const { error } = await supabase
      .from('user_module_access')
      .update({ is_default: true })
      .match({ user_id: userId, module_id: moduleId });
    
    if (error) throw error;
  },

  async updateModuleAccess(userId: string, moduleId: string) {
    const { error } = await supabase
      .from('user_module_access')
      .update({ last_accessed_at: new Date().toISOString() })
      .match({ user_id: userId, module_id: moduleId });
    
    if (error) throw error;
  },

  // Module-filtered data functions
  async getPropertiesByModule(moduleId: string) {
    const { data, error } = await supabase
      .from('properties')
      .select('*')
      .eq('module_id', moduleId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getWorkflowTemplatesByModule(moduleId: string) {
    const { data, error } = await supabase
      .from('workflow_templates')
      .select('*')
      .or(`module_id.eq.${moduleId},is_global.eq.true`)
      .order('name');
    
    if (error) throw error;
    return data || [];
  },

  async getWorkflowInstancesByModule(moduleId: string) {
    const { data, error } = await supabase
      .from('workflow_instances')
      .select(`
        *,
        properties(name, address),
        workstreams!workflow_instance_id(*)
      `)
      .eq('module_id', moduleId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  // Valuation-specific queries
  async getValuationWorkflowInstances() {
    const { data, error } = await supabase
      .from('workflow_instances')
      .select(`
        *,
        properties(
          id,
          asset_register_id,
          name,
          address
        ),
        workstreams!workflow_instance_id(
          id,
          name,
          status,
          assignee_id,
          template_workstream_key,
          form_data,
          updated_at,
          order_index
        ),
        workflow_templates!inner(key)
      `)
      .eq('workflow_templates.key', 'valuations')
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  },

  async getPropertiesWithValuationStatus() {
    const { data, error } = await supabase
      .from('properties')
      .select(`
        id,
        asset_register_id,
        name,
        address,
        status,
        created_at,
        updated_at,
        workflow_instances!property_id(
          id,
          status,
          completion_percentage,
          created_at,
          updated_at,
          current_workstream_id,
          workstreams!workflow_instance_id(
            id,
            name,
            status,
            assignee_id,
            template_workstream_key,
            form_data,
            updated_at
          ),
          workflow_templates!inner(key)
        )
      `)
      .eq('workflow_instances.workflow_templates.key', 'valuations')
      .order('asset_register_id');
    
    if (error) throw error;
    return data || [];
  },

  async updateWorkstreamData(workstreamId: string, formData: any, status?: string) {
    const updates: any = {
      form_data: formData,
      updated_at: new Date().toISOString()
    };

    if (status) {
      updates.status = status;
      if (status === 'completed') {
        updates.completed_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabase
      .from('workstreams')
      .update(updates)
      .eq('id', workstreamId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  },

  async assignValuerToWorkstream(workstreamId: string, valuerId: string) {
    const { data, error } = await supabase
      .from('workstreams')
      .update({
        assignee_id: valuerId,
        status: 'started',
        updated_at: new Date().toISOString()
      })
      .eq('id', workstreamId)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
};

// Persona service functions
export const personaDb = {
  async getUserPersona(userEmail: string) {
    const { data, error } = await supabase
      .rpc('get_user_persona', { user_email_param: userEmail });
    
    if (error) throw error;
    return data && data.length > 0 ? data[0] : null;
  },

  async assignPersona(userEmail: string, personaName: string, assignedBy?: string) {
    const { data, error } = await supabase
      .rpc('assign_user_persona', {
        user_email_param: userEmail,
        persona_name_param: personaName,
        assigned_by_param: assignedBy
      });
    
    if (error) throw error;
    return data;
  },

  async getAllPersonas() {
    const { data, error } = await supabase
      .from('user_personas')
      .select('*')
      .order('name');
    
    if (error) throw error;
    return data;
  },

  async getPersonaAssignments(userEmail?: string) {
    let query = supabase
      .from('user_persona_assignments')
      .select(`
        *,
        persona:persona_id(*)
      `)
      .eq('is_active', true)
      .order('assigned_at', { ascending: false });
    
    if (userEmail) {
      query = query.eq('user_email', userEmail);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return data;
  },

  async logPersonaChange(
    userEmail: string,
    oldPersonaName: string | null,
    newPersonaName: string,
    changedBy: string,
    reason?: string
  ) {
    const { data, error } = await supabase
      .rpc('log_persona_change', {
        user_email_param: userEmail,
        old_persona_name: oldPersonaName,
        new_persona_name: newPersonaName,
        changed_by_param: changedBy,
        reason_param: reason
      });
    
    if (error) throw error;
    return data;
  }
};