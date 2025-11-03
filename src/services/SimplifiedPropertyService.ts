import { supabase } from '../lib/supabase';
import { SimplifiedProperty, SimplifiedTenant, transformToSimplifiedProperty, transformToSimplifiedTenant } from '../utils/simplifiedDataTransforms';
import { RentPaymentService } from './RentPaymentService';

export class SimplifiedPropertyService {
  // Get all simplified properties from database
  static async getSimplifiedProperties(): Promise<SimplifiedProperty[]> {
    try {
      const { data, error } = await supabase
        .from('properties')
        .select('*')
        .order('created_at', { ascending: false});

      if (error) {
        console.error('Error fetching simplified properties:', error);
        return [];
      }

      if (!data) return [];

      // Get tenant counts for all properties
      const propertyIds = data.map(p => p.id);
      const { data: tenantCounts, error: tenantError } = await supabase
        .from('tenants')
        .select('property_id')
        .eq('status', 'active')
        .in('property_id', propertyIds);

      if (tenantError) {
        console.error('Error fetching tenant counts:', tenantError);
      }

      // Create a map of property ID to tenant count
      const tenantCountMap = new Map<string, number>();
      if (tenantCounts) {
        tenantCounts.forEach(tenant => {
          const propertyId = tenant.property_id;
          if (propertyId) {
            tenantCountMap.set(propertyId, (tenantCountMap.get(propertyId) || 0) + 1);
          }
        });
      }

      return data.map(property => {
        const actualTenantCount = tenantCountMap.get(property.id) || 0;
        return transformToSimplifiedProperty(property, actualTenantCount);
      });
    } catch (error) {
      console.error('Error in getSimplifiedProperties:', error);
      return [];
    }
  }

  // Get all simplified tenants from database
  static async getSimplifiedTenants(): Promise<SimplifiedTenant[]> {
    try {
      const { data, error } = await supabase
        .from('tenants')
        .select(`
          *,
          properties!inner(
            id,
            address,
            property_data
          )
        `)
        .or('tenant_data->>is_simplified_demo.eq.true,properties.property_data->>is_simplified_demo.eq.true')
        .order('name');

      if (error) {
        console.error('Error fetching simplified tenants:', error);
        return [];
      }

      return data?.map(tenant => transformToSimplifiedTenant(tenant, tenant.properties)) || [];
    } catch (error) {
      console.error('Error in getSimplifiedTenants:', error);
      return [];
    }
  }

