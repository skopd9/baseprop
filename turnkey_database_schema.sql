-- =================================================================
-- turnkey Complete Database Schema
-- Real Estate Operations System - Workflow Management
-- =================================================================

-- WARNING: This will drop existing tables and data!
-- Only run this on a fresh database or if you want to reset everything

-- 1. Drop existing tables (be careful - this will delete data!)
DROP TABLE IF EXISTS workstreams CASCADE;
DROP TABLE IF EXISTS workflow_instances CASCADE;
DROP TABLE IF EXISTS asset_register_configs CASCADE;
DROP TABLE IF EXISTS properties CASCADE;

-- 2. Create Asset Register Configuration table (AI field definitions)
CREATE TABLE asset_register_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL, -- "Default", "Extended", "Custom"
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  
  -- JSON configuration for field definitions
  config JSONB NOT NULL DEFAULT '{}',
  
  -- Metadata
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for JSONB queries
CREATE INDEX idx_asset_register_configs_config ON asset_register_configs USING GIN (config);

-- 3. Create hybrid Properties table (core + JSON flexibility)
CREATE TABLE properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Core immutable fields (always needed)
  asset_register_id TEXT UNIQUE NOT NULL, -- Human readable ID like '001', '002'
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  
  -- Reference to configuration
  config_id UUID REFERENCES asset_register_configs(id),
  
  -- All property data as flexible JSON
  property_data JSONB NOT NULL DEFAULT '{}',
  
  -- Core metadata
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'disposed', 'under_contract')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_properties_asset_register_id ON properties(asset_register_id);
CREATE INDEX idx_properties_config_id ON properties(config_id);
CREATE INDEX idx_properties_data ON properties USING GIN (property_data);
CREATE INDEX idx_properties_status ON properties(status);

-- 4. Create enhanced Workflow Instances table (Task Manager)
CREATE TABLE workflow_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID REFERENCES properties(id) ON DELETE CASCADE,
  template_id UUID REFERENCES workflow_templates(id),
  user_id UUID REFERENCES auth.users(id),
  
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'started', 'in_progress', 'completed', 'paused', 'cancelled')),
  
  -- Progress tracking
  current_workstream_id UUID, -- Will reference workstreams(id)
  completion_percentage INTEGER DEFAULT 0,
  
  -- Dates
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create enhanced Workstreams table with progression logic
CREATE TABLE workstreams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  workflow_instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
  template_workstream_key TEXT NOT NULL, -- Reference to template
  
  name TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL, -- Order in the workflow
  
  -- Field definitions and data
  fields JSONB NOT NULL DEFAULT '[]', -- Field definitions from template
  form_data JSONB NOT NULL DEFAULT '{}', -- User-entered data
  
  -- Status and progression
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'started', 'in_progress', 'completed', 'blocked', 'skipped')),
  
  -- Trigger conditions for next workstream
  completion_triggers JSONB DEFAULT '{}', -- Conditions to trigger next workstream
  can_start BOOLEAN DEFAULT false, -- Whether this workstream can start
  
  -- Assignment and tracking
  assignee_id UUID REFERENCES auth.users(id),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  due_date TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Add foreign key constraint for current_workstream_id
ALTER TABLE workflow_instances 
ADD CONSTRAINT fk_current_workstream 
FOREIGN KEY (current_workstream_id) REFERENCES workstreams(id);

-- 7. Create indexes for performance
CREATE INDEX idx_workflow_instances_property_id ON workflow_instances(property_id);
CREATE INDEX idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX idx_workstreams_workflow_instance_id ON workstreams(workflow_instance_id);
CREATE INDEX idx_workstreams_status ON workstreams(status);
CREATE INDEX idx_workstreams_order ON workstreams(workflow_instance_id, order_index);

