import { CreditCheckProvider, CreditCheck, CreditCheckResult } from '../types/creditCheck';

export class CreditCheckService {
  private static providers: CreditCheckProvider[] = [
    {
      id: 'credas',
      name: 'Credas',
      cost: 30,
      apiEndpoint: 'https://api.credas.co.uk',
      features: ['Right to Rent', 'Credit Check', 'ID Verification', 'AML Checks'],
      turnaroundTime: '24 hours',
      description: 'Comprehensive tenant referencing with Right to Rent checks'
    },
    {
      id: 'homelet',
      name: 'Homelet Reference',
      cost: 35,
      apiEndpoint: 'https://api.homelet.co.uk',
      features: ['Credit Check', 'Employment Verification', 'Landlord Reference', 'Affordability Assessment'],
      turnaroundTime: '24-48 hours',
      description: 'Full tenant referencing from UK\'s leading provider'
    },
    {
      id: 'vouch',
      name: 'Vouch',
      cost: 28,
      apiEndpoint: 'https://api.vouch.rent',
      features: ['Credit Check', 'Open Banking', 'Instant Results', 'Digital ID'],
      turnaroundTime: '15 minutes',
      description: 'Modern instant referencing using open banking'
    },
    {
      id: 'rental-exchange',
      name: 'Rental Exchange',
      cost: 32,
      apiEndpoint: 'https://api.rentalexchange.com',
      features: ['Credit Check', 'Rental History', 'Payment Behavior', 'Tenant Score'],
      turnaroundTime: '24 hours',
      description: 'Credit checks with rental payment history'
    }
  ];

  static getProviders(): CreditCheckProvider[] {
    return this.providers;
  }

  static getProvider(providerId: string): CreditCheckProvider | undefined {
    return this.providers.find(p => p.id === providerId);
  }

  static getDefaultProvider(): CreditCheckProvider {
    return this.providers[0]; // Credas as default
  }

  static async orderCreditCheck(check: CreditCheck, providerId: string): Promise<CreditCheck> {
    const provider = this.getProvider(providerId);
    
    if (!provider) {
      throw new Error(`Provider ${providerId} not found`);
    }

    // Simulate API call to credit check provider
    console.log(`Ordering credit check from ${provider.name} for ${check.name}`);
    
    // In production, this would make an actual API call:
    // const response = await fetch(provider.apiEndpoint + '/checks', {
    //   method: 'POST',
    //   headers: { 'Authorization': 'Bearer xxx' },
    //   body: JSON.stringify({ name: check.name, email: check.email })
    // });

    return {
      ...check,
      status: 'ordered',
      providerId,
      cost: provider.cost,
      orderedDate: new Date()
    };
  }

  static async checkStatus(checkId: string, providerId: string): Promise<CreditCheckResult> {
    // Simulate checking status from provider
    console.log(`Checking status for check ${checkId} with provider ${providerId}`);
    
    // In production, this would query the provider's API
    return {
      checkId,
      status: 'passed',
      score: 720,
      details: 'Credit check completed successfully'
    };
  }

  static simulateCompletion(check: CreditCheck): CreditCheck {
    // Demo mode: simulate successful completion
    return {
      ...check,
      status: 'completed',
      completedDate: new Date()
    };
  }

  static markAsCompleted(check: CreditCheck): CreditCheck {
    return {
      ...check,
      status: 'completed',
      completedDate: new Date()
    };
  }

  static markAsFailed(check: CreditCheck, reason: string): CreditCheck {
    return {
      ...check,
      status: 'failed',
      completedDate: new Date(),
      failureReason: reason
    };
  }
}