  // Create a new simplified property
  static async createSimplifiedProperty(propertyData: {
    address: string;
    propertyType: 'house' | 'flat' | 'hmo';
    bedrooms: number;
    bathrooms: number;
    targetRent: number;
    purchasePrice?: number;
    units?: Array<{ name: string; area?: number }>;
    unitDetails?: Array<{ name: string; area: number; targetRent: number }>;
  }): Promise<SimplifiedProperty | null> {
    try {
      // Generate a unique asset register ID
      const assetRegisterId = `SIMP-${Date.now().toString().slice(-6)}`;
      
      // Prepare property data for database
      const dbPropertyData = {
        property_type: 'residential',
        property_sub_type: propertyData.propertyType,
        bedrooms: propertyData.bedrooms,
        bathrooms: propertyData.bathrooms,
        target_rent: propertyData.targetRent,
        purchase_price: propertyData.purchasePrice,
        units: propertyData.propertyType === 'hmo' ? (propertyData.unitDetails?.length || propertyData.units?.length || 1) : 1,
        unit_details: propertyData.unitDetails,
        tenant_count: 0,
        is_simplified_demo: true, // Flag to identify demo properties
        status: 'active',
      };

      // Insert into database
      const { data, error } = await supabase
        .from('properties')
        .insert({
          asset_register_id: assetRegisterId,
          name: `Property at ${propertyData.address}`,
          address: propertyData.address,
          status: 'active',
          property_data: dbPropertyData,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating simplified property:', error);
        return null;
      }

      // Transform to simplified format (tenant count will be 0 for new property)
      return transformToSimplifiedProperty(data, 0);
    } catch (error) {
      console.error('Error in createSimplifiedProperty:', error);
      return null;
    }
  }

  // Delete a property and all its tenants with confirmation
  static async deletePropertyWithTenants(propertyId: string): Promise<{ success: boolean; tenantsDeleted: number; error?: string }> {
    try {
      // First, get all tenants for this property (simplified tenants store property_id in tenant_data)
      const { data: tenants, error: tenantsError } = await supabase
        .from('tenants')
        .select('id, name')
        .eq('tenant_data->>property_id', propertyId);

      if (tenantsError) {
        console.error('Error fetching tenants for deletion:', tenantsError);
        return { success: false, tenantsDeleted: 0, error: 'Failed to fetch tenants' };
      }

      const tenantCount = tenants?.length || 0;

      // Delete all tenants first
      if (tenantCount > 0) {
        const tenantIds = tenants.map(t => t.id);
        const { error: deleteTenantsError } = await supabase
          .from('tenants')
          .delete()
          .in('id', tenantIds);

        if (deleteTenantsError) {
          console.error('Error deleting tenants:', deleteTenantsError);
          return { success: false, tenantsDeleted: 0, error: 'Failed to delete tenants' };
        }
      }

      // Then delete the property
      const { error: deletePropertyError } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);

      if (deletePropertyError) {
        console.error('Error deleting property:', deletePropertyError);
        return { success: false, tenantsDeleted: tenantCount, error: 'Failed to delete property' };
      }

      return { success: true, tenantsDeleted: tenantCount };
    } catch (error) {
      console.error('Error in deletePropertyWithTenants:', error);
      return { success: false, tenantsDeleted: 0, error: 'Unexpected error occurred' };
    }
  }

