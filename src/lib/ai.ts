import OpenAI from 'openai';
import { AIWorkflowUpdate, WorkflowInstance, Workstream } from '../types';
import { supabase } from './supabase';

const openai = import.meta.env.VITE_OPENAI_API_KEY ? new OpenAI({
  apiKey: import.meta.env.VITE_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
}) : null;

export const aiService = {
  async processWorkflowCommand(
    userMessage: string,
    workflowInstance: WorkflowInstance,
    property: any
  ): Promise<AIWorkflowUpdate> {
    const systemPrompt = `You are an AI assistant for turnkey, a real estate workflow engine. You help users modify workflow instances for properties.

Current Property: ${property.name} (${property.address})
Current Workflow: ${workflowInstance.name}
Status: ${workflowInstance.status}

Available Workstreams:
${workflowInstance.workstreams.map(ws => `- ${ws.name} (${ws.status}): ${ws.stages.length} stages`).join('\n')}

You can perform these actions:
1. add_workstream: Add a new workstream to the workflow
2. remove_workstream: Remove an existing workstream
3. modify_stage: Modify an existing stage
4. add_stage: Add a new stage to a workstream
5. remove_stage: Remove a stage from a workstream

Respond with a JSON object in this exact format:
{
  "action": "add_workstream|remove_workstream|modify_stage|add_stage|remove_stage",
  "target": "workstream_id_or_name",
  "changes": {
    // Specific changes based on action
  },
  "reasoning": "Explanation of why this change was made"
}

For add_workstream, changes should include:
- name: string
- description: string
- type: "linear" or "parallel"
- stages: array of stage objects with name, description, order, estimated_duration_days

For add_stage, changes should include:
- name: string
- description: string
- order: number
- estimated_duration_days: number

Be concise and practical. Focus on real estate workflows like acquisitions, CapEx, lease renewals, etc.`;

    if (!openai) {
      throw new Error('OpenAI API key not configured. Please add VITE_OPENAI_API_KEY to your .env file.');
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No response from AI');
    }

    try {
      const update = JSON.parse(content) as AIWorkflowUpdate;
      return update;
    } catch (error) {
      throw new Error(`Failed to parse AI response: ${content}`);
    }
  },

  async getWorkflowSummary(workflowInstance: WorkflowInstance): Promise<string> {
    const systemPrompt = `You are an AI assistant for turnkey. Provide a concise summary of the current workflow status.

Workflow: ${workflowInstance.name}
Status: ${workflowInstance.status}

Workstreams:
${workflowInstance.workstreams.map(ws => `
${ws.name} (${ws.status}):
${ws.stages.map(stage => `  - ${stage.name}: ${stage.status}`).join('\n')}
`).join('\n')}

Provide a 2-3 sentence summary focusing on:
1. Overall progress
2. What's currently in progress
3. What might be blocking or needs attention

Be professional and actionable.`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: systemPrompt }
      ],
      temperature: 0.3,
      max_tokens: 300,
    });

    return response.choices[0]?.message?.content || 'Unable to generate summary';
  }
};

interface FieldConfig {
  id: string;
  label: string;
  type: 'text' | 'number' | 'currency' | 'date' | 'select' | 'boolean' | 'calculated';
  field: string;
  editable: boolean;
  visible: boolean;
  section: string;
  options?: { value: string; label: string }[];
  calculation?: string; // For calculated fields
  description?: string;
}

interface AssetRegisterConfig {
  sections: {
    [sectionId: string]: {
      id: string;
      label: string;
      visible: boolean;
      columns: 1 | 2 | 3;
      fields: FieldConfig[];
    }
  };
}

interface AIResponse {
  action: 'add_field' | 'hide_field' | 'show_field' | 'remove_field' | 'add_calculated_field' | 'modify_section' | 'error';
  field?: Partial<FieldConfig>;
  fieldId?: string;
  sectionId?: string;
  message?: string;
  changes?: string[];
}

class AssetRegisterAI {
  private config: AssetRegisterConfig;
  private openaiApiKey: string | null;
  private configId: string | null = null; // Track current config ID

  constructor() {
    this.openaiApiKey = localStorage.getItem('openai_api_key');
    this.config = this.getDefaultConfig();
    this.loadConfigFromSupabase();
  }

  // Public method to ensure config is loaded
  async ensureConfigLoaded(): Promise<void> {
    await this.loadConfigFromSupabase();
  }

  private async loadConfigFromSupabase(): Promise<void> {
    try {
      // Try to load the default configuration from Supabase
      const { data, error } = await supabase
        .from('asset_register_configs')
        .select('*')
        .eq('is_default', true)
        .single();

      if (error) {
        console.warn('Failed to load config from Supabase, using default:', error);
        return;
      }

      if (data) {
        this.config = data.config as AssetRegisterConfig;
        this.configId = data.id;
      }
    } catch (error) {
      console.warn('Error loading config from Supabase:', error);
    }
  }

