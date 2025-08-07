import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

const updatedValuationTemplate = {
  key: 'valuations',
  name: 'Group Valuations',
  description: 'Complete property valuation workflow with valuer assignment, field completion, and review process',
  category: 'valuation',
  stages: ['Valuer Assignment', 'Field Completion', 'Review & Approval'],
  workstreams: [
    {
      key: 'valuer_assignment',
      name: 'Valuer Assignment',
      description: 'Assign a qualified valuer to the property',
      fields: [
        { id: 'assigned_valuer', label: 'Assigned Valuer', type: 'select', options: ['John Smith', 'Jane Doe', 'Mike Johnson', 'Sarah Wilson'] },
        { id: 'assignment_date', label: 'Assignment Date', type: 'date' },
        { id: 'expected_completion', label: 'Expected Completion Date', type: 'date' },
        { id: 'special_instructions', label: 'Special Instructions', type: 'textarea' },
        { id: 'property_access_notes', label: 'Property Access Notes', type: 'textarea' }
      ]
    },
    {
      key: 'property_details',
      name: 'Property Details',
      description: 'Basic property information and identification',
      fields: [
        { id: 'asset_id', label: 'Asset ID', type: 'text' },
        { id: 'valuation_id', label: 'Valuation ID', type: 'text' },
        { id: 'property_name', label: 'Property Name', type: 'text' },
        { id: 'property_type', label: 'Property Type', type: 'select', options: ['Residential', 'Commercial', 'Industrial', 'Mixed Use'] },
        { id: 'property_subtype', label: 'Property Subtype', type: 'select', options: ['Apartment', 'Office', 'Retail', 'Warehouse', 'Hotel', 'Land'] }
      ]
    },
    {
      key: 'location_details',
      name: 'Location Details',
      description: 'Property location and address information',
      fields: [
        { id: 'street_address', label: 'Street Address', type: 'text' },
        { id: 'city', label: 'City', type: 'text' },
        { id: 'state', label: 'State/Province', type: 'text' },
        { id: 'postal_code', label: 'Postal Code', type: 'text' },
        { id: 'country', label: 'Country', type: 'text' },
        { id: 'latitude', label: 'Latitude', type: 'number' },
        { id: 'longitude', label: 'Longitude', type: 'number' },
        { id: 'cadastral_number', label: 'Cadastral Number', type: 'text' }
      ]
    },
    {
      key: 'physical_characteristics',
      name: 'Physical Characteristics',
      description: 'Physical property details and measurements',
      fields: [
        { id: 'total_area_sqm', label: 'Total Area (sqm)', type: 'number' },
        { id: 'gross_floor_area', label: 'Gross Floor Area (sqm)', type: 'number' },
        { id: 'net_floor_area', label: 'Net Floor Area (sqm)', type: 'number' },
        { id: 'number_of_floors', label: 'Number of Floors', type: 'number' },
        { id: 'year_built', label: 'Year Built', type: 'number' },
        { id: 'construction_type', label: 'Construction Type', type: 'select', options: ['Concrete', 'Steel', 'Wood', 'Mixed'] },
        { id: 'condition_rating', label: 'Condition Rating', type: 'select', options: ['Excellent', 'Good', 'Fair', 'Poor'] }
      ]
    },
    {
      key: 'market_analysis',
      name: 'Market Analysis',
      description: 'Market research and comparable analysis',
      fields: [
        { id: 'market_area', label: 'Market Area', type: 'text' },
        { id: 'market_trend', label: 'Market Trend', type: 'select', options: ['Rising', 'Stable', 'Declining'] },
        { id: 'comparable_sales', label: 'Number of Comparable Sales', type: 'number' },
        { id: 'avg_sale_price', label: 'Average Sale Price', type: 'currency' },
        { id: 'price_per_sqm', label: 'Price per sqm', type: 'currency' },
        { id: 'market_notes', label: 'Market Analysis Notes', type: 'textarea' }
      ]
    },
    {
      key: 'valuation_approach',
      name: 'Valuation Approach',
      description: 'Valuation methodology and calculations',
      fields: [
        { id: 'valuation_method', label: 'Primary Valuation Method', type: 'select', options: ['Sales Comparison', 'Income Capitalization', 'Cost Approach', 'Multiple Methods'] },
        { id: 'land_value', label: 'Land Value', type: 'currency' },
        { id: 'building_value', label: 'Building Value', type: 'currency' },
        { id: 'total_value', label: 'Total Property Value', type: 'currency' },
        { id: 'value_per_sqm', label: 'Value per sqm', type: 'currency' },
        { id: 'valuation_date', label: 'Valuation Date', type: 'date' },
        { id: 'valuation_notes', label: 'Valuation Notes', type: 'textarea' }
      ]
    },
    {
      key: 'supporting_documents',
      name: 'Supporting Documents',
      description: 'Photos, documents, and supporting evidence',
      fields: [
        { id: 'property_photos', label: 'Property Photos', type: 'file', accept: ['image/jpeg', 'image/png'], multiple: true },
        { id: 'floor_plans', label: 'Floor Plans', type: 'file', accept: ['application/pdf', 'image/jpeg'], multiple: true },
        { id: 'title_deeds', label: 'Title Deeds', type: 'file', accept: ['application/pdf'], multiple: true },
        { id: 'building_permits', label: 'Building Permits', type: 'file', accept: ['application/pdf'], multiple: true },
        { id: 'comparable_sales_data', label: 'Comparable Sales Data', type: 'file', accept: ['application/pdf', 'application/excel'], multiple: true }
      ]
    },
    {
      key: 'review_approval',
      name: 'Review & Approval',
      description: 'Internal review and approval process',
      fields: [
        { id: 'reviewer', label: 'Reviewer', type: 'select', options: ['Senior Valuer', 'Team Lead', 'Department Head'] },
        { id: 'review_date', label: 'Review Date', type: 'date' },
        { id: 'review_comments', label: 'Review Comments', type: 'textarea' },
        { id: 'approval_status', label: 'Approval Status', type: 'select', options: ['Approved', 'Rejected', 'Needs Revision'] },
        { id: 'revision_notes', label: 'Revision Notes', type: 'textarea' },
        { id: 'final_approval_date', label: 'Final Approval Date', type: 'date' },
        { id: 'approved_by', label: 'Approved By', type: 'text' }
      ]
    }
  ]
};

