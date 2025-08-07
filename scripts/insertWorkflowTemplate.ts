import 'dotenv/config';
import { supabase } from '../src/lib/supabase';

const template = {
  key: 'valuations',
  name: 'Group Valuations',
  stages: ['In Progress', 'Under Review', 'Completed'],
  workstreams: [
    {
      key: 'valuation_general',
      name: 'Valuation Details Collection',
      fields: [
        { id: 'asset_id', label: 'Asset ID', type: 'text' },
        { id: 'valuation_id', label: 'Valuation ID', type: 'text' },
        { id: 'work_type', label: 'Type of Work', type: 'select', options: ['Inspection', 'Market', 'Other'] },
        { id: 'inspection_type', label: 'Inspection Type', type: 'select', options: [] },
        { id: 'asset_type', label: 'Asset Type', type: 'select', options: [] },
        { id: 'asset_subtype', label: 'Asset Subtype', type: 'select', options: [] }
      ]
    },
    {
      key: 'valuation_location',
      name: 'Location',
      fields: [
        { id: 'street_address', label: 'Street Address', type: 'text' },
        { id: 'cadastral_number', label: 'Cadastral Number', type: 'text' },
        { id: 'country', label: 'Country', type: 'text' },
        { id: 'latitude', label: 'Latitude', type: 'number' },
        { id: 'longitude', label: 'Longitude', type: 'number' },
        { id: 'municipality', label: 'Municipality', type: 'text' },
        { id: 'postal_code', label: 'Postal Code', type: 'text' }
      ]
    },
    {
      key: 'valuation_description',
      name: 'Description',
      fields: [
        { id: 'site_frontage', label: 'Site Frontage', type: 'select', options: [] },
        { id: 'visibility', label: 'Visibility (commercial)', type: 'select', options: [] },
        { id: 'public_transport', label: 'Public Transport', type: 'select', options: [] },
        { id: 'infrastructure', label: 'Infrastructure Quality', type: 'select', options: [] },
        { id: 'parking', label: 'Free Parking', type: 'select', options: ['Yes', 'No'] },
        { id: 'pollution', label: 'Pollution Level', type: 'select', options: [] },
        { id: 'description', label: 'General Description', type: 'textarea' }
      ]
    },
    {
      key: 'valuation_photos',
      name: 'Photos',
      fields: [
        { id: 'photos', label: 'Property Photos', type: 'file', accept: ['image/jpeg', 'image/png'], multiple: true }
      ]
    },
    {
      key: 'valuation_legal',
      name: 'Legal Status',
      fields: [
        { id: 'identification_title', label: 'Identification Title', type: 'text' },
        { id: 'owner_rights', label: 'Owner Rights', type: 'text' },
        { id: 'risk_analysis', label: 'Risk Analysis', type: 'textarea' }
      ]
    },
    {
      key: 'valuation_technical',
      name: 'Technical Status',
      fields: []
    },
    {
      key: 'valuation_plot_features',
      name: 'Plot Features',
      fields: [
        { id: 'total_field_area', label: 'Total Field Area (sqm)', type: 'number' },
        { id: 'land_area_contract', label: 'Land Area Contract (sqm)', type: 'number' },
        { id: 'vertical_ownership_area', label: 'Vertical Ownership Area (sqm)', type: 'number' },
        { id: 'coownership_percentage', label: 'Co-ownership %', type: 'number' }
      ]
    },
    {
      key: 'valuation_building_features',
      name: 'Building Features',
      fields: [
        { id: 'floor', label: 'Floor', type: 'text' },
        { id: 'building_area', label: 'Area (sqm)', type: 'number' },
        { id: 'permit_year', label: 'Year of Permit', type: 'number' },
        { id: 'completion_year', label: 'Year of Completion', type: 'number' },
        { id: 'rooms', label: 'Number of Rooms', type: 'number' },
        { id: 'has_pool', label: 'Swimming Pool', type: 'select', options: ['Yes', 'No'] }
      ]
    },
    {
      key: 'valuation_urban_planning',
      name: 'Urban Planning Legality',
      fields: [
        { id: 'irreversible_violations', label: 'Irreversible Violations', type: 'select', options: ['Yes', 'No'] },
        { id: 'reversible_violations', label: 'Reversible Violations', type: 'select', options: ['Yes', 'No'] },
        { id: 'legality_risk_analysis', label: 'Risk Analysis', type: 'textarea' }
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
  ]
};

async function insertTemplate() {
  const { data, error } = await supabase
    .from('workflow_templates')
    .insert([
      {
        key: template.key,
        name: template.name,
        stages: template.stages,
        workstreams: template.workstreams,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    ]);

  if (error) {
    console.error('Error inserting workflow template:', error);
    process.exit(1);
  }
  console.log('Workflow template inserted successfully:', data);
  process.exit(0);
}

insertTemplate(); 