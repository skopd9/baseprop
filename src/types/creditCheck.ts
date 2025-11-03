export interface CreditCheckProvider {
  id: string;
  name: string;
  cost: number;
  apiEndpoint?: string;
  features: string[];
  turnaroundTime: string;
  description: string;
}

export interface CreditCheck {
  id: string;
  type: 'tenant' | 'guarantor';
  name: string;
  email: string;
  status: 'pending' | 'ordered' | 'completed' | 'failed';
  cost: number;
  providerId?: string;
  orderedDate?: Date;
  completedDate?: Date;
  failureReason?: string;
  reportUrl?: string;
}

export interface CreditCheckResult {
  checkId: string;
  status: 'passed' | 'failed' | 'review';
  score?: number;
  details?: string;
  recommendations?: string;
}

