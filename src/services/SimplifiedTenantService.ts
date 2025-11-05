import { supabase } from '../lib/supabase';
import { SimplifiedTenant, transformToSimplifiedTenant } from '../utils/simplifiedDataTransforms';
import { RentPaymentService } from './RentPaymentService';

// Simple tenant service that works with existing database structure
export class SimplifiedTenantService {
  // Create a new simplified tenant using existing database structure
  static async createSimplifiedTenant(tenantData: {
    name: string;
    phone?: string;
    email?: string;
    propertyId: string;
    unitNumber?: string;
    roomId?: string;
    roomName?: string;
    leaseStart?: Date;
    leaseEnd?: Date;
    monthlyRent?: number;
    depositAmount?: number;
    rentDueDay?: number; // Day of month rent is due (default: 1)
  }, organizationId?: string): Promise<SimplifiedTenant | null> {
    try {
      // Create tenant name with room info if it's an HMO
      const tenantName = tenantData.unitNumber 
        ? `${tenantData.name} (${tenantData.unitNumber})`
        : tenantData.name;

      // Insert into database using ACTUAL schema from database
      // Note: property/lease info is stored in tenant_data JSONB field
      const insertData: any = {
        tenant_type: 'individual', // REQUIRED field
        name: tenantName,
        email: tenantData.email || null,
        phone: tenantData.phone || null,
        status: 'active',
        tenant_data: {
          property_id: tenantData.propertyId,
          unit_number: tenantData.unitNumber || null,
          room_id: tenantData.roomId || null,
          room_name: tenantData.roomName || null,
          lease_start_date: tenantData.leaseStart?.toISOString().split('T')[0] || null,
          lease_end_date: tenantData.leaseEnd?.toISOString().split('T')[0] || null,
          monthly_rent: tenantData.monthlyRent || null,
          deposit_amount: tenantData.depositAmount || null,
          rent_due_day: tenantData.rentDueDay || 1,
          rent_status: tenantData.leaseStart ? 'current' : 'pending',
          onboarding_status: 'not_started',
          is_simplified_demo: true,
        }
      }

      // Add organization_id if provided
      if (organizationId) {
        insertData.organization_id = organizationId;
      }

      console.log('Attempting to insert tenant with data:', JSON.stringify(insertData, null, 2));
      
      const { data, error } = await supabase
        .from('tenants')
        .insert(insertData)
        .select()
        .single();

      if (error) {
        console.error('❌ SUPABASE ERROR creating tenant');
        console.error('Error object:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        console.error('Full error JSON:', JSON.stringify(error, null, 2));
        console.error('Data that was rejected:', JSON.stringify(insertData, null, 2));
        
        // Create a detailed error message
        const errorMsg = `Database error: ${error.message || 'Unknown error'}${error.details ? ' - ' + error.details : ''}${error.hint ? ' (Hint: ' + error.hint + ')' : ''}`;
        throw new Error(errorMsg);
      }

      // Get property info for the tenant
      const { data: property } = await supabase
        .from('properties')
        .select('address, property_data')
        .eq('id', tenantData.propertyId)
        .single();

      // Create a simplified tenant object with the additional data
      const simplifiedTenant: SimplifiedTenant = {
        id: data.id,
        name: tenantData.name, // Use original name without room info
        phone: data.phone || '',
        email: data.email || '',
        propertyId: tenantData.propertyId,
        propertyAddress: property?.address || 'Unknown Property',
        unitNumber: tenantData.unitNumber,
        roomId: tenantData.roomId,
        roomName: tenantData.roomName,
        leaseStart: tenantData.leaseStart,
        leaseEnd: tenantData.leaseEnd,
        monthlyRent: tenantData.monthlyRent || 0,
        rentStatus: tenantData.leaseStart ? 'current' : 'pending',
        depositAmount: tenantData.depositAmount || 0,
        onboardingStatus: 'not_started',
      };

      // Update property tenant count
      await this.updatePropertyTenantCount(tenantData.propertyId);

      // Generate payment periods if lease dates and rent are provided
      if (tenantData.leaseStart && tenantData.leaseEnd && tenantData.monthlyRent) {
        const rentDueDay = tenantData.rentDueDay || 1;
        const periods = RentPaymentService.generatePaymentPeriods(
          data.id,
          tenantData.propertyId,
          tenantData.leaseStart,
          tenantData.leaseEnd,
          tenantData.monthlyRent,
          rentDueDay,
          'monthly'
        );
        
        await RentPaymentService.savePaymentPeriods(
          data.id,
          tenantData.propertyId,
          periods,
          'monthly'
        );
      }

      return simplifiedTenant;
    } catch (error) {
      console.error('Error in createSimplifiedTenant:', error);
      return null;
    }
  }

  // Get all simplified tenants
  static async getSimplifiedTenants(organizationId?: string): Promise<SimplifiedTenant[]> {
    try {
      // Get tenants with simplified demo flag
      let query = supabase
        .from('tenants')
        .select('*')
        .eq('tenant_data->>is_simplified_demo', 'true');
      
      // Filter by organization if provided
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }
      
      const { data: tenants, error } = await query.order('name');

      if (error) {
        console.error('Error fetching simplified tenants:', error);
        return [];
      }

      if (!tenants || tenants.length === 0) {
        return [];
      }

      // Get property info for each tenant
      const propertyIds = [...new Set(tenants.map(t => t.tenant_data?.property_id).filter(Boolean))];
      const { data: properties } = await supabase
        .from('properties')
        .select('id, address, property_data')
        .in('id', propertyIds);

      const propertyMap = new Map(properties?.map(p => [p.id, p]) || []);

      // Transform tenants and calculate rent status for each
      const transformedTenants = await Promise.all(
        tenants.map(async (tenant) => {
          const propertyId = tenant.tenant_data?.property_id;
          const property = propertyMap.get(propertyId);
          
          // Calculate rent status using RentPaymentService
          const rentDueDay = tenant.rent_due_day || 1;
          const monthlyRent = tenant.monthly_rent || tenant.tenant_data?.monthly_rent || 0;
          const leaseStartRaw = tenant.lease_start || tenant.tenant_data?.lease_start_date;
          const leaseEndRaw = tenant.lease_end || tenant.tenant_data?.lease_end_date;
          const leaseStart = leaseStartRaw ? new Date(leaseStartRaw) : undefined;
          const leaseEnd = leaseEndRaw ? new Date(leaseEndRaw) : undefined;
          
          // Only calculate rent status if we have lease dates
          let rentStatusResult;
          if (leaseStart && leaseEnd) {
            rentStatusResult = await RentPaymentService.calculateRentStatus(
              tenant.id,
              rentDueDay,
              monthlyRent,
              leaseStart,
              leaseEnd
            );
          } else {
            rentStatusResult = { status: 'pending' as const };
          }
          
          return this.transformDatabaseTenantToSimplified(tenant, property, rentStatusResult);
        })
      );

      return transformedTenants;
    } catch (error) {
      console.error('Error in getSimplifiedTenants:', error);
      return [];
    }
  }

