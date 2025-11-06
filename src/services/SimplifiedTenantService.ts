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
      // Try to get tenant_data for backward compatibility, but don't fail if it doesn't work
      let existingTenantData: any = {};
      
      try {
        const { data: tenantData, error: getError } = await supabase
          .from('tenants')
          .select('tenant_data')
          .eq('id', tenantId)
          .maybeSingle();

        if (!getError && tenantData && tenantData.tenant_data) {
          existingTenantData = tenantData.tenant_data;
          console.log('✓ Fetched existing tenant_data');
        } else if (getError) {
          console.warn('⚠️ Could not fetch tenant_data (non-critical):', getError.message);
        }
      } catch (fetchErr) {
        console.warn('⚠️ Error fetching tenant_data (non-critical):', fetchErr);
      }

      // Prepare update object with both column-level and JSONB data
      const updateData: any = {
        updated_at: new Date().toISOString(),
      };

      // IMPORTANT: Only include organization_id if we successfully fetched it
      // Don't try to set it if we don't have it - let RLS handle it
      // Note: We should NOT update organization_id anyway, so we'll omit it

      // Update basic tenant info - only include defined values
      if (updates.name !== undefined && updates.name !== null) {
        updateData.name = updates.name;
      }
      if (updates.email !== undefined && updates.email !== null) {
        updateData.email = updates.email;
      }
      if (updates.phone !== undefined && updates.phone !== null) {
        updateData.phone = updates.phone;
      }

      // Update main columns - only include defined values and valid dates
      if (updates.leaseStart !== undefined && updates.leaseStart !== null) {
        try {
          // Handle both Date objects and string dates
          const leaseStartDate = updates.leaseStart instanceof Date 
            ? updates.leaseStart 
            : new Date(updates.leaseStart);
          // Only add if it's a valid date
          if (!isNaN(leaseStartDate.getTime())) {
            updateData.lease_start = leaseStartDate.toISOString().split('T')[0];
          }
        } catch (e) {
          console.warn('Invalid lease start date:', updates.leaseStart);
        }
      }
      if (updates.leaseEnd !== undefined && updates.leaseEnd !== null) {
        try {
          // Handle both Date objects and string dates
          const leaseEndDate = updates.leaseEnd instanceof Date 
            ? updates.leaseEnd 
            : new Date(updates.leaseEnd);
          // Only add if it's a valid date
          if (!isNaN(leaseEndDate.getTime())) {
            updateData.lease_end = leaseEndDate.toISOString().split('T')[0];
          }
        } catch (e) {
          console.warn('Invalid lease end date:', updates.leaseEnd);
        }
      }
      // Track if we're updating rent or deposit weeks - if so, don't send deposit_amount (let trigger calculate)
      const isUpdatingRentOrWeeks = (updates.monthlyRent !== undefined && updates.monthlyRent !== null) ||
                                    (updates.depositWeeks !== undefined && updates.depositWeeks !== null);
      
      if (updates.monthlyRent !== undefined && updates.monthlyRent !== null) {
        updateData.monthly_rent = updates.monthlyRent;
      }
      
      // deposit_weeks - UK max is 5 weeks, auto-calculates deposit_amount via trigger
      if (updates.depositWeeks !== undefined && updates.depositWeeks !== null) {
        if (typeof updates.depositWeeks === 'number' && updates.depositWeeks >= 1 && updates.depositWeeks <= 5) {
          updateData.deposit_weeks = updates.depositWeeks;
        }
      }
      
      // deposit_amount is AUTO-CALCULATED by database trigger when monthly_rent or deposit_weeks changes
      // Only send deposit_amount if:
      // 1. It's explicitly set to a non-zero value AND
      // 2. We're NOT updating monthly_rent or deposit_weeks (manual override only)
      // Otherwise, let the trigger calculate it automatically
      if (!isUpdatingRentOrWeeks && 
          updates.depositAmount !== undefined && 
          updates.depositAmount !== null && 
          updates.depositAmount > 0) {
        // Manual override - user wants a specific deposit amount (only when not changing rent/weeks)
        updateData.deposit_amount = updates.depositAmount;
      }
      // If we're updating rent or weeks, deposit_amount will be auto-calculated by the trigger
      if (updates.rentDueDay !== undefined && updates.rentDueDay !== null) {
        updateData.rent_due_day = updates.rentDueDay;
      }

      // Update onboarding status fields - only include defined values
      if (updates.onboardingStatus !== undefined && updates.onboardingStatus !== null) {
        updateData.onboarding_status = updates.onboardingStatus;
      }
      if (updates.onboardingProgress !== undefined && updates.onboardingProgress !== null) {
        updateData.onboarding_progress = updates.onboardingProgress;
      }
      if (updates.onboardingNotes !== undefined && updates.onboardingNotes !== null) {
        updateData.onboarding_notes = updates.onboardingNotes;
      }
      if (updates.onboardingCompletedAt !== undefined && updates.onboardingCompletedAt !== null) {
        try {
          // Handle both Date objects and string dates
          const completedDate = updates.onboardingCompletedAt instanceof Date 
            ? updates.onboardingCompletedAt 
            : new Date(updates.onboardingCompletedAt);
          // Only add if it's a valid date
          if (!isNaN(completedDate.getTime())) {
            updateData.onboarding_completed_at = completedDate.toISOString();
          }
        } catch (e) {
          console.warn('Invalid onboarding completed date:', updates.onboardingCompletedAt);
        }
      }

      // Update onboarding data (comprehensive JSONB) - only if provided
      if (updates.onboardingData !== undefined && updates.onboardingData !== null) {
        updateData.onboarding_data = updates.onboardingData;
      }

      // Also update tenant_data for backward compatibility
      // Always update tenant_data (we have existingTenantData initialized to {})
      {
        // Handle date conversions for tenant_data JSONB
        let leaseStartStr = existingTenantData.lease_start_date;
        if (updates.leaseStart !== undefined && updates.leaseStart !== null) {
          try {
            const leaseStartDate = updates.leaseStart instanceof Date 
              ? updates.leaseStart 
              : new Date(updates.leaseStart);
            if (!isNaN(leaseStartDate.getTime())) {
              leaseStartStr = leaseStartDate.toISOString().split('T')[0];
            }
          } catch (e) {
            console.warn('Invalid lease start date for tenant_data:', updates.leaseStart);
          }
        }
        
        let leaseEndStr = existingTenantData.lease_end_date;
        if (updates.leaseEnd !== undefined && updates.leaseEnd !== null) {
          try {
            const leaseEndDate = updates.leaseEnd instanceof Date 
              ? updates.leaseEnd 
              : new Date(updates.leaseEnd);
            if (!isNaN(leaseEndDate.getTime())) {
              leaseEndStr = leaseEndDate.toISOString().split('T')[0];
            }
          } catch (e) {
            console.warn('Invalid lease end date for tenant_data:', updates.leaseEnd);
          }
        }
        
        updateData.tenant_data = {
          ...existingTenantData,
          ...(leaseStartStr && { lease_start_date: leaseStartStr }),
          ...(leaseEndStr && { lease_end_date: leaseEndStr }),
          ...(updates.monthlyRent !== undefined && { monthly_rent: updates.monthlyRent }),
          // deposit_amount is now auto-calculated by database trigger, so we don't store it in tenant_data
          // Only include if it's a manual override (non-zero)
          ...(updates.depositAmount !== undefined && updates.depositAmount > 0 && { deposit_amount: updates.depositAmount }),
          ...(updates.onboardingStatus && { onboarding_status: updates.onboardingStatus }),
          ...(updates.onboardingProgress !== undefined && { onboarding_progress: updates.onboardingProgress }),
          ...(updates.onboardingNotes !== undefined && { onboarding_notes: updates.onboardingNotes }),
        };
      }

      console.log('📝 Final update data to be sent to Supabase:', JSON.stringify(updateData, null, 2));
      
      // Make the update request
      try {
        const updateResponse = await supabase
          .from('tenants')
          .update(updateData)
          .eq('id', tenantId)
          .select();

        const { data: result, error } = updateResponse;

        if (error) {
          // Log comprehensive error information
          console.error('❌ ========== SUPABASE UPDATE ERROR ==========');
          console.error('❌ Error object:', error);
          console.error('❌ Error message:', error.message);
          console.error('❌ Error details:', error.details);
          console.error('❌ Error hint:', error.hint);
          console.error('❌ Error code:', error.code);
          
          // Try to get more info from the response
          const errorAny = error as any;
          console.error('❌ Full error (any):', errorAny);
          
          if (errorAny.response) {
            console.error('❌ Response:', errorAny.response);
            console.error('❌ Response data:', errorAny.response?.data);
            console.error('❌ Response status:', errorAny.response?.status);
          }
          if (errorAny.status) {
            console.error('❌ HTTP Status:', errorAny.status);
          }
          if (errorAny.statusText) {
            console.error('❌ Status Text:', errorAny.statusText);
          }
          
          // Try to stringify the entire error
          try {
            console.error('❌ Error JSON:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2));
          } catch (e) {
            console.error('❌ Could not stringify error:', e);
          }
          
          // Log the actual data we tried to send
          console.error('❌ Data that caused error:', JSON.stringify(updateData, null, 2));
          console.error('❌ Tenant ID:', tenantId);
          console.error('❌ ===========================================');
          
          return false;
        }

        if (!result || result.length === 0) {
          console.error('❌ Update succeeded but no rows returned - possible RLS issue');
          console.error('❌ This usually means RLS policies are blocking the update');
          return false;
        }

        console.log('✅ Tenant updated successfully!', result);
        return true;
      } catch (updateError) {
        // Catch any exceptions during the update
        console.error('❌ ========== EXCEPTION DURING UPDATE ==========');
        console.error('❌ Exception:', updateError);
        console.error('❌ Exception type:', typeof updateError);
        console.error('❌ Exception constructor:', updateError?.constructor?.name);
        
        if (updateError instanceof Error) {
          console.error('❌ Error message:', updateError.message);
          console.error('❌ Error stack:', updateError.stack);
        }
        
        try {
          console.error('❌ Exception JSON:', JSON.stringify(updateError, Object.getOwnPropertyNames(updateError), 2));
        } catch (e) {
          console.error('❌ Could not stringify exception');
        }
        
        console.error('❌ Data that caused exception:', JSON.stringify(updateData, null, 2));
        console.error('❌ ===========================================');
        return false;
      }
    } catch (error) {
      console.error('❌ Exception in updateTenantOnboarding:', error);
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