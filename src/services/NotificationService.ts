import { supabase } from '../lib/supabase';
import { Property, Tenant, Inspection } from '../types';

export type NotificationType = 
  | 'inspection_due'
  | 'lease_renewal'
  | 'right_to_rent_expiring'
  | 'hmo_license_expiring'
  | 'deposit_protection'
  | 'rent_overdue'
  | 'maintenance_followup'
  | 'property_photos'
  | 'tenant_documents'
  | 'property_details'
  | 'vacant_property'
  | 'certificate_tracking';

export interface PropertyNotification {
  id: string;
  type: NotificationType;
  priority: 'high' | 'medium' | 'low';
  title: string;
  message: string;
  actionText?: string;
  actionLink?: string;
  propertyId?: string;
  tenantId?: string;
  daysUntilDue?: number;
  createdAt: Date;
}

export class NotificationService {
  /**
   * Generate helpful property management notifications
   */
  static async generatePropertyNotifications(
    organizationId: string
  ): Promise<PropertyNotification[]> {
    const notifications: PropertyNotification[] = [];

    try {
      // Fetch properties
      const { data: properties } = await supabase
        .from('properties')
        .select('*')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false });

      // Fetch tenants
      const { data: tenants } = await supabase
        .from('tenants')
        .select('*')
        .eq('organization_id', organizationId);

      // Fetch inspections
      const { data: inspections } = await supabase
        .from('inspections')
        .select('*')
        .eq('organization_id', organizationId)
        .eq('status', 'scheduled');

      if (properties) {
        // Check for properties needing inspections
        notifications.push(...this.checkInspectionsDue(properties as Property[]));

        // Check for HMO license expiry
        notifications.push(...this.checkHMOLicenses(properties as Property[]));

        // Check for vacant properties
        notifications.push(...this.checkVacantProperties(properties as Property[]));

        // Check for missing property photos
        notifications.push(...this.checkPropertyPhotos(properties as Property[]));

        // Check for incomplete property details
        notifications.push(...this.checkPropertyDetails(properties as Property[]));

        // Check for certificate tracking
        notifications.push(...this.checkCertificates(properties as Property[]));
      }

      if (tenants) {
        // Check lease renewals
        notifications.push(...this.checkLeaseRenewals(tenants as Tenant[], properties as Property[]));

        // Check right to rent expiry (UK)
        notifications.push(...this.checkRightToRent(tenants as Tenant[], properties as Property[]));

        // Check deposit protection
        notifications.push(...this.checkDepositProtection(tenants as Tenant[], properties as Property[]));

        // Check for missing tenant documents
        notifications.push(...this.checkTenantDocuments(tenants as Tenant[], properties as Property[]));
      }

      // Always ensure we show at least 6 notifications for active management
      // If user has properties but few notifications, add proactive suggestions
      if (properties && properties.length > 0 && notifications.length < 6) {
        notifications.push(...this.generateProactiveSuggestions(properties as Property[], tenants as Tenant[], notifications.length));
      }

