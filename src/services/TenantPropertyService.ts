import { supabase } from '../lib/supabase';

export interface TenantPropertyRelation {
  tenantId: string;
  tenantName: string;
  tenantEmail?: string;
  propertyId: string;
  propertyAddress: string;
  unitId?: string;
  unitNumber?: string;
  leaseStartDate?: Date;
  leaseEndDate?: Date;
  status: string;
}

export class TenantPropertyService {
  // Get all tenants for a specific property
  static async getTenantsByProperty(propertyId: string): Promise<TenantPropertyRelation[]> {
    try {
      const { data, error } = await supabase
        .from('unit_tenants')
        .select(`
          *,
          tenants(id, name, email, status),
          units(id, unit_number, property_id),
          units!inner(properties(id, address))
        `)
        .eq('units.property_id', propertyId)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching tenants by property:', error);
        return [];
      }

      return data?.map(relation => ({
        tenantId: relation.tenants.id,
        tenantName: relation.tenants.name,
        tenantEmail: relation.tenants.email,
        propertyId: relation.units.properties.id,
        propertyAddress: relation.units.properties.address,
        unitId: relation.units.id,
        unitNumber: relation.units.unit_number,
        leaseStartDate: relation.lease_start_date ? new Date(relation.lease_start_date) : undefined,
        leaseEndDate: relation.lease_end_date ? new Date(relation.lease_end_date) : undefined,
        status: relation.status
      })) || [];
    } catch (error) {
      console.error('Error in getTenantsByProperty:', error);
      return [];
    }
  }

  // Get all tenant-property relationships
  static async getAllTenantPropertyRelations(): Promise<TenantPropertyRelation[]> {
    try {
      const { data, error } = await supabase
        .from('unit_tenants')
        .select(`
          *,
          tenants(id, name, email, status),
          units(id, unit_number, property_id, properties(id, address))
        `)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching all tenant-property relations:', error);
        return [];
      }

      return data?.map(relation => ({
        tenantId: relation.tenants.id,
        tenantName: relation.tenants.name,
        tenantEmail: relation.tenants.email,
        propertyId: relation.units.properties.id,
        propertyAddress: relation.units.properties.address,
        unitId: relation.units.id,
        unitNumber: relation.units.unit_number,
        leaseStartDate: relation.lease_start_date ? new Date(relation.lease_start_date) : undefined,
        leaseEndDate: relation.lease_end_date ? new Date(relation.lease_end_date) : undefined,
        status: relation.status
      })) || [];
    } catch (error) {
      console.error('Error in getAllTenantPropertyRelations:', error);
      return [];
    }
  }

  // Get properties for a specific tenant
  static async getPropertiesByTenant(tenantId: string): Promise<TenantPropertyRelation[]> {
    try {
      const { data, error } = await supabase
        .from('unit_tenants')
        .select(`
          *,
          tenants(id, name, email, status),
          units(id, unit_number, property_id, properties(id, address))
        `)
        .eq('tenant_id', tenantId)
        .eq('status', 'active');

      if (error) {
        console.error('Error fetching properties by tenant:', error);
        return [];
      }

      return data?.map(relation => ({
        tenantId: relation.tenants.id,
        tenantName: relation.tenants.name,
        tenantEmail: relation.tenants.email,
        propertyId: relation.units.properties.id,
        propertyAddress: relation.units.properties.address,
        unitId: relation.units.id,
        unitNumber: relation.units.unit_number,
        leaseStartDate: relation.lease_start_date ? new Date(relation.lease_start_date) : undefined,
        leaseEndDate: relation.lease_end_date ? new Date(relation.lease_end_date) : undefined,
        status: relation.status
      })) || [];
    } catch (error) {
      console.error('Error in getPropertiesByTenant:', error);
      return [];
    }
  }

  // Get simplified tenant data for a property (for compatibility with existing components)
  static async getSimplifiedTenantsByProperty(propertyId: string): Promise<Array<{
    id: string;
    name: string;
    email: string;
    propertyId: string;
    propertyAddress: string;
    unitNumber?: string;
  }>> {
    const relations = await this.getTenantsByProperty(propertyId);
    
    return relations.map(relation => ({
      id: relation.tenantId,
      name: relation.tenantName,
      email: relation.tenantEmail || '',
      propertyId: relation.propertyId,
      propertyAddress: relation.propertyAddress,
      unitNumber: relation.unitNumber
    }));
  }

  // Group tenants by property ID
  static async getTenantsGroupedByProperty(): Promise<{[propertyId: string]: Array<{
    id: string;
    name: string;
    email: string;
    unitNumber?: string;
  }>}> {
    const relations = await this.getAllTenantPropertyRelations();
    const grouped: {[propertyId: string]: Array<{
      id: string;
      name: string;
      email: string;
      unitNumber?: string;
    }>} = {};

    relations.forEach(relation => {
      if (!grouped[relation.propertyId]) {
        grouped[relation.propertyId] = [];
      }
      
      grouped[relation.propertyId].push({
        id: relation.tenantId,
        name: relation.tenantName,
        email: relation.tenantEmail || '',
        unitNumber: relation.unitNumber
      });
    });

    return grouped;
  }
}