-- 8. Insert default Asset Register configuration
INSERT INTO asset_register_configs (name, description, is_default, config) VALUES (
  'Default Configuration',
  'Standard Asset Register field configuration',
  true,
  '{
    "sections": {
      "basic": {
        "id": "basic",
        "label": "Basic Information",
        "visible": true,
        "columns": 2,
        "fields": [
          {
            "id": "name",
            "label": "Property Name",
            "type": "text",
            "field": "name",
            "editable": true,
            "visible": true,
            "section": "basic"
          },
          {
            "id": "asset_register_id",
            "label": "Asset Register ID",
            "type": "text",
            "field": "asset_register_id",
            "editable": false,
            "visible": true,
            "section": "basic"
          },
          {
            "id": "rei_asset_id",
            "label": "REI Asset ID",
            "type": "text",
            "field": "rei_asset_id",
            "editable": true,
            "visible": true,
            "section": "basic"
          },
          {
            "id": "pid",
            "label": "PID",
            "type": "text",
            "field": "pid",
            "editable": true,
            "visible": true,
            "section": "basic"
          },
          {
            "id": "valuation_id",
            "label": "Valuation ID",
            "type": "text",
            "field": "valuation_id",
            "editable": true,
            "visible": true,
            "section": "basic"
          },
          {
            "id": "status",
            "label": "Status",
            "type": "select",
            "field": "status",
            "editable": true,
            "visible": true,
            "section": "basic",
            "options": [
              {"value": "active", "label": "Active"},
              {"value": "disposed", "label": "Disposed"},
              {"value": "under_contract", "label": "Under Contract"}
            ]
          }
        ]
      },
      "location": {
        "id": "location",
        "label": "Location",
        "visible": true,
        "columns": 2,
        "fields": [
          {
            "id": "address",
            "label": "Address",
            "type": "text",
            "field": "address",
            "editable": true,
            "visible": true,
            "section": "location"
          },
          {
            "id": "country",
            "label": "Country",
            "type": "text",
            "field": "country",
            "editable": true,
            "visible": true,
            "section": "location"
          },
          {
            "id": "municipality",
            "label": "Municipality",
            "type": "text",
            "field": "municipality",
            "editable": true,
            "visible": true,
            "section": "location"
          },
          {
            "id": "postal_code",
            "label": "Postal Code",
            "type": "text",
            "field": "postal_code",
            "editable": true,
            "visible": true,
            "section": "location"
          },
          {
            "id": "cadastral_number",
            "label": "Cadastral Number",
            "type": "text",
            "field": "cadastral_number",
            "editable": true,
            "visible": true,
            "section": "location"
          }
        ]
      },
      "property_details": {
        "id": "property_details",
        "label": "Property Details",
        "visible": true,
        "columns": 2,
        "fields": [
          {
            "id": "property_type",
            "label": "Property Type",
            "type": "select",
            "field": "property_type",
            "editable": true,
            "visible": true,
            "section": "property_details",
            "options": [
              {"value": "land", "label": "Land"},
              {"value": "horizontal_properties", "label": "Horizontal Properties"},
              {"value": "stand_alone_buildings", "label": "Stand Alone Buildings"}
            ]
          },
          {
            "id": "property_sub_type",
            "label": "Property Sub Type",
            "type": "text",
            "field": "property_sub_type",
            "editable": true,
            "visible": true,
            "section": "property_details"
          },
          {
            "id": "units",
            "label": "Units",
            "type": "number",
            "field": "units",
            "editable": true,
            "visible": true,
            "section": "property_details"
          },
          {
            "id": "square_feet",
            "label": "Building Area (m²)",
            "type": "number",
            "field": "square_feet",
            "editable": true,
            "visible": true,
            "section": "property_details"
          },
          {
            "id": "land_area",
            "label": "Land Area (m²)",
            "type": "number",
            "field": "land_area",
            "editable": true,
            "visible": true,
            "section": "property_details"
          }
        ]
      },
      "financial": {
        "id": "financial",
        "label": "Financial Information",
        "visible": true,
        "columns": 2,
        "fields": [
          {
            "id": "current_value",
            "label": "Current Value",
            "type": "currency",
            "field": "current_value",
            "editable": true,
            "visible": true,
            "section": "financial"
          },
          {
            "id": "acquisition_price",
            "label": "Acquisition Price",
            "type": "currency",
            "field": "acquisition_price",
            "editable": true,
            "visible": true,
            "section": "financial"
          },
          {
            "id": "acquisition_date",
            "label": "Acquisition Date",
            "type": "date",
            "field": "acquisition_date",
            "editable": true,
            "visible": true,
            "section": "financial"
          }
        ]
      },
      "client": {
        "id": "client",
        "label": "Client & Portfolio",
        "visible": true,
        "columns": 2,
        "fields": [
          {
            "id": "client_name",
            "label": "Client Name",
            "type": "text",
            "field": "client_name",
            "editable": true,
            "visible": true,
            "section": "client"
          },
          {
            "id": "portfolio_name",
            "label": "Portfolio Name",
            "type": "text",
            "field": "portfolio_name",
            "editable": true,
            "visible": true,
            "section": "client"
          }
        ]
      },
      "ownership": {
        "id": "ownership",
        "label": "Ownership",
        "visible": true,
        "columns": 3,
        "fields": [
          {
            "id": "ownership_type",
            "label": "Ownership Type",
            "type": "text",
            "field": "ownership_type",
            "editable": true,
            "visible": true,
            "section": "ownership"
          },
          {
            "id": "ownership_percentage",
            "label": "Ownership %",
            "type": "number",
            "field": "ownership_percentage",
            "editable": true,
            "visible": true,
            "section": "ownership"
          },
          {
            "id": "remote_area",
            "label": "Remote Area",
            "type": "boolean",
            "field": "remote_area",
            "editable": true,
            "visible": true,
            "section": "ownership"
          }
        ]
      }
    }
  }'::jsonb
);

