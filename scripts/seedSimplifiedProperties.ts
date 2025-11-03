import { supabase } from '../src/lib/supabase';
import { mockSimplifiedProperties, mockSimplifiedTenants } from '../src/lib/simplifiedMockData';

/**
 * Seeds the database with simplified landlord demo properties and tenants
 * This script should be run once to populate the database with demo data
 */
export async function seedSimplifiedProperties() {
  console.log('🌱 Starting simplified properties seeding...');

  try {
    // Check if simplified properties already exist
    const { data: existingProperties, error: checkError } = await supabase
      .from('properties')
      .select('id')
      .eq('property_data->>is_simplified_demo', 'true')
      .limit(1);

    if (checkError) {
      console.error('Error checking existing properties:', checkError);
      return false;
    }

    if (existingProperties && existingProperties.length > 0) {
      console.log('✅ Simplified properties already exist in database');
      return true;
    }

    console.log('📝 Seeding simplified properties...');

    // Insert simplified properties
    const propertiesToInsert = mockSimplifiedProperties.map((property, index) => ({
      asset_register_id: `DEMO-${String(index + 1).padStart(3, '0')}`,
      name: `Property at ${property.address}`,
      address: property.address,
      status: property.status === 'maintenance' ? 'maintenance' : 'active',
      property_data: {
        property_type: 'residential',
        property_sub_type: property.propertyType,
        bedrooms: property.bedrooms,
        bathrooms: property.bathrooms,
        monthly_rent: property.monthlyRent,
        units: property.units,
        tenant_count: property.tenantCount,
        is_simplified_demo: true,
      }
    }));

    const { data: insertedProperties, error: propertiesError } = await supabase
      .from('properties')
      .insert(propertiesToInsert)
      .select();

    if (propertiesError) {
      console.error('Error inserting properties:', propertiesError);
      return false;
    }

    console.log(`✅ Inserted ${insertedProperties?.length || 0} properties`);

    // Create a mapping from mock property IDs to real database IDs
    const propertyIdMap = new Map<string, string>();
    mockSimplifiedProperties.forEach((mockProperty, index) => {
      if (insertedProperties && insertedProperties[index]) {
        propertyIdMap.set(mockProperty.id, insertedProperties[index].id);
      }
    });

    console.log('📝 Seeding simplified tenants...');

    // Insert simplified tenants
    const tenantsToInsert = mockSimplifiedTenants
      .filter(tenant => propertyIdMap.has(tenant.propertyId))
      .map(tenant => ({
        name: tenant.name,
        phone: tenant.phone,
        email: tenant.email,
        property_id: propertyIdMap.get(tenant.propertyId),
        lease_start_date: tenant.leaseStart.toISOString().split('T')[0],
        lease_end_date: tenant.leaseEnd.toISOString().split('T')[0],
        status: 'active',
      }));

    const { data: insertedTenants, error: tenantsError } = await supabase
      .from('tenants')
      .insert(tenantsToInsert)
      .select();

    if (tenantsError) {
      console.error('Error inserting tenants:', tenantsError);
      return false;
    }

    console.log(`✅ Inserted ${insertedTenants?.length || 0} tenants`);

    console.log('🎉 Simplified properties seeding completed successfully!');
    return true;

  } catch (error) {
    console.error('❌ Error during seeding:', error);
    return false;
  }
}

// Run the seeding if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  seedSimplifiedProperties()
    .then((success) => {
      process.exit(success ? 0 : 1);
    })
    .catch((error) => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}