async function updateValuationTemplate() {
  try {
    console.log('🔍 Updating valuation template in database...');
    
    // First, find the existing valuation template
    const { data: existingTemplate, error: findError } = await supabase
      .from('workflow_templates')
      .select('*')
      .eq('key', 'valuations')
      .single();
    
    if (findError) {
      console.error('❌ Error finding template:', findError.message);
      return;
    }
    
    if (!existingTemplate) {
      console.log('📝 No existing valuation template found, creating new one...');
      
      const { data: newTemplate, error: insertError } = await supabase
        .from('workflow_templates')
        .insert([{
          key: updatedValuationTemplate.key,
          name: updatedValuationTemplate.name,
          description: updatedValuationTemplate.description,
          category: updatedValuationTemplate.category,
          stages: updatedValuationTemplate.stages,
          workstreams: updatedValuationTemplate.workstreams,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (insertError) {
        console.error('❌ Error creating template:', insertError.message);
        return;
      }
      
      console.log('✅ New valuation template created:', newTemplate);
    } else {
      console.log('📝 Updating existing valuation template...');
      
      const { data: updatedTemplate, error: updateError } = await supabase
        .from('workflow_templates')
        .update({
          name: updatedValuationTemplate.name,
          description: updatedValuationTemplate.description,
          category: updatedValuationTemplate.category,
          stages: updatedValuationTemplate.stages,
          workstreams: updatedValuationTemplate.workstreams,
          updated_at: new Date().toISOString()
        })
        .eq('id', existingTemplate.id)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Error updating template:', updateError.message);
        return;
      }
      
      console.log('✅ Valuation template updated successfully:', updatedTemplate);
    }
    
    console.log('🎯 Updated template structure:');
    console.log('- Stages:', updatedValuationTemplate.stages);
    console.log('- Workstreams:', updatedValuationTemplate.workstreams.length);
    updatedValuationTemplate.workstreams.forEach((ws, index) => {
      console.log(`  ${index + 1}. ${ws.name} (${ws.fields.length} fields)`);
    });
    
  } catch (err) {
    console.error('❌ General error:', err.message);
  }
}

updateValuationTemplate(); 