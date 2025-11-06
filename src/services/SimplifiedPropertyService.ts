import { supabase } from '../lib/supabase';
import { SimplifiedProperty, SimplifiedTenant, transformToSimplifiedProperty, transformToSimplifiedTenant } from '../utils/simplifiedDataTransforms';
import { RentPaymentService } from './RentPaymentService';

export class SimplifiedPropertyService {
  // Geocode an address to get latitude and longitude coordinates
  static async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      // Get Google Maps API key from environment
      const apiKey = import.meta.env.VITE_GOOGLE_MAP_API 
        || import.meta.env.VITE_GOOGLE_MAPS_API_KEY 
        || import.meta.env.GOOGLE_MAP_API
        || import.meta.env.GOOGLE_MAPS_API_KEY;

      if (!apiKey) {
        console.warn('Google Maps API key not configured. Skipping geocoding.');
        return null;
      }

      // Use Google Geocoding API
      const encodedAddress = encodeURIComponent(address);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${apiKey}`;

      const response = await fetch(url);
      
      if (!response.ok) {
        console.error('Geocoding API request failed:', response.status, response.statusText);
        return null;
      }

      const data = await response.json();

      if (data.status === 'OK' && data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        return {
          lat: location.lat,
          lng: location.lng
        };
      } else if (data.status === 'ZERO_RESULTS') {
        console.warn(`No geocoding results found for address: ${address}`);
        return null;
      } else {
        console.error('Geocoding failed:', data.status, data.error_message || '');
        return null;
      }
    } catch (error) {
      console.error('Error geocoding address:', error);
      return null;
    }
  }

  // Get all simplified properties from database
  static async getSimplifiedProperties(organizationId?: string): Promise<SimplifiedProperty[]> {
    try {
      let query = supabase
        .from('properties')
        .select('*')
        .order('property_reference', { ascending: true });

      // Filter by organization if provided
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching simplified properties:', error);
        return [];
      }

      if (!data) return [];

      // Get tenant counts for all properties
      const propertyIds = data.map(p => p.id);
      let tenantCounts: any[] = [];
      
      // Try to get tenant counts - handle case where property_id column might not exist
      // Use a more defensive approach: try tenant_data first, then property_id
      try {
        // First try to get all tenants and extract property_id from tenant_data
        const { data: allTenants, error: tenantError } = await supabase
          .from('tenants')
          .select('tenant_data, id')
          .eq('status', 'active');

        if (!tenantError && allTenants) {
          // Extract property_id from tenant_data JSONB field
          tenantCounts = allTenants
            .map(t => ({ property_id: t.tenant_data?.property_id }))
            .filter(t => t.property_id && propertyIds.includes(t.property_id));
        } else if (tenantError) {
          // If that fails, try direct property_id column (for newer schema)
          const { data: tenantData, error: directError } = await supabase
            .from('tenants')
            .select('property_id')
            .eq('status', 'active')
            .in('property_id', propertyIds);

          if (!directError && tenantData) {
            tenantCounts = tenantData || [];
          }
          // Silently ignore errors - tenant counts are optional
        }
      } catch (error) {
        // Silently handle errors - tenant counts are optional
        // App will work without tenant counts
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
  static async getSimplifiedTenants(organizationId?: string): Promise<SimplifiedTenant[]> {
    try {
      // Get organization's country code if organizationId provided
      let orgCountryCode: string | null = null;
      if (organizationId) {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('country_code')
          .eq('id', organizationId)
          .single();
        
        if (!orgError && org) {
          orgCountryCode = org.country_code || 'UK';
        }
      }

      let query = supabase
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

      // Filter by organization if provided
      if (organizationId) {
        query = query.eq('organization_id', organizationId);
      }

      // CRITICAL: Filter by country code to prevent mixing tenants from different countries
      if (orgCountryCode) {
        query = query.eq('country_code', orgCountryCode);
      }

      const { data, error } = await query;

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
  }, organizationId?: string): Promise<SimplifiedProperty | null> {
    try {
      // Get organization's country code if organizationId provided
      let orgCountryCode: string = 'UK'; // Default to UK
      if (organizationId) {
        const { data: org, error: orgError } = await supabase
          .from('organizations')
          .select('country_code')
          .eq('id', organizationId)
          .single();
        
        if (!orgError && org) {
          orgCountryCode = org.country_code || 'UK';
        }
      }

      // Generate a unique asset register ID
      const assetRegisterId = `SIMP-${Date.now().toString().slice(-6)}`;
      
      // Geocode the address to get coordinates
      const coordinates = await this.geocodeAddress(propertyData.address);
      
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
      };

      // Insert into database
      const insertData: any = {
        asset_register_id: assetRegisterId,
        name: `Property at ${propertyData.address}`,
        address: propertyData.address,
        status: 'vacant', // New properties start as vacant (allowed values: vacant, occupied, partially_occupied, maintenance, sold)
        property_data: dbPropertyData,
        country_code: orgCountryCode, // Set country code from organization
        latitude: coordinates?.lat || null,
        longitude: coordinates?.lng || null,
      };

      // Add organization_id if provided
      if (organizationId) {
        insertData.organization_id = organizationId;
      }

      const { data, error } = await supabase
        .from('properties')
        .insert(insertData)
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
          status: 'sold', // Database constraint allows: vacant, occupied, partially_occupied, maintenance, sold
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

      // Handle structured address fields if provided
      const addressFields = (updates as any)._addressFields;
      let fullAddress = updates.address;
      
      if (addressFields) {
        // Build full address from structured fields
        fullAddress = [
          addressFields.addressLine1,
          addressFields.addressLine2,
          addressFields.city,
          addressFields.postcode
        ].filter(Boolean).join(', ');
      }

      // Check if address has changed and re-geocode if needed
      let newCoordinates: { lat: number; lng: number } | null = null;
      const addressChanged = fullAddress && fullAddress !== currentProperty.address;
      
      if (addressChanged) {
        console.log('Address changed, re-geocoding:', fullAddress);
        newCoordinates = await this.geocodeAddress(fullAddress);
      }

      // Merge updates with existing property data
      const updatedPropertyData = {
        ...currentProperty.property_data,
        ...(updates.propertyType && { 
          property_sub_type: updates.propertyType,
          property_type: 'residential' // Always residential for simplified properties
        }),
        ...(updates.bedrooms !== undefined && { bedrooms: updates.bedrooms }),
        ...(updates.bathrooms !== undefined && { bathrooms: updates.bathrooms }),
        ...(updates.targetRent !== undefined && { 
          target_rent: updates.targetRent,
          monthly_rent: updates.targetRent // Keep both for compatibility
        }),
        ...(updates.purchasePrice !== undefined && { purchase_price: updates.purchasePrice }),
        ...(updates.salesPrice !== undefined && { sales_price: updates.salesPrice }),
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
        ...(updates.rooms !== undefined && { 
          rooms: updates.rooms,
          units: updates.rooms?.length || 1
        }),
        // Ownership details
        ...(updates.ownershipType !== undefined && { ownership_type: updates.ownershipType }),
        ...(updates.companyName !== undefined && { company_name: updates.companyName }),
        // Structured address fields
        ...(addressFields && {
          address_line_1: addressFields.addressLine1,
          address_line_2: addressFields.addressLine2 || null,
          city: addressFields.city,
          postcode: addressFields.postcode
        }),
      };

      // Prepare minimal core field updates
      const coreUpdates: any = {
        property_data: updatedPropertyData,
        updated_at: new Date().toISOString(),
      };

      // Only update core fields that we know exist
      if (fullAddress) {
        coreUpdates.address = fullAddress;
        coreUpdates.name = `Property at ${fullAddress}`;
      }

      // Update coordinates if address changed and geocoding was successful
      if (addressChanged && newCoordinates) {
        coreUpdates.latitude = newCoordinates.lat;
        coreUpdates.longitude = newCoordinates.lng;
        console.log('Updated coordinates:', newCoordinates);
      } else if (addressChanged && !newCoordinates) {
        // If address changed but geocoding failed, clear coordinates
        coreUpdates.latitude = null;
        coreUpdates.longitude = null;
        console.warn('Geocoding failed for new address, coordinates cleared');
      }

      if (updates.status) {
        // Map simplified status to database status
        // Database allows: 'vacant', 'occupied', 'partially_occupied', 'maintenance', 'sold'
        // Simplified uses: 'under_management', 'sold'
        if (updates.status === 'sold') {
          coreUpdates.status = 'sold';
        }
        // For 'under_management', don't change the core status field
        // The occupancy status is calculated dynamically based on tenants
      }

      // Update property_reference if provided
      if (updates.propertyReference !== undefined) {
        coreUpdates.property_reference = updates.propertyReference;
      }

      // NOTE: The properties table only has these columns:
      // id, asset_register_id, name, address, property_data (JSONB), status, 
      // created_at, updated_at, module_id, organization_id, property_reference
      // 
      // All property details (bedrooms, bathrooms, rent, etc.) are stored in property_data JSONB
      // So we only update the core columns that exist, not individual property detail columns

      // Update in database - only update columns that actually exist
      console.log('Attempting to update property with payload:', coreUpdates);
      
      const { data, error } = await supabase
        .from('properties')
        .update(coreUpdates)
        .eq('id', propertyId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating simplified property:', error);
        console.error('Error details:', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        console.error('Update payload that failed:', JSON.stringify(coreUpdates, null, 2));
        return null;
      }
      
      console.log('✅ Property updated successfully:', data);

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