  // Transform database tenant to simplified format
  private static transformDatabaseTenantToSimplified(
    tenant: any, 
    property?: any,
    rentStatusResult?: { status: 'current' | 'overdue'; daysOverdue?: number }
  ): SimplifiedTenant {
    const tenantData = tenant.tenant_data || {};
    
    // Extract room info from name if it exists
    const nameMatch = tenant.name.match(/^(.+?)\s*\((.+?)\)$/);
    const actualName = nameMatch ? nameMatch[1] : tenant.name;
    const unitNumber = tenantData.unit_number || (nameMatch ? nameMatch[2] : undefined);

    const leaseStartRaw = tenant.lease_start || tenantData.lease_start_date;
    const leaseEndRaw = tenant.lease_end || tenantData.lease_end_date;
    const leaseStart = leaseStartRaw ? new Date(leaseStartRaw) : undefined;
    const leaseEnd = leaseEndRaw ? new Date(leaseEndRaw) : undefined;
    const monthlyRent = tenant.monthly_rent || tenantData.monthly_rent || 0;
    const rentStatus = rentStatusResult?.status || (leaseStart ? 'current' : 'pending');
    const rentDueDay = tenant.rent_due_day || 1;

    return {
      id: tenant.id,
      name: actualName,
      phone: tenant.phone || '',
      email: tenant.email || '',
      propertyId: tenant.property_id || tenantData.property_id || '',
      propertyAddress: property?.address || 'Unknown Property',
      unitNumber,
      roomId: tenantData.room_id,
      roomName: tenantData.room_name,
      leaseStart,
      leaseEnd,
      monthlyRent,
      rentStatus,
      daysOverdue: rentStatusResult?.daysOverdue,
      depositAmount: tenant.deposit_amount || tenantData.deposit_amount || 0,
      onboardingStatus: tenantData.onboarding_status || 'not_started',
      rentDueDay,
    };
  }