  private async saveConfigToSupabase(): Promise<void> {
    try {
      if (this.configId) {
        // Update existing configuration
        const { error } = await supabase
          .from('asset_register_configs')
          .update({ 
            config: this.config,
            updated_at: new Date().toISOString()
          })
          .eq('id', this.configId);

        if (error) {
          console.error('Failed to update config in Supabase:', error);
        }
      } else {
        // Create new configuration
        const { data, error } = await supabase
          .from('asset_register_configs')
          .insert({
            name: 'AI Modified Configuration',
            description: 'Configuration modified by AI assistant',
            is_default: true,
            config: this.config
          })
          .select('id')
          .single();

        if (error) {
          console.error('Failed to create config in Supabase:', error);
        } else if (data) {
          this.configId = data.id;
          
          // Update any existing default to false
          await supabase
            .from('asset_register_configs')
            .update({ is_default: false })
            .neq('id', this.configId);
        }
      }
    } catch (error) {
      console.error('Error saving config to Supabase:', error);
    }
  }

  // Remove the old localStorage methods and replace with Supabase
  private loadConfig(): AssetRegisterConfig {
    // This method is now handled by loadConfigFromSupabase
    return this.getDefaultConfig();
  }

  private async saveConfig(): Promise<void> {
    // Save to Supabase instead of localStorage
    await this.saveConfigToSupabase();
  }

  private getDefaultConfig(): AssetRegisterConfig {
    return {
      sections: {
        basic: {
          id: 'basic',
          label: 'Basic Information',
          visible: true,
          columns: 2,
          fields: [
            {
              id: 'name',
              label: 'Property Name',
              type: 'text',
              field: 'name',
              editable: true,
              visible: true,
              section: 'basic'
            },
            {
              id: 'asset_register_id',
              label: 'Asset Register ID',
              type: 'text',
              field: 'asset_register_id',
              editable: false,
              visible: true,
              section: 'basic'
            },
            {
              id: 'rei_asset_id',
              label: 'REI Asset ID',
              type: 'text',
              field: 'rei_asset_id',
              editable: true,
              visible: true,
              section: 'basic'
            },
            {
              id: 'pid',
              label: 'PID',
              type: 'text',
              field: 'pid',
              editable: true,
              visible: true,
              section: 'basic'
            },
            {
              id: 'valuation_id',
              label: 'Valuation ID',
              type: 'text',
              field: 'valuation_id',
              editable: true,
              visible: true,
              section: 'basic'
            },
            {
              id: 'status',
              label: 'Status',
              type: 'select',
              field: 'status',
              editable: true,
              visible: true,
              section: 'basic',
              options: [
                { value: 'active', label: 'Active' },
                { value: 'disposed', label: 'Disposed' },
                { value: 'under_contract', label: 'Under Contract' }
              ]
            }
          ]
        },
        location: {
          id: 'location',
          label: 'Location',
          visible: true,
          columns: 2,
          fields: [
            {
              id: 'address',
              label: 'Address',
              type: 'text',
              field: 'address',
              editable: true,
              visible: true,
              section: 'location'
            },
            {
              id: 'country',
              label: 'Country',
              type: 'text',
              field: 'country',
              editable: true,
              visible: true,
              section: 'location'
            },
            {
              id: 'municipality',
              label: 'Municipality',
              type: 'text',
              field: 'municipality',
              editable: true,
              visible: true,
              section: 'location'
            },
            {
              id: 'postal_code',
              label: 'Postal Code',
              type: 'text',
              field: 'postal_code',
              editable: true,
              visible: true,
              section: 'location'
            },
            {
              id: 'cadastral_number',
              label: 'Cadastral Number',
              type: 'text',
              field: 'cadastral_number',
              editable: true,
              visible: true,
              section: 'location'
            }
          ]
        },
        property_details: {
          id: 'property_details',
          label: 'Property Details',
          visible: true,
          columns: 2,
          fields: [
            {
              id: 'property_type',
              label: 'Property Type',
              type: 'select',
              field: 'property_type',
              editable: true,
              visible: true,
              section: 'property_details',
              options: [
                { value: 'land', label: 'Land' },
                { value: 'horizontal_properties', label: 'Horizontal Properties' },
                { value: 'stand_alone_buildings', label: 'Stand Alone Buildings' }
              ]
            },
            {
              id: 'property_sub_type',
              label: 'Property Sub Type',
              type: 'text',
              field: 'property_sub_type',
              editable: true,
              visible: true,
              section: 'property_details'
            },
            {
              id: 'units',
              label: 'Units',
              type: 'number',
              field: 'units',
              editable: true,
              visible: true,
              section: 'property_details'
            },
            {
              id: 'square_feet',
              label: 'Building Area (m²)',
              type: 'number',
              field: 'square_feet',
              editable: true,
              visible: true,
              section: 'property_details'
            },
            {
              id: 'land_area',
              label: 'Land Area (m²)',
              type: 'number',
              field: 'land_area',
              editable: true,
              visible: true,
              section: 'property_details'
            }
          ]
        },
        financial: {
          id: 'financial',
          label: 'Financial Information',
          visible: true,
          columns: 2,
          fields: [
            {
              id: 'current_value',
              label: 'Current Value',
              type: 'currency',
              field: 'current_value',
              editable: true,
              visible: true,
              section: 'financial'
            },
            {
              id: 'acquisition_price',
              label: 'Acquisition Price',
              type: 'currency',
              field: 'acquisition_price',
              editable: true,
              visible: true,
              section: 'financial'
            },
            {
              id: 'acquisition_date',
              label: 'Acquisition Date',
              type: 'date',
              field: 'acquisition_date',
              editable: true,
              visible: true,
              section: 'financial'
            }
          ]
        },
        client: {
          id: 'client',
          label: 'Client & Portfolio',
          visible: true,
          columns: 2,
          fields: [
            {
              id: 'client',
              label: 'Client',
              type: 'text',
              field: 'client',
              editable: true,
              visible: true,
              section: 'client'
            },
            {
              id: 'portfolio',
              label: 'Portfolio',
              type: 'text',
              field: 'portfolio',
              editable: true,
              visible: true,
              section: 'client'
            },
            {
              id: 'unique_client_id',
              label: 'Unique Client ID',
              type: 'text',
              field: 'unique_client_id',
              editable: true,
              visible: true,
              section: 'client'
            },
            {
              id: 'grouped_unique_client_id',
              label: 'Grouped Unique Client ID',
              type: 'text',
              field: 'grouped_unique_client_id',
              editable: true,
              visible: true,
              section: 'client'
            },
            {
              id: 'borrower_id',
              label: 'Borrower ID',
              type: 'text',
              field: 'borrower_id',
              editable: true,
              visible: true,
              section: 'client'
            }
          ]
        },
        ownership: {
          id: 'ownership',
          label: 'Ownership',
          visible: true,
          columns: 3,
          fields: [
            {
              id: 'ownership_type',
              label: 'Type of Ownership',
              type: 'text',
              field: 'ownership_type',
              editable: true,
              visible: true,
              section: 'ownership'
            },
            {
              id: 'ownership_percentage',
              label: 'Ownership %',
              type: 'text',
              field: 'ownership_percentage',
              editable: true,
              visible: true,
              section: 'ownership'
            },
            {
              id: 'remote_area',
              label: 'Remote Area',
              type: 'text',
              field: 'remote_area',
              editable: true,
              visible: true,
              section: 'ownership'
            }
          ]
        }
      }
    };
  }

