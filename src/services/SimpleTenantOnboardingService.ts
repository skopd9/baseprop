import { SimplifiedTenant } from '../utils/simplifiedDataTransforms';

export interface SimpleOnboardingStatus {
  status: 'not_started' | 'in_progress' | 'completed';
  progress: number;
  notes?: string;
  completedAt?: Date;
}

export class SimpleTenantOnboardingService {
  private static onboardingStatuses: Map<string, SimpleOnboardingStatus> = new Map();

  static getOnboardingStatus(tenantId: string): SimpleOnboardingStatus {
    return this.onboardingStatuses.get(tenantId) || {
      status: 'not_started',
      progress: 0
    };
  }

  static updateOnboardingStatus(tenantId: string, status: SimpleOnboardingStatus): void {
    this.onboardingStatuses.set(tenantId, {
      ...status,
      completedAt: status.status === 'completed' ? new Date() : undefined
    });
  }

  static startOnboarding(tenant: SimplifiedTenant): SimpleOnboardingStatus {
    const status: SimpleOnboardingStatus = {
      status: 'in_progress',
      progress: 25, // Welcome email sent automatically
      notes: `Onboarding started for ${tenant.name}`
    };
    
    this.updateOnboardingStatus(tenant.id, status);
    return status;
  }

  static completeOnboarding(tenant: SimplifiedTenant, notes?: string): SimpleOnboardingStatus {
    const status: SimpleOnboardingStatus = {
      status: 'completed',
      progress: 100,
      notes: notes || `Onboarding completed for ${tenant.name}`,
      completedAt: new Date()
    };
    
    this.updateOnboardingStatus(tenant.id, status);
    return status;
  }

  static getOnboardingStats(): {
    total: number;
    notStarted: number;
    inProgress: number;
    completed: number;
  } {
    const statuses = Array.from(this.onboardingStatuses.values());
    
    return {
      total: statuses.length,
      notStarted: statuses.filter(s => s.status === 'not_started').length,
      inProgress: statuses.filter(s => s.status === 'in_progress').length,
      completed: statuses.filter(s => s.status === 'completed').length
    };
  }

  static sendWelcomeEmail(tenant: SimplifiedTenant): Promise<boolean> {
    // Simulate sending welcome email
    console.log(`Sending welcome email to ${tenant.name} at ${tenant.email}`);
    
    // Auto-start onboarding when welcome email is sent
    this.startOnboarding(tenant);
    
    return Promise.resolve(true);
  }

  static getOnboardingAction(tenant: SimplifiedTenant): {
    action: 'start' | 'manage' | 'complete' | 'view';
    label: string;
    color: string;
  } {
    const status = this.getOnboardingStatus(tenant.id);
    
    switch (status.status) {
      case 'not_started':
        return {
          action: 'start',
          label: 'Start Onboarding',
          color: 'blue'
        };
      case 'in_progress':
        return {
          action: 'manage',
          label: 'Manage Onboarding',
          color: 'orange'
        };
      case 'completed':
        return {
          action: 'view',
          label: 'View Completed',
          color: 'green'
        };
      default:
        return {
          action: 'start',
          label: 'Start Onboarding',
          color: 'blue'
        };
    }
  }
}