import { supabase } from '../lib/supabase';

export interface Repair {
  id: string;
  propertyId: string;
  propertyAddress: string;
  tenantId?: string;
  tenantName?: string;
  title: string;
  description?: string;
  category?: string;
  urgency: 'low' | 'medium' | 'high' | 'emergency';
  status: 'reported' | 'acknowledged' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  reportedDate: Date;
  scheduledDate?: Date;
  completedDate?: Date;
  contractor?: string;
  contractorCompany?: string;
  contractorPhone?: string;
  estimatedCost?: number;
  actualCost?: number;
  isEmergency?: boolean;
  photos?: string[];
  invoiceUrl?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class RepairService {
  /**
   * Get all repairs for the current organization
   * Fetches repairs by joining with properties (which are filtered by organization via RLS)
   */
  static async getRepairs(): Promise<Repair[]> {
    try {
      const { data, error } = await supabase
        .from('repairs')
        .select(`
          *,
          properties!inner(
            id,
            address,
            organization_id
          ),
          tenants(
            id,
            name
          )
        `)
        .order('reported_date', { ascending: false });

      if (error) {
        console.error('Error fetching repairs:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return [];
      }

      if (!data) return [];

      // Transform the data to match our Repair interface
      return data.map(repair => this.transformRepairFromDB(repair));
    } catch (error) {
      console.error('Error in getRepairs:', error);
      return [];
    }
  }

  /**
   * Get repairs for a specific property
   */
  static async getRepairsByProperty(propertyId: string): Promise<Repair[]> {
    try {
      const { data, error } = await supabase
        .from('repairs')
        .select(`
          *,
          properties!inner(
            id,
            address,
            organization_id
          ),
          tenants(
            id,
            name
          )
        `)
        .eq('property_id', propertyId)
        .order('reported_date', { ascending: false });

      if (error) {
        console.error('Error fetching property repairs:', error);
        console.error('Error details:', JSON.stringify(error, null, 2));
        return [];
      }

      return data?.map(repair => this.transformRepairFromDB(repair)) || [];
    } catch (error) {
      console.error('Error in getRepairsByProperty:', error);
      return [];
    }
  }

  /**
   * Create a new repair
   */
  static async createRepair(repairData: {
    propertyId: string;
    tenantId?: string;
    title: string;
    description?: string;
    category?: string;
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    status?: 'reported' | 'acknowledged' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
    reportedDate?: Date;
    estimatedCost?: number;
    isEmergency?: boolean;
    notes?: string;
  }): Promise<Repair | null> {
    try {
      // First, get the property to get its organization_id
      const { data: property, error: propertyError } = await supabase
        .from('properties')
        .select('organization_id')
        .eq('id', repairData.propertyId)
        .single();

      if (propertyError || !property) {
        console.error('Error fetching property for repair:', propertyError);
        throw new Error('Failed to find property. Please make sure you have selected a valid property.');
      }

      // Map urgency to priority for database
      const priority = repairData.priority || 'medium';
      
      const { data, error } = await supabase
        .from('repairs')
        .insert({
          property_id: repairData.propertyId,
          tenant_id: repairData.tenantId,
          organization_id: property.organization_id, // Set organization_id from property
          title: repairData.title,
          description: repairData.description,
          category: repairData.category,
          priority: priority,
          status: repairData.status || 'reported',
          reported_date: repairData.reportedDate || new Date(),
          estimated_cost: repairData.estimatedCost,
          is_emergency: repairData.isEmergency || priority === 'urgent',
          notes: repairData.notes,
        })
        .select(`
          *,
          properties!inner(
            id,
            address,
            organization_id
          ),
          tenants(
            id,
            name
          )
        `)
        .single();

      if (error) {
        console.error('Error creating repair:', error);
        throw new Error(`Failed to create repair: ${error.message}`);
      }

      return this.transformRepairFromDB(data);
    } catch (error) {
      console.error('Error in createRepair:', error);
      throw error; // Re-throw to let the component handle it
    }
  }

  /**
   * Update a repair
   */
  static async updateRepair(
    repairId: string,
    updates: Partial<{
      title?: string;
      description?: string;
      status?: 'reported' | 'acknowledged' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      scheduledDate?: Date;
      completedDate?: Date;
      contractorName?: string;
      contractorCompany?: string;
      contractorPhone?: string;
      estimatedCost?: number;
      actualCost?: number;
      notes?: string;
      isEmergency?: boolean;
    }>
  ): Promise<Repair | null> {
    try {
      const dbUpdates: any = {};
      
      if (updates.title !== undefined) dbUpdates.title = updates.title;
      if (updates.description !== undefined) dbUpdates.description = updates.description;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
      if (updates.scheduledDate !== undefined) dbUpdates.scheduled_date = updates.scheduledDate;
      if (updates.completedDate !== undefined) dbUpdates.completed_date = updates.completedDate;
      if (updates.contractorName !== undefined) dbUpdates.contractor_name = updates.contractorName;
      if (updates.contractorCompany !== undefined) dbUpdates.contractor_company = updates.contractorCompany;
      if (updates.contractorPhone !== undefined) dbUpdates.contractor_phone = updates.contractorPhone;
      if (updates.estimatedCost !== undefined) dbUpdates.estimated_cost = updates.estimatedCost;
      if (updates.actualCost !== undefined) dbUpdates.actual_cost = updates.actualCost;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.isEmergency !== undefined) dbUpdates.is_emergency = updates.isEmergency;

      const { data, error } = await supabase
        .from('repairs')
        .update(dbUpdates)
        .eq('id', repairId)
        .select(`
          *,
          properties!inner(
            id,
            address,
            organization_id
          ),
          tenants(
            id,
            name
          )
        `)
        .single();

      if (error) {
        console.error('Error updating repair:', error);
        return null;
      }

      return this.transformRepairFromDB(data);
    } catch (error) {
      console.error('Error in updateRepair:', error);
      return null;
    }
  }

  /**
   * Delete a repair
   */
  static async deleteRepair(repairId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('repairs')
        .delete()
        .eq('id', repairId);

      if (error) {
        console.error('Error deleting repair:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteRepair:', error);
      return false;
    }
  }

  /**
   * Transform database repair data to match our Repair interface
   */
  private static transformRepairFromDB(dbRepair: any): Repair {
    // Map priority to urgency for UI
    const urgencyMap: Record<string, 'low' | 'medium' | 'high' | 'emergency'> = {
      'low': 'low',
      'medium': 'medium',
      'high': 'high',
      'urgent': 'emergency'
    };

    // Map database status to UI status
    const statusMap: Record<string, 'reported' | 'acknowledged' | 'scheduled' | 'in_progress' | 'completed' | 'cancelled'> = {
      'reported': 'reported',
      'acknowledged': 'acknowledged',
      'scheduled': 'scheduled',
      'in_progress': 'in_progress',
      'completed': 'completed',
      'cancelled': 'cancelled'
    };

    return {
      id: dbRepair.id,
      propertyId: dbRepair.property_id,
      propertyAddress: dbRepair.properties?.address || '',
      tenantId: dbRepair.tenant_id,
      tenantName: dbRepair.tenants?.name,
      title: dbRepair.title,
      description: dbRepair.description,
      category: dbRepair.category,
      urgency: urgencyMap[dbRepair.priority] || 'medium',
      status: statusMap[dbRepair.status] || 'reported',
      reportedDate: new Date(dbRepair.reported_date),
      scheduledDate: dbRepair.scheduled_date ? new Date(dbRepair.scheduled_date) : undefined,
      completedDate: dbRepair.completed_date ? new Date(dbRepair.completed_date) : undefined,
      contractor: dbRepair.contractor_name,
      contractorCompany: dbRepair.contractor_company,
      contractorPhone: dbRepair.contractor_phone,
      estimatedCost: dbRepair.estimated_cost ? parseFloat(dbRepair.estimated_cost) : undefined,
      actualCost: dbRepair.actual_cost ? parseFloat(dbRepair.actual_cost) : undefined,
      isEmergency: dbRepair.is_emergency,
      photos: dbRepair.photos_urls,
      invoiceUrl: dbRepair.invoice_url,
      notes: dbRepair.notes,
      createdAt: new Date(dbRepair.created_at),
      updatedAt: new Date(dbRepair.updated_at)
    };
  }
}

