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
  }): Promise<SimplifiedTenant | null> {
    try {
      // Create tenant name with room info if it's an HMO
      const tenantName = tenantData.unitNumber 
        ? `${tenantData.name} (${tenantData.unitNumber})`
        : tenantData.name;

      // Insert into database using actual schema
      const { data, error } = await supabase
        .from('tenants')
        .insert({
          tenant_type: 'individual',
          name: tenantName,
          phone: tenantData.phone,
          email: tenantData.email,
          status: 'active',
          property_id: tenantData.propertyId,
          lease_start: tenantData.leaseStart?.toISOString().split('T')[0] || null,
          lease_end: tenantData.leaseEnd?.toISOString().split('T')[0] || null,
          monthly_rent: tenantData.monthlyRent || null,
          rent_due_day: tenantData.rentDueDay || 1, // Default to 1st of month
          deposit_amount: tenantData.depositAmount || null,
          tenant_data: {
            property_id: tenantData.propertyId,
            unit_number: tenantData.unitNumber,
            room_id: tenantData.roomId,
            room_name: tenantData.roomName,
            lease_start_date: tenantData.leaseStart?.toISOString().split('T')[0],
            lease_end_date: tenantData.leaseEnd?.toISOString().split('T')[0],
            monthly_rent: tenantData.monthlyRent,
            deposit_amount: tenantData.depositAmount,
            rent_status: tenantData.leaseStart ? 'current' : 'pending',
            onboarding_status: 'not_started',
            is_simplified_demo: true,
          }
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating simplified tenant:', error);
        return null;
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
        leaseStart: tenantData.leaseStart || new Date(),
        leaseEnd: tenantData.leaseEnd || new Date(),
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
  static async getSimplifiedTenants(): Promise<SimplifiedTenant[]> {
    try {
      // Get tenants with simplified demo flag
      const { data: tenants, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('tenant_data->>is_simplified_demo', 'true')
        .order('name');

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
          const leaseStart = tenant.lease_start ? new Date(tenant.lease_start) : 
                           (tenant.tenant_data?.lease_start_date ? new Date(tenant.tenant_data.lease_start_date) : new Date());
          const leaseEnd = tenant.lease_end ? new Date(tenant.lease_end) : 
                         (tenant.tenant_data?.lease_end_date ? new Date(tenant.tenant_data.lease_end_date) : new Date());
          
          const rentStatusResult = await RentPaymentService.calculateRentStatus(
            tenant.id,
            rentDueDay,
            monthlyRent,
            leaseStart,
            leaseEnd
          );
          
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

    const leaseStart = tenant.lease_start ? new Date(tenant.lease_start) : 
                      (tenantData.lease_start_date ? new Date(tenantData.lease_start_date) : new Date());
    const leaseEnd = tenant.lease_end ? new Date(tenant.lease_end) : 
                    (tenantData.lease_end_date ? new Date(tenantData.lease_end_date) : new Date());
    const monthlyRent = tenant.monthly_rent || tenantData.monthly_rent || 0;
    const rentStatus = rentStatusResult?.status || 'current';
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
      // Get current tenant data
      const { data: currentTenant, error: fetchError } = await supabase
        .from('tenants')
        .select('tenant_data')
        .eq('id', tenantId)
        .single();

      if (fetchError) {
        console.error('Error fetching tenant for onboarding update:', fetchError);
        return false;
      }

      // Merge updates with existing tenant data
      const updatedTenantData = {
        ...currentTenant.tenant_data,
        lease_start_date: updates.leaseStart?.toISOString().split('T')[0] || currentTenant.tenant_data.lease_start_date,
        lease_end_date: updates.leaseEnd?.toISOString().split('T')[0] || currentTenant.tenant_data.lease_end_date,
        monthly_rent: updates.monthlyRent || currentTenant.tenant_data.monthly_rent,
        deposit_amount: updates.depositAmount || currentTenant.tenant_data.deposit_amount,
        rent_status: updates.rentStatus || currentTenant.tenant_data.rent_status,
        onboarding_status: updates.onboardingStatus || currentTenant.tenant_data.onboarding_status,
        onboarding_progress: updates.onboardingProgress || currentTenant.tenant_data.onboarding_progress,
        onboarding_notes: updates.onboardingNotes || currentTenant.tenant_data.onboarding_notes,
      };

      const { error } = await supabase
        .from('tenants')
        .update({
          tenant_data: updatedTenantData,
          updated_at: new Date().toISOString(),
        })
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