  private async callOpenAI(userRequest: string): Promise<AIResponse> {
    if (!this.openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = `You are an Asset Register field configuration assistant. You help users modify property data fields ONLY. You cannot create workflows or workstreams - only property fields.

SCOPE: Property field management only - adding, hiding, showing, or calculating property data fields.
NOT IN SCOPE: Workflows, workstreams, business processes, task management.

Current sections available: basic, location, property_details, financial, client, ownership
Field types available: text, number, currency, date, select, boolean, calculated

User request: "${userRequest}"

If the request is about workflows/workstreams/business processes, respond with:
{
  "action": "error",
  "message": "I can only modify property fields. For workflow configuration, please use the Workflow AI assistant.",
  "changes": []
}

Otherwise, respond with a JSON object containing:
{
  "action": "add_field" | "hide_field" | "show_field" | "remove_field" | "add_calculated_field",
  "field": {
    "id": "unique_field_id",
    "label": "Field Label", 
    "type": "text|number|currency|date|select|boolean|calculated",
    "field": "database_column_name",
    "editable": true,
    "visible": true,
    "section": "section_id",
    "options": [{"value": "opt1", "label": "Option 1"}], // only for select fields
    "calculation": "property.field1 / property.field2 * 100" // only for calculated fields
  },
  "fieldId": "field_id_to_modify", // for hide/show/remove actions
  "sectionId": "target_section", 
  "message": "Human readable description of what was done",
  "changes": ["List of changes made"]
}

Examples:
- "Add construction year field" → add_field with type "number" in property_details
- "Hide PID field" → hide_field with fieldId "pid"
- "Calculate property yield" → add_calculated_field with calculation "property.annual_income / property.current_value * 100"
- "Add maintenance status dropdown" → add_field with type "select" and options
- "Create valuation workflow" → error (out of scope)`;

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.openaiApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: prompt
            },
            {
              role: 'user',
              content: userRequest
            }
          ],
          temperature: 0.1,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`);
      }

      const data = await response.json();
      const aiResponse = JSON.parse(data.choices[0].message.content);
      return aiResponse;
    } catch (error) {
      console.error('OpenAI API error:', error);
      return {
        action: 'error',
        message: 'Failed to process request with AI'
      };
    }
  }

  async processUserRequest(request: string): Promise<{
    success: boolean;
    config?: AssetRegisterConfig;
    changes?: string[];
    error?: string;
  }> {
    try {
      // If no OpenAI key, use simple pattern matching
      if (!this.openaiApiKey) {
        return this.processRequestLocally(request);
      }

      const aiResponse = await this.callOpenAI(request);
      
      if (aiResponse.action === 'error') {
        return {
          success: false,
          error: aiResponse.message
        };
      }

      // Apply the AI's suggested action
      const success = this.applyAction(aiResponse);
      
      if (success) {
        await this.saveConfig();
        return {
          success: true,
          config: this.config,
          changes: aiResponse.changes || [aiResponse.message || 'Configuration updated']
        };
      } else {
        return {
          success: false,
          error: 'Failed to apply configuration changes'
        };
      }
    } catch (error) {
      console.error('Error processing request:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private processRequestLocally(request: string): {
    success: boolean;
    config?: AssetRegisterConfig;
    changes?: string[];
    error?: string;
  } {
    const lowerRequest = request.toLowerCase();
    
    // Enhanced field finding - look for existing fields
    const currentFields = this.getAllFields();
    
    // Context-aware field finding
    if (this.isFieldFindingRequest(lowerRequest)) {
      return this.handleFieldFindingRequest(lowerRequest, currentFields);
    }
    
    // Enhanced pattern matching with fuzzy field name detection
    const fieldMatch = this.extractFieldNameFromRequest(lowerRequest);
    const actionMatch = this.extractActionFromRequest(lowerRequest);
    
    // Handle dynamic actions with detected field names
    if (actionMatch && fieldMatch) {
      return this.handleDynamicAction(actionMatch, fieldMatch, lowerRequest);
    }
    
    // Reset configuration
    if (lowerRequest.includes('reset') && lowerRequest.includes('default')) {
      this.config = this.getDefaultConfig();
      // Note: This is a synchronous method, so we can't await here.
      // The caller should handle the async nature if needed.
      this.saveConfigToSupabase();
      return {
        success: true,
        config: this.config,
        changes: ['Reset configuration to default settings']
      };
    }
    
    // Smart contextual removal (e.g., "remove the field you added", "remove test")
    if (lowerRequest.includes('remove') || lowerRequest.includes('delete')) {
      return this.handleSmartRemoval(lowerRequest, currentFields);
    }
    
    // Smart field hiding with fuzzy matching
    if (lowerRequest.includes('hide')) {
      const field = this.findFieldByName(lowerRequest, currentFields);
      if (field) {
        const success = this.hideField(field.id);
        return {
          success,
          config: this.config,
          changes: success ? [`Hidden ${field.label} field`] : []
        };
      }
    }
    
    // Smart field showing with fuzzy matching
    if (lowerRequest.includes('show') || lowerRequest.includes('display') || lowerRequest.includes('visible')) {
      const field = this.findFieldByName(lowerRequest, currentFields);
      if (field) {
        const success = this.showField(field.id);
        return {
          success,
          config: this.config,
          changes: success ? [`Shown ${field.label} field`] : []
        };
      }
    }
    
    // Enhanced add field patterns
    if (lowerRequest.includes('add') || lowerRequest.includes('create') || lowerRequest.includes('new')) {
      return this.handleAddFieldRequest(lowerRequest);
    }
    
    // List/show fields request
    if (lowerRequest.includes('list') || lowerRequest.includes('show all') || lowerRequest.includes('what fields')) {
      const visibleFields = currentFields.filter(f => f.visible);
      const hiddenFields = currentFields.filter(f => !f.visible);
      
      return {
        success: true,
        config: this.config,
        changes: [
          `Visible fields (${visibleFields.length}): ${visibleFields.map(f => f.label).join(', ')}`,
          hiddenFields.length > 0 ? `Hidden fields (${hiddenFields.length}): ${hiddenFields.map(f => f.label).join(', ')}` : 'No hidden fields'
        ]
      };
    }

    return {
      success: false,
      error: 'I could not understand your request. Try asking me to add, remove, hide, show fields, or ask "where is [field name]?" to find existing fields.'
    };
  }

  private applyAction(aiResponse: AIResponse): boolean {
    switch (aiResponse.action) {
      case 'add_field':
        if (aiResponse.field && aiResponse.sectionId) {
          return this.addField(aiResponse.sectionId, aiResponse.field as FieldConfig);
        }
        break;
      case 'hide_field':
        if (aiResponse.fieldId) {
          return this.hideField(aiResponse.fieldId);
        }
        break;
      case 'show_field':
        if (aiResponse.fieldId) {
          return this.showField(aiResponse.fieldId);
        }
        break;
      case 'remove_field':
        if (aiResponse.fieldId) {
          return this.removeField(aiResponse.fieldId);
        }
        break;
      case 'add_calculated_field':
        if (aiResponse.field && aiResponse.sectionId) {
          return this.addCalculatedField(aiResponse.sectionId, aiResponse.field as FieldConfig & { calculation: string });
        }
        break;
    }
    return false;
  }

  getConfig(): AssetRegisterConfig {
    return this.config;
  }

  updateConfig(config: AssetRegisterConfig): void {
    this.config = config;
    this.saveConfig();
  }

  // Helper methods for common operations
  addField(sectionId: string, field: Partial<FieldConfig>): boolean {
    if (!this.config.sections[sectionId]) {
      console.error(`Section ${sectionId} not found in config`);
      return false;
    }
    
    const newField: FieldConfig = {
      id: field.id || `field_${Date.now()}`,
      label: field.label || 'New Field',
      type: field.type || 'text',
      field: field.field || field.id || `field_${Date.now()}`,
      editable: field.editable !== false,
      visible: field.visible !== false,
      section: sectionId,
      ...(field.options && { options: field.options }),
      ...(field.calculation && { calculation: field.calculation }),
      ...(field.description && { description: field.description })
    };
    
    console.log(`=== ADDING FIELD ===`);
    console.log('Section:', sectionId);
    console.log('New field:', newField);
    console.log('Fields before:', this.config.sections[sectionId].fields.length);
    
    this.config.sections[sectionId].fields.push(newField);
    
    console.log('Fields after:', this.config.sections[sectionId].fields.length);
    console.log('Saving config to Supabase...');
    
    this.saveConfigToSupabase().then(() => {
      console.log('✅ Config saved to Supabase successfully');
    }).catch(error => {
      console.error('❌ Failed to save config to Supabase:', error);
    });
    
    return true;
  }

  hideField(fieldId: string): boolean {
    for (const section of Object.values(this.config.sections)) {
      const field = section.fields.find(f => f.id === fieldId);
      if (field) {
        field.visible = false;
        this.saveConfig();
        return true;
      }
    }
    return false;
  }

  showField(fieldId: string): boolean {
    for (const section of Object.values(this.config.sections)) {
      const field = section.fields.find(f => f.id === fieldId);
      if (field) {
        field.visible = true;
        this.saveConfig();
        return true;
      }
    }
    return false;
  }

  removeField(fieldId: string): boolean {
    for (const section of Object.values(this.config.sections)) {
      const fieldIndex = section.fields.findIndex(f => f.id === fieldId);
      if (fieldIndex !== -1) {
        section.fields.splice(fieldIndex, 1);
        this.saveConfig();
        return true;
      }
    }
    return false;
  }

  addCalculatedField(sectionId: string, field: FieldConfig & { calculation: string }): boolean {
    if (!this.config.sections[sectionId]) {
      return false;
    }
    
    const calculatedField: FieldConfig = {
      ...field,
      type: 'calculated',
      editable: false
    };
    
    this.config.sections[sectionId].fields.push(calculatedField);
    this.saveConfig();
    return true;
  }

  // New helper methods for enhanced intelligence
  
  private getAllFields(): FieldConfig[] {
    const fields: FieldConfig[] = [];
    for (const section of Object.values(this.config.sections)) {
      fields.push(...section.fields);
    }
    return fields;
  }
  
  private isFieldFindingRequest(request: string): boolean {
    return (
      request.includes('where is') ||
      request.includes('find') ||
      request.includes("can't see") ||
      request.includes("cannot see") ||
      request.includes('missing') ||
      request.includes('locate')
    );
  }
  
  private handleFieldFindingRequest(request: string, currentFields: FieldConfig[]): {
    success: boolean;
    config?: AssetRegisterConfig;
    changes?: string[];
    error?: string;
  } {
    const field = this.findFieldByName(request, currentFields);
    
    if (!field) {
      // Try to suggest similar field names
      const suggestions = this.findSimilarFields(request, currentFields);
      return {
        success: false,
        error: suggestions.length > 0 
          ? `Field not found. Did you mean: ${suggestions.map(f => f.label).join(', ')}?`
          : 'Field not found. You can add it by saying "Add [field name] field"'
      };
    }
    
    const section = this.config.sections[field.section];
    const sectionName = section ? section.label : field.section;
    
    if (!field.visible) {
      return {
        success: true,
        config: this.config,
        changes: [`Found "${field.label}" field in ${sectionName} section, but it's currently hidden. Would you like me to show it?`]
      };
    }
    
    return {
      success: true,
      config: this.config,
      changes: [`Found "${field.label}" field in ${sectionName} section. It should be visible in the property panel.`]
    };
  }
  
  private extractFieldNameFromRequest(request: string): string | null {
    // Extract potential field names from various patterns
    const patterns = [
      /(?:add|create|new|remove|delete|hide|show|find|where is)\s+([a-zA-Z\s]+?)(?:\s+field|$)/,
      /([a-zA-Z\s]+?)\s+(?:field|property)/,
      /"([^"]+)"/,
      /'([^']+)'/,
      // Handle "property year back" type phrases specifically
      /property\s+(year\s+back|back)/i,
      // Handle questions like "where is [field]"
      /where\s+is\s+([a-zA-Z\s]+?)(?:\s*\?|$)/i,
      // Handle "can't see [field]"
      /can'?t\s+see\s+([a-zA-Z\s]+?)(?:\s*\?|$)/i,
      // Handle simple field names like "remove test"
      /(?:remove|delete)\s+(\w+)$/i,
      // Handle "remove the [field]"
      /remove\s+the\s+([a-zA-Z\s]+?)(?:\s+field|$)/i
    ];
    
    for (const pattern of patterns) {
      const match = request.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }
    
    return null;
  }
  
  private handleSmartRemoval(request: string, currentFields: FieldConfig[]): {
    success: boolean;
    config?: AssetRegisterConfig;
    changes?: string[];
    error?: string;
  } {
    // Handle contextual removal requests
    if (request.includes('the field you added') || request.includes('field you added')) {
      return this.removeRecentlyAddedField(currentFields);
    }
    
    // Handle removal by field name
    const field = this.findFieldByName(request, currentFields);
    if (field) {
      const success = this.removeField(field.id);
      return {
        success,
        config: this.config,
        changes: success ? [`Removed ${field.label} field`] : []
      };
    }
    
    // If no specific field found, try to find recently added fields to suggest
    const recentFields = this.getRecentlyAddedFields(currentFields);
    if (recentFields.length > 0) {
      return {
        success: false,
        error: `Field not found. Recently added fields: ${recentFields.map(f => f.label).join(', ')}. Try "remove [field name]" to remove a specific field.`
      };
    }
    
    return {
      success: false,
      error: 'Could not find field to remove. Try "remove [field name]" or "list all fields" to see available fields.'
    };
  }
  
  private removeRecentlyAddedField(currentFields: FieldConfig[]): {
    success: boolean;
    config?: AssetRegisterConfig;
    changes?: string[];
    error?: string;
  } {
    // Look for recently added fields (dynamic fields that aren't in default config)
    const defaultFields = this.getDefaultConfig();
    const defaultFieldIds = new Set();
    
    for (const section of Object.values(defaultFields.sections)) {
      for (const field of section.fields) {
        defaultFieldIds.add(field.id);
      }
    }
    
    // Find fields that were added (not in default config)
    const addedFields = currentFields.filter(f => !defaultFieldIds.has(f.id));
    
    if (addedFields.length === 0) {
      return {
        success: false,
        error: 'No recently added fields found to remove.'
      };
    }
    
    // Remove the most recently added field (last in the list)
    const fieldToRemove = addedFields[addedFields.length - 1];
    const success = this.removeField(fieldToRemove.id);
    
    return {
      success,
      config: this.config,
      changes: success ? [`Removed ${fieldToRemove.label} field (most recently added)`] : []
    };
  }
  
  private getRecentlyAddedFields(currentFields: FieldConfig[]): FieldConfig[] {
    // Get fields that aren't in the default configuration
    const defaultFields = this.getDefaultConfig();
    const defaultFieldIds = new Set();
    
    for (const section of Object.values(defaultFields.sections)) {
      for (const field of section.fields) {
        defaultFieldIds.add(field.id);
      }
    }
    
    return currentFields.filter(f => !defaultFieldIds.has(f.id));
  }
  
  private extractActionFromRequest(request: string): string | null {
    if (request.includes('add') || request.includes('create') || request.includes('new')) return 'add';
    if (request.includes('remove') || request.includes('delete')) return 'remove';
    if (request.includes('hide')) return 'hide';
    if (request.includes('show') || request.includes('display') || request.includes('visible')) return 'show';
    return null;
  }
  
  private handleDynamicAction(action: string, fieldName: string, request: string): {
    success: boolean;
    config?: AssetRegisterConfig;
    changes?: string[];
    error?: string;
  } {
    const currentFields = this.getAllFields();
    
    switch (action) {
      case 'add':
        return this.handleSmartAddField(fieldName, request);
      case 'remove':
      case 'hide':
      case 'show':
        const field = this.findFieldByName(fieldName, currentFields);
        if (!field) {
          return {
            success: false,
            error: `Field "${fieldName}" not found. Available fields: ${currentFields.map(f => f.label).join(', ')}`
          };
        }
        
        const method = action === 'remove' ? this.removeField.bind(this) : 
                      action === 'hide' ? this.hideField.bind(this) : this.showField.bind(this);
        const success = method(field.id);
        const actionWord = action === 'remove' ? 'Removed' : action === 'hide' ? 'Hidden' : 'Shown';
        
        return {
          success,
          config: this.config,
          changes: success ? [`${actionWord} ${field.label} field`] : []
        };
    }
    
    return { success: false, error: 'Unknown action' };
  }
  
  private handleSmartAddField(fieldName: string, request: string): {
    success: boolean;
    config?: AssetRegisterConfig;
    changes?: string[];
    error?: string;
  } {
    // Intelligent field type detection
    const fieldType = this.detectFieldType(fieldName, request);
    const section = this.detectFieldSection(fieldName, request);
    const fieldId = this.generateFieldId(fieldName);
    
    // Check if field already exists
    const existingField = this.getAllFields().find(f => 
      f.label.toLowerCase() === fieldName.toLowerCase() ||
      f.id === fieldId
    );
    
    if (existingField) {
      if (!existingField.visible) {
        this.showField(existingField.id);
        return {
          success: true,
          config: this.config,
          changes: [`Field "${fieldName}" already exists but was hidden. I've made it visible.`]
        };
      }
      return {
        success: false,
        error: `Field "${fieldName}" already exists and is visible.`
      };
    }
    
    const fieldConfig: Partial<FieldConfig> = {
      id: fieldId,
      label: this.formatFieldLabel(fieldName),
      type: fieldType.type,
      field: fieldId,
      editable: true,
      visible: true,
      section: section,
      ...(fieldType.options && { options: fieldType.options }),
      ...(fieldType.description && { description: fieldType.description })
    };
    
    const success = this.addField(section, fieldConfig);
    return {
      success,
      config: this.config,
      changes: success ? [`Added ${fieldConfig.label} field (${fieldType.type}) to ${this.config.sections[section]?.label || section}`] : []
    };
  }
  
  private detectFieldType(fieldName: string, request: string): {
    type: FieldConfig['type'];
    options?: { value: string; label: string }[];
    description?: string;
  } {
    const lower = fieldName.toLowerCase();
    const requestLower = request.toLowerCase();
    
    // Currency fields
    if (lower.includes('price') || lower.includes('cost') || lower.includes('value') || 
        lower.includes('amount') || requestLower.includes('currency') || 
        requestLower.includes('money') || requestLower.includes('dollar')) {
      return { type: 'currency' };
    }
    
    // Date fields
    if (lower.includes('date') || lower.includes('year') || lower.includes('time') ||
        requestLower.includes('when') || requestLower.includes('date')) {
      return lower.includes('year') ? { type: 'number' } : { type: 'date' };
    }
    
    // Number fields
    if (lower.includes('count') || lower.includes('number') || lower.includes('size') ||
        lower.includes('area') || lower.includes('sqft') || lower.includes('units') ||
        requestLower.includes('number') || requestLower.includes('numeric')) {
      return { type: 'number' };
    }
    
    // Boolean fields
    if (lower.includes('is') || lower.includes('has') || lower.includes('active') ||
        lower.includes('enabled') || requestLower.includes('yes/no') || 
        requestLower.includes('true/false') || requestLower.includes('checkbox')) {
      return { type: 'boolean' };
    }
    
    // Select fields with common patterns
    if (lower.includes('status') || lower.includes('type') || lower.includes('category') ||
        requestLower.includes('dropdown') || requestLower.includes('select') ||
        requestLower.includes('options')) {
      
      // Provide smart defaults based on field name
      if (lower.includes('status')) {
        return {
          type: 'select',
          options: [
            { value: 'active', label: 'Active' },
            { value: 'inactive', label: 'Inactive' },
            { value: 'pending', label: 'Pending' }
          ]
        };
      }
      
      if (lower.includes('condition') || lower.includes('maintenance')) {
        return {
          type: 'select',
          options: [
            { value: 'excellent', label: 'Excellent' },
            { value: 'good', label: 'Good' },
            { value: 'fair', label: 'Fair' },
            { value: 'poor', label: 'Poor' }
          ]
        };
      }
      
      return { type: 'select', options: [] }; // Empty options to be filled later
    }
    
    // Default to text
    return { type: 'text' };
  }
  
  private detectFieldSection(fieldName: string, request: string): string {
    const lower = fieldName.toLowerCase();
    const requestLower = request.toLowerCase();
    
    // Location section
    if (lower.includes('address') || lower.includes('location') || lower.includes('country') ||
        lower.includes('city') || lower.includes('postal') || lower.includes('municipality')) {
      return 'location';
    }
    
    // Financial section
    if (lower.includes('value') || lower.includes('price') || lower.includes('cost') ||
        lower.includes('valuation') || lower.includes('amount') || lower.includes('financial')) {
      return 'financial';
    }
    
    // Client section
    if (lower.includes('client') || lower.includes('owner') || lower.includes('contact')) {
      return 'client';
    }
    
    // Ownership section
    if (lower.includes('ownership') || lower.includes('percentage') || lower.includes('share')) {
      return 'ownership';
    }
    
    // Location keywords in request
    if (requestLower.includes('location') || requestLower.includes('address')) {
      return 'location';
    }
    
    // Financial keywords in request
    if (requestLower.includes('financial') || requestLower.includes('money') || requestLower.includes('value')) {
      return 'financial';
    }
    
    // Default to property_details
    return 'property_details';
  }
  
  private generateFieldId(fieldName: string): string {
    return fieldName.toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .replace(/\s+/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
  }
  
  private formatFieldLabel(fieldName: string): string {
    return fieldName
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }
  
  private findFieldByName(request: string, fields: FieldConfig[]): FieldConfig | null {
    const searchTerms = this.extractSearchTerms(request);
    
    // Special handling for simple single word requests like "remove test"
    const simpleMatch = request.match(/(?:remove|delete|hide|show)\s+(\w+)$/i);
    if (simpleMatch && simpleMatch[1]) {
      const simpleTerm = simpleMatch[1].toLowerCase();
      // Try exact match first
      const exactMatch = fields.find(f => 
        f.label.toLowerCase() === simpleTerm ||
        f.id.toLowerCase() === simpleTerm
      );
      if (exactMatch) return exactMatch;
      
      // Then partial match
      const partialMatch = fields.find(f => 
        f.label.toLowerCase().includes(simpleTerm) ||
        f.id.toLowerCase().includes(simpleTerm)
      );
      if (partialMatch) return partialMatch;
    }
    
    // Exact label match
    for (const term of searchTerms) {
      const exactMatch = fields.find(f => 
        f.label.toLowerCase() === term.toLowerCase()
      );
      if (exactMatch) return exactMatch;
    }
    
    // Partial label match
    for (const term of searchTerms) {
      const partialMatch = fields.find(f => 
        f.label.toLowerCase().includes(term.toLowerCase()) ||
        term.toLowerCase().includes(f.label.toLowerCase())
      );
      if (partialMatch) return partialMatch;
    }
    
    // Field ID match
    for (const term of searchTerms) {
      const idMatch = fields.find(f => 
        f.id.toLowerCase().includes(term.toLowerCase()) ||
        f.field.toLowerCase().includes(term.toLowerCase())
      );
      if (idMatch) return idMatch;
    }
    
    return null;
  }
  
  private findSimilarFields(request: string, fields: FieldConfig[]): FieldConfig[] {
    const searchTerms = this.extractSearchTerms(request);
    const similar: { field: FieldConfig; score: number }[] = [];
    
    for (const field of fields) {
      let score = 0;
      const fieldWords = field.label.toLowerCase().split(' ');
      
      for (const term of searchTerms) {
        for (const word of fieldWords) {
          if (word.includes(term.toLowerCase()) || term.toLowerCase().includes(word)) {
            score += 1;
          }
        }
      }
      
      if (score > 0) {
        similar.push({ field, score });
      }
    }
    
    return similar
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(item => item.field);
  }
  
  private extractSearchTerms(request: string): string[] {
    // Extract meaningful words, excluding common words
    const commonWords = ['the', 'is', 'are', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'where', 'can', 'cannot', 'see', 'find', 'field', 'property'];
    
    return request
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 2 && !commonWords.includes(word));
  }
  
  private handleAddFieldRequest(request: string): {
    success: boolean;
    config?: AssetRegisterConfig;
    changes?: string[];
    error?: string;
  } {
    // Pre-defined common field additions
    if (request.includes('construction year') || request.includes('built year')) {
      const success = this.addField('property_details', {
        id: 'construction_year',
        label: 'Construction Year',
        type: 'number',
        field: 'construction_year',
        editable: true,
        visible: true,
        section: 'property_details'
      });
      
      return {
        success,
        config: this.config,
        changes: ['Added Construction Year field to Property Details']
      };
    }
    
    if (request.includes('maintenance') && (request.includes('status') || request.includes('condition'))) {
      const success = this.addField('property_details', {
        id: 'maintenance_status',
        label: 'Maintenance Status',
        type: 'select',
        field: 'maintenance_status',
        editable: true,
        visible: true,
        section: 'property_details',
        options: [
          { value: 'excellent', label: 'Excellent' },
          { value: 'good', label: 'Good' },
          { value: 'fair', label: 'Fair' },
          { value: 'poor', label: 'Poor' }
        ]
      });
      
      return {
        success,
        config: this.config,
        changes: ['Added Maintenance Status dropdown to Property Details']
      };
    }
    
    // Extract field name for dynamic addition
    const fieldName = this.extractFieldNameFromRequest(request);
    if (fieldName) {
      return this.handleSmartAddField(fieldName, request);
    }
    
    return {
      success: false,
      error: 'Please specify what field you want to add. For example: "Add construction year field" or "Add maintenance status dropdown"'
    };
  }
}

export const assetRegisterAI = new AssetRegisterAI();
export type { FieldConfig, AssetRegisterConfig }; 