  // Update property status to sold and set sales price
  static async markPropertyAsSold(propertyId: string, salesPrice: number): Promise<SimplifiedProperty | null> {
    try {
      // Get current property data
      const { data: currentProperty, error: fetchError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (fetchError) {
        console.error('Error fetching current property:', fetchError);
        return null;
      }

      // Update property data with sold status and sales price
      const updatedPropertyData = {
        ...currentProperty.property_data,
        status: 'sold',
        sales_price: salesPrice,
        sold_date: new Date().toISOString().split('T')[0],
      };

      // Update in database
      const { data, error } = await supabase
        .from('properties')
        .update({
          status: 'disposed', // Use database status
          property_data: updatedPropertyData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', propertyId)
        .select()
        .single();

      if (error) {
        console.error('Error marking property as sold:', error);
        return null;
      }

      // Get current tenant count for this property
      const { count: tenantCount } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_data->>property_id', propertyId)
        .eq('status', 'active');

      return transformToSimplifiedProperty(data, tenantCount || 0);
    } catch (error) {
      console.error('Error in markPropertyAsSold:', error);
      return null;
    }
  }

  // Get available units for HMO properties
  static async getAvailableUnits(propertyId: string): Promise<Array<{ name: string; area?: number; occupied: boolean }>> {
    try {
      const [property, tenants] = await Promise.all([
        this.getSimplifiedProperties().then(props => props.find(p => p.id === propertyId)),
        this.getSimplifiedTenants().then(tenants => tenants.filter(t => t.propertyId === propertyId))
      ]);

      if (!property) return [];

      // For HMO properties, get units from property data
      if (property.propertyType === 'hmo') {
        const propertyData = await supabase
          .from('properties')
          .select('property_data')
          .eq('id', propertyId)
          .single();

        const units = propertyData.data?.property_data?.units || [];
        const occupiedUnits = new Set(tenants.map(t => t.unitNumber).filter(Boolean));

        return units.map((unit: any) => ({
          name: unit.name,
          area: unit.area,
          occupied: occupiedUnits.has(unit.name)
        }));
      }

      // For regular properties, generate room-based units
      const occupiedRooms = new Set(tenants.map(t => t.unitNumber).filter(Boolean));
      const availableUnits = [];
      
      for (let i = 1; i <= property.bedrooms; i++) {
        const roomName = `Room ${i}`;
        availableUnits.push({
          name: roomName,
          occupied: occupiedRooms.has(roomName)
        });
      }
      
      return availableUnits;
    } catch (error) {
      console.error('Error getting available units:', error);
      return [];
    }
  }

  // Calculate actual rent from active tenants
  static async getActualRent(propertyId: string): Promise<number> {
    try {
      const tenants = await this.getSimplifiedTenants();
      const propertyTenants = tenants.filter(t => t.propertyId === propertyId);
      return propertyTenants.reduce((sum, tenant) => sum + tenant.monthlyRent, 0);
    } catch (error) {
      console.error('Error calculating actual rent:', error);
      return 0;
    }
  }

  // Update a simplified property
  static async updateSimplifiedProperty(
    propertyId: string, 
    updates: Partial<SimplifiedProperty>
  ): Promise<SimplifiedProperty | null> {
    try {
      // Get current property data
      const { data: currentProperty, error: fetchError } = await supabase
        .from('properties')
        .select('*')
        .eq('id', propertyId)
        .single();

      if (fetchError) {
        console.error('Error fetching current property:', fetchError);
        return null;
      }

      // Merge updates with existing property data
      const updatedPropertyData = {
        ...currentProperty.property_data,
        ...(updates.propertyName !== undefined && { property_name: updates.propertyName }),
        ...(updates.propertyType && { property_sub_type: updates.propertyType }),
        ...(updates.bedrooms !== undefined && { bedrooms: updates.bedrooms }),
        ...(updates.bathrooms !== undefined && { bathrooms: updates.bathrooms }),
        ...(updates.targetRent !== undefined && { monthly_rent: updates.targetRent }),
        ...(updates.tenantCount !== undefined && { tenant_count: updates.tenantCount }),
        // Enhanced property details
        ...(updates.totalArea !== undefined && { total_area: updates.totalArea }),
        ...(updates.yearBuilt !== undefined && { year_built: updates.yearBuilt }),
        ...(updates.furnished !== undefined && { furnished: updates.furnished }),
        ...(updates.parking !== undefined && { parking: updates.parking }),
        ...(updates.garden !== undefined && { garden: updates.garden }),
        // HMO specific fields
        ...(updates.maxOccupancy !== undefined && { max_occupancy: updates.maxOccupancy }),
        ...(updates.licenseRequired !== undefined && { license_required: updates.licenseRequired }),
        ...(updates.licenseNumber !== undefined && { license_number: updates.licenseNumber }),
        ...(updates.licenseExpiry !== undefined && { license_expiry: updates.licenseExpiry?.toISOString() }),
        ...(updates.rooms !== undefined && { rooms: updates.rooms }),
      };

      // Prepare minimal core field updates
      const coreUpdates: any = {
        property_data: updatedPropertyData,
        updated_at: new Date().toISOString(),
      };

      // Only update core fields that we know exist
      if (updates.address) {
        coreUpdates.address = updates.address;
        coreUpdates.name = `Property at ${updates.address}`;
      }

      if (updates.status) {
        // Map simplified status to database status
        coreUpdates.status = updates.status === 'sold' ? 'sold' : 'active';
      }



      // Update in database
      const { data, error } = await supabase
        .from('properties')
        .update(coreUpdates)
        .eq('id', propertyId)
        .select()
        .single();

      if (error) {
        console.error('Error updating simplified property:', error);
        console.error('Update payload:', coreUpdates);
        return null;
      }

      // Get current tenant count for this property
      const { count: tenantCount } = await supabase
        .from('tenants')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_data->>property_id', propertyId)
        .eq('status', 'active');

      return transformToSimplifiedProperty(data, tenantCount || 0);
    } catch (error) {
      console.error('Error in updateSimplifiedProperty:', error);
      return null;
    }
  }

  // Delete a simplified property
  static async deleteSimplifiedProperty(propertyId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('properties')
        .delete()
        .eq('id', propertyId);

      if (error) {
        console.error('Error deleting simplified property:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteSimplifiedProperty:', error);
      return false;
    }
  }

  // Create a new simplified tenant
  static async createSimplifiedTenant(tenantData: {
    name: string;
    phone?: string;
    email?: string;
    propertyId: string;
    unitNumber?: string;
    leaseStart: Date;
    leaseEnd: Date;
    monthlyRent: number;
    depositAmount: number;
    rentDueDay?: number; // Day of month rent is due (default: 1)
  }): Promise<SimplifiedTenant | null> {
    try {
      // Prepare tenant data for database
      const dbTenantData: any = {
        name: tenantData.name,
        phone: tenantData.phone,
        email: tenantData.email,
        property_id: tenantData.propertyId,
        lease_start: tenantData.leaseStart.toISOString().split('T')[0],
        lease_end: tenantData.leaseEnd.toISOString().split('T')[0],
        monthly_rent: tenantData.monthlyRent,
        rent_due_day: tenantData.rentDueDay || 1, // Default to 1st of month
        deposit_amount: tenantData.depositAmount,
        status: 'active',
      };

      // Try to add tenant_data if the column exists
      try {
        dbTenantData.tenant_data = {
          unit_number: tenantData.unitNumber,
          monthly_rent: tenantData.monthlyRent,
          deposit_amount: tenantData.depositAmount,
          rent_status: 'current',
          is_simplified_demo: true,
        };
      } catch (error) {
        // If tenant_data column doesn't exist, we'll store the info in the name field temporarily
        console.log('tenant_data column not available, using fallback approach');
      }

      // Insert into database
      const { data, error } = await supabase
        .from('tenants')
        .insert(dbTenantData)
        .select(`
          *,
          properties!inner(
            id,
            address,
            property_data
          )
        `)
        .single();

      if (error) {
        console.error('Error creating simplified tenant:', error);
        return null;
      }

      // Update property tenant count
      await this.updatePropertyTenantCount(tenantData.propertyId);

      return transformToSimplifiedTenant(data, data.properties);
    } catch (error) {
      console.error('Error in createSimplifiedTenant:', error);
      return null;
    }
  }

  // Update a simplified tenant
  static async updateSimplifiedTenant(
    tenantId: string,
    updates: Partial<SimplifiedTenant>
  ): Promise<SimplifiedTenant | null> {
    try {
      // Get current tenant data
      const { data: currentTenant, error: fetchError } = await supabase
        .from('tenants')
        .select('*, properties(id, address, property_data)')
        .eq('id', tenantId)
        .single();

      if (fetchError) {
        console.error('Error fetching current tenant:', fetchError);
        return null;
      }

      // Merge updates with existing tenant data
      const updatedTenantData = {
        ...currentTenant.tenant_data,
        ...(updates.unitNumber !== undefined && { unit_number: updates.unitNumber }),
        ...(updates.monthlyRent !== undefined && { monthly_rent: updates.monthlyRent }),
        ...(updates.depositAmount !== undefined && { deposit_amount: updates.depositAmount }),
        ...(updates.rentStatus !== undefined && { rent_status: updates.rentStatus }),
      };

      // Prepare core field updates
      const coreUpdates: any = {
        tenant_data: updatedTenantData,
        updated_at: new Date().toISOString(),
      };

      if (updates.name) coreUpdates.name = updates.name;
      if (updates.email !== undefined) coreUpdates.email = updates.email;
      if (updates.phone !== undefined) coreUpdates.phone = updates.phone;
      if (updates.leaseStart) coreUpdates.lease_start_date = updates.leaseStart.toISOString().split('T')[0];
      if (updates.leaseEnd) coreUpdates.lease_end_date = updates.leaseEnd.toISOString().split('T')[0];

      // Update in database
      const { data, error } = await supabase
        .from('tenants')
        .update(coreUpdates)
        .eq('id', tenantId)
        .select(`
          *,
          properties(id, address, property_data)
        `)
        .single();

      if (error) {
        console.error('Error updating simplified tenant:', error);
        return null;
      }

      return transformToSimplifiedTenant(data, data.properties);
    } catch (error) {
      console.error('Error in updateSimplifiedTenant:', error);
      return null;
    }
  }

  // Delete a simplified tenant
  static async deleteSimplifiedTenant(tenantId: string): Promise<boolean> {
    try {
      // Get tenant's property ID before deletion for updating tenant count
      const { data: tenant, error: fetchError } = await supabase
        .from('tenants')
        .select('property_id')
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
      if (tenant?.property_id) {
        await this.updatePropertyTenantCount(tenant.property_id);
      }

      return true;
    } catch (error) {
      console.error('Error in deleteSimplifiedTenant:', error);
      return false;
    }
  }

  // Get available rooms for a property
  static async getAvailableRooms(propertyId: string): Promise<string[]> {
    try {
      const [property, tenants] = await Promise.all([
        this.getSimplifiedProperties().then(props => props.find(p => p.id === propertyId)),
        this.getSimplifiedTenants().then(tenants => tenants.filter(t => t.propertyId === propertyId))
      ]);

      if (!property) return [];

      // For houses, generate room options based on bedrooms
      if (property.propertyType === 'house') {
        const occupiedRooms = new Set(tenants.map(t => t.unitNumber).filter(Boolean));
        const availableRooms = [];
        
        for (let i = 1; i <= property.bedrooms; i++) {
          const roomName = `Room ${i}`;
          if (!occupiedRooms.has(roomName)) {
            availableRooms.push(roomName);
          }
        }
        
        return availableRooms;
      }

      // For flats, typically whole unit rental
      return [];
    } catch (error) {
      console.error('Error getting available rooms:', error);
      return [];
    }
  }

  // Update property tenant count
  static async updatePropertyTenantCount(propertyId: string): Promise<void> {
    try {
      // Count active tenants for this property (simplified tenants store property_id in tenant_data)
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

  // Get property statistics for dashboard
  static async getPropertyStatistics(): Promise<{
    totalProperties: number;
    totalTenants: number;
    occupiedProperties: number;
    vacantProperties: number;
    maintenanceProperties: number;
    totalMonthlyRent: number;
    occupancyRate: number;
  }> {
    try {
      const [properties, tenants] = await Promise.all([
        this.getSimplifiedProperties(),
        this.getSimplifiedTenants(),
      ]);

      const totalProperties = properties.length;
      const totalTenants = tenants.length;
      const occupiedProperties = properties.filter(p => p.status === 'occupied').length;
      const vacantProperties = properties.filter(p => p.status === 'vacant').length;
      const maintenanceProperties = properties.filter(p => p.status === 'maintenance').length;
      const totalMonthlyRent = tenants.reduce((sum, tenant) => sum + tenant.monthlyRent, 0);
      const occupancyRate = totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0;

      return {
        totalProperties,
        totalTenants,
        occupiedProperties,
        vacantProperties,
        maintenanceProperties,
        totalMonthlyRent,
        occupancyRate,
      };
    } catch (error) {
      console.error('Error getting property statistics:', error);
      return {
        totalProperties: 0,
        totalTenants: 0,
        occupiedProperties: 0,
        vacantProperties: 0,
        maintenanceProperties: 0,
        totalMonthlyRent: 0,
        occupancyRate: 0,
      };
    }
  }
}