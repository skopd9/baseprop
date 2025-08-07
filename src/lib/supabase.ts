import { createClient } from '@supabase/supabase-js';
import { Module, UserModuleAccess } from '../types';

const supabaseUrl =
  typeof process !== 'undefined' && process.env.VITE_SUPABASE_URL
    ? process.env.VITE_SUPABASE_URL
    : typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL
      ? import.meta.env.VITE_SUPABASE_URL
      : 'https://your-project.supabase.co';

const supabaseAnonKey =
  typeof process !== 'undefined' && process.env.VITE_SUPABASE_ANON_KEY
    ? process.env.VITE_SUPABASE_ANON_KEY
    : typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY
      ? import.meta.env.VITE_SUPABASE_ANON_KEY
      : 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
        workstreams(*)
      `)
      .eq('module_id', moduleId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  }
};