  // Update tenant with onboarding completion
  static async updateTenantOnboarding(tenantId: string, updates: Partial<SimplifiedTenant>): Promise<boolean> {
    try {
      // Prepare update object with both column-level and JSONB data
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      // Update basic tenant info
      if (updates.name !== undefined) {
        updateData.name = updates.name;
      }
      if (updates.email !== undefined) {
        updateData.email = updates.email;
      }
      if (updates.phone !== undefined) {
        updateData.phone = updates.phone;
      }

      // Update main columns
      if (updates.leaseStart) {
        updateData.lease_start = updates.leaseStart.toISOString().split('T')[0];
      }
      if (updates.leaseEnd) {
        updateData.lease_end = updates.leaseEnd.toISOString().split('T')[0];
      }
      if (updates.monthlyRent !== undefined) {
        updateData.monthly_rent = updates.monthlyRent;
      }
      if (updates.depositAmount !== undefined) {
        updateData.deposit_amount = updates.depositAmount;
      }
      if (updates.depositWeeks !== undefined) {
        updateData.deposit_weeks = updates.depositWeeks;
      }
      if (updates.rentDueDay !== undefined) {
        updateData.rent_due_day = updates.rentDueDay;
      }

      // Update onboarding status fields
      if (updates.onboardingStatus !== undefined) {
        updateData.onboarding_status = updates.onboardingStatus;
      }
      if (updates.onboardingProgress !== undefined) {
        updateData.onboarding_progress = updates.onboardingProgress;
      }
      if (updates.onboardingNotes !== undefined) {
        updateData.onboarding_notes = updates.onboardingNotes;
      }
      if (updates.onboardingCompletedAt) {
        updateData.onboarding_completed_at = updates.onboardingCompletedAt.toISOString();
      }

      // Update onboarding data (comprehensive JSONB)
      if (updates.onboardingData) {
        updateData.onboarding_data = updates.onboardingData;
      }

      // Also update tenant_data for backward compatibility
      const { data: currentTenant, error: fetchError } = await supabase
        .from('tenants')
        .select('tenant_data')
        .eq('id', tenantId)
        .single();

      if (!fetchError && currentTenant) {
        updateData.tenant_data = {
          ...currentTenant.tenant_data,
          lease_start_date: updates.leaseStart?.toISOString().split('T')[0] || currentTenant.tenant_data?.lease_start_date,
          lease_end_date: updates.leaseEnd?.toISOString().split('T')[0] || currentTenant.tenant_data?.lease_end_date,
          monthly_rent: updates.monthlyRent || currentTenant.tenant_data?.monthly_rent,
          deposit_amount: updates.depositAmount || currentTenant.tenant_data?.deposit_amount,
          onboarding_status: updates.onboardingStatus || currentTenant.tenant_data?.onboarding_status,
          onboarding_progress: updates.onboardingProgress || currentTenant.tenant_data?.onboarding_progress,
          onboarding_notes: updates.onboardingNotes || currentTenant.tenant_data?.onboarding_notes,
        };
      }

      const { error } = await supabase
        .from('tenants')
        .update(updateData)
        .eq('id', tenantId);

      if (error) {
        console.error('Error updating tenant onboarding:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateTenantOnboarding:', error);
      return false;
    }
  }

  // Update property tenant count
  private static async updatePropertyTenantCount(propertyId: string): Promise<void> {
    try {
      // Count active tenants for this property
      const { count, error: countError } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_data->>property_id', propertyId)
        .eq('status', 'active');

      if (countError) {
        console.error('Error counting tenants:', countError);
        return;
      }

      // Get current property data
      const { data: property, error: fetchError } = await supabase
        .from('properties')
        .select('property_data')
        .eq('id', propertyId)
        .single();

      if (fetchError) {
        console.error('Error fetching property for tenant count update:', fetchError);
        return;
      }

      // Update tenant count in property data
      const updatedPropertyData = {
        ...property.property_data,
        tenant_count: count || 0,
      };

      const { error: updateError } = await supabase
        .from('properties')
        .update({
          property_data: updatedPropertyData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', propertyId);

      if (updateError) {
        console.error('Error updating property tenant count:', updateError);
      }
    } catch (error) {
      console.error('Error in updatePropertyTenantCount:', error);
    }
  }

  // Delete a tenant
  static async deleteSimplifiedTenant(tenantId: string): Promise<boolean> {
    try {
      // Get tenant's property ID before deletion
      const { data: tenant, error: fetchError } = await supabase
        .from('tenants')
        .select('tenant_data')
        .eq('id', tenantId)
        .single();

      if (fetchError) {
        console.error('Error fetching tenant for deletion:', fetchError);
        return false;
      }

      const { error } = await supabase
        .from('tenants')
        .delete()
        .eq('id', tenantId);

      if (error) {
        console.error('Error deleting simplified tenant:', error);
        return false;
      }

      // Update property tenant count
      if (tenant?.tenant_data?.property_id) {
        await this.updatePropertyTenantCount(tenant.tenant_data.property_id);
      }

      return true;
    } catch (error) {
      console.error('Error in deleteSimplifiedTenant:', error);
      return false;
    }
  }
}