-- 9. Insert sample properties with JSON data structure
INSERT INTO properties (asset_register_id, name, address, config_id, property_data) VALUES
(
  '001', 
  'Sunset Plaza', 
  '1234 Sunset Blvd, Los Angeles, CA 90210',
  (SELECT id FROM asset_register_configs WHERE is_default = true),
  '{
    "property_type": "horizontal_properties",
    "property_sub_type": "retail",
    "municipality": "Los Angeles",
    "square_feet": 25000,
    "units": 15,
    "acquisition_price": 8500000,
    "current_value": 9200000,
    "client_name": "ABC Investment Group",
    "portfolio_name": "West Coast Retail"
  }'::jsonb
),
(
  '002', 
  'Riverside Apartments', 
  '5678 Riverside Dr, Austin, TX 78701',
  (SELECT id FROM asset_register_configs WHERE is_default = true),
  '{
    "property_type": "horizontal_properties",
    "property_sub_type": "maisonette",
    "municipality": "Austin",
    "square_feet": 18000,
    "units": 24,
    "acquisition_price": 4200000,
    "current_value": 4500000,
    "client_name": "Texas Holdings LLC",
    "portfolio_name": "Central Texas Residential"
  }'::jsonb
),
(
  '003', 
  'Downtown Office Tower', 
  '999 Main St, Chicago, IL 60601',
  (SELECT id FROM asset_register_configs WHERE is_default = true),
  '{
    "property_type": "stand_alone_buildings",
    "property_sub_type": "office",
    "municipality": "Chicago",
    "square_feet": 45000,
    "units": 8,
    "acquisition_price": 12500000,
    "current_value": 13200000,
    "client_name": "Midwest Commercial Fund",
    "portfolio_name": "Urban Office Portfolio"
  }'::jsonb
),
(
  '004', 
  'Industrial Plot A', 
  '123 Factory Rd, Detroit, MI 48201',
  (SELECT id FROM asset_register_configs WHERE is_default = true),
  '{
    "property_type": "land",
    "property_sub_type": "plot",
    "municipality": "Detroit",
    "square_feet": 50000,
    "units": 1,
    "acquisition_price": 2000000,
    "current_value": 2200000,
    "client_name": "Industrial Development Corp",
    "portfolio_name": "Manufacturing Properties"
  }'::jsonb
),
(
  '005', 
  'Marina Complex', 
  '456 Harbor View, Miami, FL 33101',
  (SELECT id FROM asset_register_configs WHERE is_default = true),
  '{
    "property_type": "horizontal_properties",
    "property_sub_type": "apartment",
    "municipality": "Miami",
    "square_feet": 30000,
    "units": 32,
    "acquisition_price": 6800000,
    "current_value": 7500000,
    "client_name": "Coastal Properties Inc",
    "portfolio_name": "Florida Waterfront"
  }'::jsonb
);

-- =================================================================
-- SCHEMA COMPLETE - JSON CONFIGURATION SYSTEM
-- =================================================================

-- Benefits of this new approach:
-- 1. AI can modify field configurations and store them in Supabase
-- 2. Flexible property data structure supports any fields
-- 3. Multiple configurations can coexist for different use cases
-- 4. Easy queries: SELECT property_data->>'current_value' FROM properties
-- 5. Full text search: SELECT * FROM properties WHERE property_data @> '{"municipality": "Austin"}'
-- 6. Complex filters: SELECT * FROM properties WHERE (property_data->>'current_value')::numeric > 5000000

-- Next steps:
-- 1. Run this SQL in Supabase SQL Editor
-- 2. Update frontend to work with JSON-based configs
-- 3. Update AI to save configurations to Supabase
-- 4. Test the new flexible field system