      // Sort by priority and date
      return notifications.sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    } catch (error) {
      console.error('Error generating notifications:', error);
      return [];
    }
  }

  private static checkInspectionsDue(properties: Property[]): PropertyNotification[] {
    const notifications: PropertyNotification[] = [];
    const today = new Date();

    for (const property of properties) {
      if (property.status === 'occupied' || property.status === 'partially_occupied') {
        // Check if property needs inspection (every 6 months is recommended)
        const lastInspectionDate = new Date(property.createdAt);
        const daysSinceLastInspection = Math.floor(
          (today.getTime() - lastInspectionDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceLastInspection > 150) { // ~5 months
          notifications.push({
            id: `inspection-${property.id}`,
            type: 'inspection_due',
            priority: 'medium',
            title: '🏠 Property Inspection Recommended',
            message: `Consider scheduling an inspection for ${property.address}. Regular inspections help identify maintenance issues early.`,
            actionText: 'Schedule Inspection',
            propertyId: property.id,
            daysUntilDue: 30,
            createdAt: new Date(),
          });
        }
      }
    }

    return notifications;
  }

  private static checkHMOLicenses(properties: Property[]): PropertyNotification[] {
    const notifications: PropertyNotification[] = [];
    const today = new Date();

    for (const property of properties) {
      if (property.isHMO && property.hmoLicenseExpiry) {
        const expiryDate = new Date(property.hmoLicenseExpiry);
        const daysUntilExpiry = Math.floor(
          (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilExpiry > 0 && daysUntilExpiry <= 90) {
          notifications.push({
            id: `hmo-${property.id}`,
            type: 'hmo_license_expiring',
            priority: daysUntilExpiry <= 30 ? 'high' : 'medium',
            title: '⚠️ HMO License Expiring Soon',
            message: `HMO license for ${property.address} expires in ${daysUntilExpiry} days. Start renewal process now.`,
            actionText: 'View Property',
            propertyId: property.id,
            daysUntilDue: daysUntilExpiry,
            createdAt: new Date(),
          });
        }
      }
    }

    return notifications;
  }

  private static checkVacantProperties(properties: Property[]): PropertyNotification[] {
    const notifications: PropertyNotification[] = [];
    const today = new Date();

    for (const property of properties) {
      if (property.status === 'vacant') {
        const daysSinceCreated = Math.floor(
          (today.getTime() - new Date(property.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysSinceCreated > 30) {
          notifications.push({
            id: `vacant-${property.id}`,
            type: 'vacant_property',
            priority: 'medium',
            title: '🏚️ Vacant Property',
            message: `${property.address} has been vacant. Consider marketing it or scheduling a viewing.`,
            actionText: 'Add Tenant',
            propertyId: property.id,
            createdAt: new Date(),
          });
        }
      }
    }

    return notifications;
  }

  private static checkLeaseRenewals(tenants: Tenant[], properties: Property[]): PropertyNotification[] {
    const notifications: PropertyNotification[] = [];
    const today = new Date();

    for (const tenant of tenants) {
      if (tenant.status === 'active' && tenant.leaseEnd) {
        const leaseEndDate = new Date(tenant.leaseEnd);
        const daysUntilEnd = Math.floor(
          (leaseEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
        );

        if (daysUntilEnd > 0 && daysUntilEnd <= 60) {
          const property = properties.find(p => p.id === tenant.propertyId);
          notifications.push({
            id: `lease-${tenant.id}`,
            type: 'lease_renewal',
            priority: daysUntilEnd <= 30 ? 'high' : 'medium',
            title: '📝 Lease Renewal Coming Up',
            message: `${tenant.name}'s lease at ${property?.address || 'property'} ends in ${daysUntilEnd} days. Contact tenant about renewal.`,
            actionText: 'View Tenant',
            tenantId: tenant.id,
            propertyId: tenant.propertyId,
            daysUntilDue: daysUntilEnd,
            createdAt: new Date(),
          });
        }
      }
    }

    return notifications;
  }

  private static checkRightToRent(tenants: Tenant[], properties: Property[]): PropertyNotification[] {
    const notifications: PropertyNotification[] = [];
    const today = new Date();

    for (const tenant of tenants) {
      // Only check for UK properties
      if (tenant.countryCode === 'UK' && tenant.status === 'active') {
        // Check if right to rent was never checked
        if (!tenant.rightToRentChecked) {
          notifications.push({
            id: `rtr-check-${tenant.id}`,
            type: 'right_to_rent_expiring',
            priority: 'high',
            title: '⚠️ Right to Rent Check Required',
            message: `${tenant.name} needs a Right to Rent check. This is legally required before tenancy starts.`,
            actionText: 'Update Status',
            tenantId: tenant.id,
            propertyId: tenant.propertyId,
            createdAt: new Date(),
          });
        } else if (tenant.rightToRentExpiry) {
          // Check if expiring soon
          const expiryDate = new Date(tenant.rightToRentExpiry);
          const daysUntilExpiry = Math.floor(
            (expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
          );

          if (daysUntilExpiry > 0 && daysUntilExpiry <= 30) {
            const property = properties.find(p => p.id === tenant.propertyId);
            notifications.push({
              id: `rtr-expiry-${tenant.id}`,
              type: 'right_to_rent_expiring',
              priority: 'high',
              title: '⚠️ Right to Rent Expiring',
              message: `${tenant.name}'s Right to Rent at ${property?.address || 'property'} expires in ${daysUntilExpiry} days. Conduct follow-up check.`,
              actionText: 'View Tenant',
              tenantId: tenant.id,
              propertyId: tenant.propertyId,
              daysUntilDue: daysUntilExpiry,
              createdAt: new Date(),
            });
          }
        }
      }
    }

    return notifications;
  }

  private static checkDepositProtection(tenants: Tenant[], properties: Property[]): PropertyNotification[] {
    const notifications: PropertyNotification[] = [];

    for (const tenant of tenants) {
      if (tenant.status === 'active' && tenant.depositAmount && tenant.depositAmount > 0) {
        // Check if deposit is protected
        if (!tenant.depositProtectedDate || !tenant.depositScheme) {
          const property = properties.find(p => p.id === tenant.propertyId);
          notifications.push({
            id: `deposit-${tenant.id}`,
            type: 'deposit_protection',
            priority: 'high',
            title: '💰 Deposit Protection Required',
            message: `${tenant.name}'s deposit for ${property?.address || 'property'} needs to be protected. This is legally required.`,
            actionText: 'Update Details',
            tenantId: tenant.id,
            propertyId: tenant.propertyId,
            createdAt: new Date(),
          });
        }
      }
    }

    return notifications;
  }

  private static checkPropertyPhotos(properties: Property[]): PropertyNotification[] {
    const notifications: PropertyNotification[] = [];

    for (const property of properties) {
      // Check if property might not have photos (this would need actual photo data)
      // For now, we'll suggest adding photos for properties
      const needsPhotos = Math.random() > 0.7; // Placeholder logic
      
      if (needsPhotos) {
        notifications.push({
          id: `photos-${property.id}`,
          type: 'property_photos',
          priority: 'low',
          title: '📸 Add Property Photos',
          message: `Upload photos for ${property.address}. Good photos help with marketing, documentation, and tenant communications.`,
          actionText: 'Upload Photos',
          propertyId: property.id,
          createdAt: new Date(),
        });
      }
    }

    return notifications.slice(0, 2); // Limit to 2 photo suggestions
  }

  private static checkPropertyDetails(properties: Property[]): PropertyNotification[] {
    const notifications: PropertyNotification[] = [];

    for (const property of properties) {
      const missingDetails: string[] = [];

      if (!property.bedrooms) missingDetails.push('bedrooms');
      if (!property.bathrooms) missingDetails.push('bathrooms');
      if (!property.squareMeters) missingDetails.push('square footage');
      if (!property.purchasePrice) missingDetails.push('purchase price');
      if (!property.currentValue) missingDetails.push('current value');

      if (missingDetails.length > 0) {
        notifications.push({
          id: `details-${property.id}`,
          type: 'property_details',
          priority: 'low',
          title: '📋 Complete Property Details',
          message: `${property.address} is missing ${missingDetails.slice(0, 2).join(', ')}${missingDetails.length > 2 ? ', and more' : ''}. Complete details help track your portfolio value.`,
          actionText: 'Edit Property',
          propertyId: property.id,
          createdAt: new Date(),
        });
      }
    }

    return notifications.slice(0, 2); // Limit to 2 detail suggestions
  }

  private static checkCertificates(properties: Property[]): PropertyNotification[] {
    const notifications: PropertyNotification[] = [];

    for (const property of properties) {
      if (property.status === 'occupied' || property.status === 'partially_occupied') {
        // Suggest setting up certificate tracking
        notifications.push({
          id: `cert-${property.id}`,
          type: 'certificate_tracking',
          priority: 'medium',
          title: '🔒 Safety Certificate Tracking',
          message: `Set up safety certificate reminders for ${property.address} (Gas Safety, EPC, EICR). Never miss renewal deadlines.`,
          actionText: 'Set Up Tracking',
          propertyId: property.id,
          createdAt: new Date(),
        });
      }
    }

    return notifications.slice(0, 2); // Limit to 2 certificate suggestions
  }

  private static checkTenantDocuments(tenants: Tenant[], properties: Property[]): PropertyNotification[] {
    const notifications: PropertyNotification[] = [];

    for (const tenant of tenants) {
      if (tenant.status === 'active') {
        // Check for missing lease agreement
        if (!tenant.leaseStart || !tenant.leaseEnd) {
          const property = properties.find(p => p.id === tenant.propertyId);
          notifications.push({
            id: `docs-${tenant.id}`,
            type: 'tenant_documents',
            priority: 'medium',
            title: '📄 Complete Tenant Lease Details',
            message: `${tenant.name} at ${property?.address || 'property'} is missing lease dates. Complete the tenancy agreement details.`,
            actionText: 'Update Lease',
            tenantId: tenant.id,
            propertyId: tenant.propertyId,
            createdAt: new Date(),
          });
        }
      }
    }

    return notifications.slice(0, 2); // Limit to 2 document suggestions
  }

  private static generateProactiveSuggestions(
    properties: Property[],
    tenants: Tenant[],
    currentCount: number
  ): PropertyNotification[] {
    const suggestions: PropertyNotification[] = [];
    const needed = Math.min(6 - currentCount, properties.length);

    // Generate property-specific actionable suggestions
    for (let i = 0; i < needed && i < properties.length; i++) {
      const property = properties[i];
      const propertyTenants = tenants?.filter(t => t.propertyId === property.id) || [];

      if (property.status === 'occupied' && propertyTenants.length > 0) {
        // Suggest rent review
        suggestions.push({
          id: `review-rent-${property.id}`,
          type: 'inspection_due',
          priority: 'low',
          title: '💰 Annual Rent Review',
          message: `Review rent for ${property.address}. Check market rates to ensure competitive pricing while maximizing returns.`,
          actionText: 'Review Rent',
          propertyId: property.id,
          createdAt: new Date(),
        });
      } else if (property.status === 'vacant') {
        // Suggest preparing for new tenant
        suggestions.push({
          id: `prepare-${property.id}`,
          type: 'vacant_property',
          priority: 'medium',
          title: '🏠 Prepare for New Tenant',
          message: `${property.address} is vacant. Schedule cleaning, maintenance check, and update marketing materials.`,
          actionText: 'View Property',
          propertyId: property.id,
          createdAt: new Date(),
        });
      } else {
        // Suggest property review
        suggestions.push({
          id: `review-${property.id}`,
          type: 'property_details',
          priority: 'low',
          title: '🔍 Property Portfolio Review',
          message: `Review ${property.address} details. Update valuations, check market conditions, and plan any improvements.`,
          actionText: 'Review Property',
          propertyId: property.id,
          createdAt: new Date(),
        });
      }
    }

    return suggestions;
  }
}

