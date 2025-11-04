import { supabase } from '../lib/supabase';
import { OrganizationService } from '../services/OrganizationService';

export interface MigrationResult {
  success: boolean;
  organizationId: string | null;
  propertiesUpdated: number;
  tenantsUpdated: number;
  expensesUpdated: number;
  inspectionsUpdated: number;
  errors: string[];
}

/**
 * One-time migration utility to link existing data to an organization.
 * This ensures all data has proper organization_id and user_id for RLS policies.
 */
export async function migrateExistingDataToOrganization(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    organizationId: null,
    propertiesUpdated: 0,
    tenantsUpdated: 0,
    expensesUpdated: 0,
    inspectionsUpdated: 0,
    errors: [],
  };

  try {
    // 1. Get current authenticated user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      result.errors.push('User not authenticated');
      return result;
    }

    console.log('Starting migration for user:', user.id);

    // 2. Check if user already has an organization
    let orgId: string;
    const orgs = await OrganizationService.getUserOrganizations(user.id);
    
    if (orgs.length === 0) {
      console.log('No organization found, creating new one...');
      
      // Create new organization
      const org = await OrganizationService.createOrganization(
        'My Property Management Company',
        user.id
      );
      
      orgId = org.id;
      console.log('Created organization:', orgId);
    } else {
      orgId = orgs[0].id;
      console.log('Using existing organization:', orgId);
    }

    result.organizationId = orgId;

    // 3. Update all properties without organization_id
    console.log('Updating properties...');
    const { data: updatedProps, error: propsError } = await supabase
      .from('properties')
      .update({ organization_id: orgId })
      .is('organization_id', null)
      .select('id');
    
    if (propsError) {
      result.errors.push(`Properties error: ${propsError.message}`);
      console.error('Error updating properties:', propsError);
    } else {
      result.propertiesUpdated = updatedProps?.length || 0;
      console.log(`Updated ${result.propertiesUpdated} properties`);
    }

    // 4. Update all tenants without organization_id
    console.log('Updating tenants...');
    const { data: updatedTenants, error: tenantsError } = await supabase
      .from('tenants')
      .update({ organization_id: orgId })
      .is('organization_id', null)
      .select('id');
    
    if (tenantsError) {
      result.errors.push(`Tenants error: ${tenantsError.message}`);
      console.error('Error updating tenants:', tenantsError);
    } else {
      result.tenantsUpdated = updatedTenants?.length || 0;
      console.log(`Updated ${result.tenantsUpdated} tenants`);
    }

    // 5. Update all expenses without organization_id
    console.log('Updating expenses...');
    const { data: updatedExpenses, error: expensesError } = await supabase
      .from('expenses')
      .update({ 
        organization_id: orgId,
        user_id: user.id  // Attribute existing expenses to migrating user
      })
      .is('organization_id', null)
      .select('id');
    
    if (expensesError) {
      result.errors.push(`Expenses error: ${expensesError.message}`);
      console.error('Error updating expenses:', expensesError);
    } else {
      result.expensesUpdated = updatedExpenses?.length || 0;
      console.log(`Updated ${result.expensesUpdated} expenses`);
    }

    // 6. Update all inspections without organization_id
    console.log('Updating inspections...');
    const { data: updatedInspections, error: inspectionsError } = await supabase
      .from('inspections')
      .update({ 
        organization_id: orgId,
        user_id: user.id  // Attribute existing inspections to migrating user
      })
      .is('organization_id', null)
      .select('id');
    
    if (inspectionsError) {
      result.errors.push(`Inspections error: ${inspectionsError.message}`);
      console.error('Error updating inspections:', inspectionsError);
    } else {
      result.inspectionsUpdated = updatedInspections?.length || 0;
      console.log(`Updated ${result.inspectionsUpdated} inspections`);
    }

    // Mark as success if we have an organization (even if some updates failed)
    result.success = result.organizationId !== null;

    console.log('Migration complete:', result);
    return result;

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    result.errors.push(`Migration failed: ${errorMessage}`);
    console.error('Migration error:', error);
    return result;
  }
}

/**
 * Check if migration is needed by counting records without organization_id
 */
export async function checkMigrationNeeded(): Promise<{
  needed: boolean;
  propertiesWithoutOrg: number;
  tenantsWithoutOrg: number;
  expensesWithoutOrg: number;
  inspectionsWithoutOrg: number;
}> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return {
        needed: false,
        propertiesWithoutOrg: 0,
        tenantsWithoutOrg: 0,
        expensesWithoutOrg: 0,
        inspectionsWithoutOrg: 0,
      };
    }

    // Count properties without organization_id
    const { count: propsCount } = await supabase
      .from('properties')
      .select('id', { count: 'exact', head: true })
      .is('organization_id', null);

    // Count tenants without organization_id
    const { count: tenantsCount } = await supabase
      .from('tenants')
      .select('id', { count: 'exact', head: true })
      .is('organization_id', null);

    // Count expenses without organization_id
    const { count: expensesCount } = await supabase
      .from('expenses')
      .select('id', { count: 'exact', head: true })
      .is('organization_id', null);

    // Count inspections without organization_id
    const { count: inspectionsCount } = await supabase
      .from('inspections')
      .select('id', { count: 'exact', head: true })
      .is('organization_id', null);

    const needed = (propsCount || 0) > 0 || 
                   (tenantsCount || 0) > 0 || 
                   (expensesCount || 0) > 0 || 
                   (inspectionsCount || 0) > 0;

    return {
      needed,
      propertiesWithoutOrg: propsCount || 0,
      tenantsWithoutOrg: tenantsCount || 0,
      expensesWithoutOrg: expensesCount || 0,
      inspectionsWithoutOrg: inspectionsCount || 0,
    };
  } catch (error) {
    console.error('Error checking migration status:', error);
    return {
      needed: false,
      propertiesWithoutOrg: 0,
      tenantsWithoutOrg: 0,
      expensesWithoutOrg: 0,
      inspectionsWithoutOrg: 0,
    };
  }
}

