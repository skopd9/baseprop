import { SimplifiedPropertyService } from '../services/SimplifiedPropertyService';
import { SimplifiedTenantService } from '../services/SimplifiedTenantService';
import { SimplifiedProperty, SimplifiedTenant } from './simplifiedDataTransforms';

export class DemoDataSeeder {
  static async seedDemoData(): Promise<{ properties: SimplifiedProperty[], tenants: SimplifiedTenant[] }> {
    try {
      // Sample properties
      const sampleProperties = [
        {
          address: '123 Oak Street, Manchester M1 2AB',
          propertyType: 'house' as const,
          bedrooms: 3,
          bathrooms: 2,
          purchasePrice: 185000,
          currentValue: 220000,
          monthlyRent: 1200,
          status: 'under_management' as const
        },
        {
          address: '45 Victoria Road, Birmingham B15 3HJ',
          propertyType: 'flat' as const,
          bedrooms: 2,
          bathrooms: 1,
          purchasePrice: 145000,
          currentValue: 165000,
          monthlyRent: 950,
          status: 'under_management' as const
        },
        {
          address: '78 High Street, Leeds LS1 4PQ',
          propertyType: 'hmo' as const,
          bedrooms: 5,
          bathrooms: 2,
          purchasePrice: 210000,
          currentValue: 245000,
          monthlyRent: 1800, // Total from all units
          status: 'under_management' as const,
          units: [
            { name: 'Room 1 - Master', area: 15, targetRent: 450 },
            { name: 'Room 2 - Double', area: 12, targetRent: 400 },
            { name: 'Room 3 - Single', area: 10, targetRent: 350 },
            { name: 'Room 4 - Double', area: 13, targetRent: 420 },
            { name: 'Room 5 - Single', area: 9, targetRent: 320 }
          ]
        }
      ];

      // Create properties
      const createdProperties: SimplifiedProperty[] = [];
      for (const propertyData of sampleProperties) {
        // For HMO properties, calculate total rent from units
        const totalTargetRent = propertyData.propertyType === 'hmo' && propertyData.units
          ? propertyData.units.reduce((sum, unit) => sum + unit.targetRent, 0)
          : propertyData.monthlyRent;

        const propertyToCreate = {
          ...propertyData,
          targetRent: totalTargetRent,
          unitDetails: propertyData.propertyType === 'hmo' ? propertyData.units : undefined
        };

        const property = await SimplifiedPropertyService.createSimplifiedProperty(propertyToCreate);
        if (property) {
          createdProperties.push(property);
        }
      }

      // Sample tenants
      const sampleTenants = [
        {
          name: 'Sarah Johnson',
          email: 'sarah.johnson@email.com',
          phone: '07123 456789',
          monthlyRent: 1200,
          depositAmount: 1800,
          leaseStart: new Date('2024-01-15'),
          leaseEnd: new Date('2024-12-14'),
          rentStatus: 'current' as const,
          onboardingStatus: 'completed' as const,
          propertyId: createdProperties[0]?.id
        },
        {
          name: 'Michael Chen',
          email: 'michael.chen@email.com',
          phone: '07234 567890',
          monthlyRent: 950,
          depositAmount: 1425,
          leaseStart: new Date('2024-03-01'),
          leaseEnd: new Date('2025-02-28'),
          rentStatus: 'current' as const,
          onboardingStatus: 'completed' as const,
          propertyId: createdProperties[1]?.id
        },
        // HMO tenants - multiple tenants in the same property
        {
          name: 'Emma Thompson',
          email: 'emma.thompson@email.com',
          phone: '07345 678901',
          monthlyRent: 450,
          depositAmount: 675,
          leaseStart: new Date('2024-02-10'),
          leaseEnd: new Date('2025-01-09'),
          rentStatus: 'current' as const,
          onboardingStatus: 'completed' as const,
          propertyId: createdProperties[2]?.id,
          unitNumber: 'Room 1',
          roomName: 'Room 1 - Master'
        },
        {
          name: 'James Wilson',
          email: 'james.wilson@email.com',
          phone: '07456 789012',
          monthlyRent: 400,
          depositAmount: 600,
          leaseStart: new Date('2024-03-15'),
          leaseEnd: new Date('2025-02-14'),
          rentStatus: 'current' as const,
          onboardingStatus: 'completed' as const,
          propertyId: createdProperties[2]?.id,
          unitNumber: 'Room 2',
          roomName: 'Room 2 - Double'
        },
        {
          name: 'Lisa Martinez',
          email: 'lisa.martinez@email.com',
          phone: '07567 890123',
          monthlyRent: 350,
          depositAmount: 525,
          leaseStart: new Date('2024-04-01'),
          leaseEnd: new Date('2025-03-31'),
          rentStatus: 'overdue' as const,
          onboardingStatus: 'in_progress' as const,
          propertyId: createdProperties[2]?.id,
          unitNumber: 'Room 3',
          roomName: 'Room 3 - Single'
        }
      ];

      // Create tenants
      const createdTenants: SimplifiedTenant[] = [];
      for (const tenantData of sampleTenants) {
        if (tenantData.propertyId) {
          const tenant = await SimplifiedTenantService.createSimplifiedTenant(tenantData);
          if (tenant) {
            createdTenants.push(tenant);
          }
        }
      }

      return {
        properties: createdProperties,
        tenants: createdTenants
      };
    } catch (error) {
      console.error('Error seeding demo data:', error);
      return { properties: [], tenants: [] };
    }
  }

  static async clearDemoData(): Promise<void> {
    try {
      // Get all properties and tenants
      const [properties, tenants] = await Promise.all([
        SimplifiedPropertyService.getSimplifiedProperties(),
        SimplifiedTenantService.getSimplifiedTenants()
      ]);

      // Delete all tenants first (due to foreign key constraints)
      for (const tenant of tenants) {
        await SimplifiedTenantService.deleteSimplifiedTenant(tenant.id);
      }

      // Delete all properties
      for (const property of properties) {
        await SimplifiedPropertyService.deletePropertyWithTenants(property.id);
      }
    } catch (error) {
      console.error('Error clearing demo data:', error);
    }
  }

  static async hasDemoData(): Promise<boolean> {
    try {
      const [properties, tenants] = await Promise.all([
        SimplifiedPropertyService.getSimplifiedProperties(),
        SimplifiedTenantService.getSimplifiedTenants()
      ]);
      
      return properties.length > 0 || tenants.length > 0;
    } catch (error) {
      console.error('Error checking demo data:', error);
      return false;
    }
  }
}