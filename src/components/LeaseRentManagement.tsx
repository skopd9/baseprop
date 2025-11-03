import React, { useState } from 'react';
import { 
  CurrencyPoundIcon,
  CalendarIcon,
  UserIcon,
  HomeIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  DocumentTextIcon,
  BanknotesIcon
} from '@heroicons/react/24/outline';
import { SimplifiedProperty, SimplifiedTenant } from '../utils/simplifiedDataTransforms';

interface LeaseRentManagementProps {
  properties: SimplifiedProperty[];
  tenants: SimplifiedTenant[];
  onRecordPayment?: (payment: any) => void;
}

interface RentPayment {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyAddress: string;
  amount: number;
  dueDate: Date;
  paidDate?: Date;
  paymentMethod?: 'bank_transfer' | 'cash' | 'cheque' | 'standing_order';
  status: 'paid' | 'overdue' | 'pending';
  notes?: string;
}

interface LeaseRenewal {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyAddress: string;
  currentLeaseEnd: Date;
  renewalStatus: 'not_started' | 'in_progress' | 'renewed' | 'not_renewing';
  newLeaseEnd?: Date;
  newRentAmount?: number;
  notes?: string;
}

// Mock rent payment data
const mockRentPayments: RentPayment[] = [
  {
    id: 'payment-001',
    tenantId: 'tenant-001',
    tenantName: 'Sarah Johnson',
    propertyAddress: '123 Oak Street, Manchester M1 2AB',
    amount: 600,
    dueDate: new Date('2024-02-01'),
    paidDate: new Date('2024-01-30'),
    paymentMethod: 'standing_order',
    status: 'paid'
  },
  {
    id: 'payment-002',
    tenantId: 'tenant-003',
    tenantName: 'Emma Williams',
    propertyAddress: '123 Oak Street, Manchester M1 2AB',
    amount: 600,
    dueDate: new Date('2024-02-01'),
    status: 'overdue'
  },
  {
    id: 'payment-003',
    tenantId: 'tenant-005',
    tenantName: 'David & Lisa Thompson',
    propertyAddress: '45 Victoria Road, Birmingham B15 3TG',
    amount: 1200,
    dueDate: new Date('2024-02-01'),
    paidDate: new Date('2024-02-01'),
    paymentMethod: 'bank_transfer',
    status: 'paid'
  },
  {
    id: 'payment-004',
    tenantId: 'tenant-009',
    tenantName: 'Alex Martinez',
    propertyAddress: '12 Garden Lane, Liverpool L8 5RT',
    amount: 600,
    dueDate: new Date('2024-02-01'),
    status: 'overdue'
  }
];

// Mock lease renewal data
const mockLeaseRenewals: LeaseRenewal[] = [
  {
    id: 'renewal-001',
    tenantId: 'tenant-006',
    tenantName: 'Rachel Green',
    propertyAddress: '78 High Street, Leeds LS1 4HY',
    currentLeaseEnd: new Date('2024-08-14'),
    renewalStatus: 'not_started'
  },
  {
    id: 'renewal-002',
    tenantId: 'tenant-014',
    tenantName: 'Ben Clark',
    propertyAddress: '89 Park Avenue, Bristol BS1 5NR',
    currentLeaseEnd: new Date('2024-03-31'),
    renewalStatus: 'in_progress',
    newLeaseEnd: new Date('2025-03-31'),
    newRentAmount: 780
  }
];

export const LeaseRentManagement: React.FC<LeaseRentManagementProps> = ({
  properties,
  tenants,
  onRecordPayment
}) => {
  const [rentPayments, setRentPayments] = useState<RentPayment[]>(mockRentPayments);
  const [leaseRenewals, setLeaseRenewals] = useState<LeaseRenewal[]>(mockLeaseRenewals);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [selectedTab, setSelectedTab] = useState<'rent' | 'leases'>('rent');
  const [paymentForm, setPaymentForm] = useState({
    tenantId: '',
    amount: '',
    paidDate: '',
    paymentMethod: 'bank_transfer' as 'bank_transfer' | 'cash' | 'cheque' | 'standing_order',
    notes: ''
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(date);
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRenewalStatusColor = (status: string) => {
    switch (status) {
      case 'renewed':
        return 'bg-green-100 text-green-800';
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'not_renewing':
        return 'bg-red-100 text-red-800';
      case 'not_started':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRecordPayment = (e: React.FormEvent) => {
    e.preventDefault();
    
    const selectedTenant = tenants.find(t => t.id === paymentForm.tenantId);
    if (!selectedTenant) return;

    const newPayment: RentPayment = {
      id: `payment-${Date.now()}`,
      tenantId: paymentForm.tenantId,
      tenantName: selectedTenant.name,
      propertyAddress: selectedTenant.propertyAddress,
      amount: parseFloat(paymentForm.amount),
      dueDate: new Date(), // This would typically be calculated
      paidDate: new Date(paymentForm.paidDate),
      paymentMethod: paymentForm.paymentMethod,
      status: 'paid',
      notes: paymentForm.notes || undefined
    };

    setRentPayments([...rentPayments, newPayment]);
    setShowPaymentForm(false);
    setPaymentForm({
      tenantId: '',
      amount: '',
      paidDate: '',
      paymentMethod: 'bank_transfer',
      notes: ''
    });

    if (onRecordPayment) {
      onRecordPayment(newPayment);
    }
  };

  // Calculate summary stats
  const totalMonthlyRent = tenants.reduce((sum, tenant) => sum + tenant.monthlyRent, 0);
  const paidPayments = rentPayments.filter(p => p.status === 'paid').length;
  const overduePayments = rentPayments.filter(p => p.status === 'overdue').length;
  const pendingRenewals = leaseRenewals.filter(r => {
    const threeMonthsFromNow = new Date();
    threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
    return r.currentLeaseEnd <= threeMonthsFromNow;
  }).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Lease & Rent Management</h2>
          <p className="text-gray-600">Track rent payments and lease renewals</p>
        </div>
        <button
          onClick={() => setShowPaymentForm(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700"
        >
          <BanknotesIcon className="w-4 h-4 mr-2" />
          Record Payment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <CurrencyPoundIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Monthly Rent</p>
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalMonthlyRent)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircleIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Paid This Month</p>
              <p className="text-2xl font-bold text-gray-900">{paidPayments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Overdue</p>
              <p className="text-2xl font-bold text-gray-900">{overduePayments}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg">
              <ClockIcon className="w-6 h-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Renewals Due</p>
              <p className="text-2xl font-bold text-gray-900">{pendingRenewals}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setSelectedTab('rent')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'rent'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Rent Payments
          </button>
          <button
            onClick={() => setSelectedTab('leases')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              selectedTab === 'leases'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Lease Renewals
          </button>
        </nav>
      </div>

      {/* Rent Payments Tab */}
      {selectedTab === 'rent' && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Rent Payments</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {rentPayments.map((payment) => (
              <div key={payment.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <CurrencyPoundIcon className="w-5 h-5 text-gray-600" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">
                          {payment.tenantName}
                        </p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-500">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <HomeIcon className="w-4 h-4" />
                            <span className="truncate">{payment.propertyAddress}</span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <span>Due: {formatDate(payment.dueDate)}</span>
                          {payment.paidDate && (
                            <span>Paid: {formatDate(payment.paidDate)}</span>
                          )}
                          {payment.paymentMethod && (
                            <span className="capitalize">Method: {payment.paymentMethod.replace('_', ' ')}</span>
                          )}
                        </div>
                        
                        {payment.notes && (
                          <p className="text-gray-600 mt-1">{payment.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-lg font-medium text-gray-900">
                        {formatCurrency(payment.amount)}
                      </p>
                    </div>
                    
                    {payment.status === 'overdue' && (
                      <button
                        onClick={() => {
                          setPaymentForm({
                            ...paymentForm,
                            tenantId: payment.tenantId,
                            amount: payment.amount.toString()
                          });
                          setShowPaymentForm(true);
                        }}
                        className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                      >
                        Record Payment
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Lease Renewals Tab */}
      {selectedTab === 'leases' && (
        <div className="bg-white rounded-lg shadow border border-gray-200">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Lease Renewals</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {leaseRenewals.map((renewal) => (
              <div key={renewal.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <DocumentTextIcon className="w-5 h-5 text-gray-600" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">
                          {renewal.tenantName}
                        </p>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRenewalStatusColor(renewal.renewalStatus)}`}>
                          {renewal.renewalStatus.replace('_', ' ')}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <HomeIcon className="w-4 h-4" />
                          <span className="truncate">{renewal.propertyAddress}</span>
                        </div>
                        
                        <div className="flex items-center space-x-4">
                          <span>Current lease ends: {formatDate(renewal.currentLeaseEnd)}</span>
                          {renewal.newLeaseEnd && (
                            <span>New lease ends: {formatDate(renewal.newLeaseEnd)}</span>
                          )}
                        </div>
                        
                        {renewal.newRentAmount && (
                          <div className="flex items-center space-x-1">
                            <CurrencyPoundIcon className="w-4 h-4" />
                            <span>New rent: {formatCurrency(renewal.newRentAmount)}</span>
                          </div>
                        )}
                        
                        {renewal.notes && (
                          <p className="text-gray-600 mt-1">{renewal.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {renewal.renewalStatus === 'not_started' && (
                      <button className="inline-flex items-center px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50">
                        Start Renewal
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Record Rent Payment</h3>
            
            <form onSubmit={handleRecordPayment} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tenant
                </label>
                <select
                  value={paymentForm.tenantId}
                  onChange={(e) => {
                    const selectedTenant = tenants.find(t => t.id === e.target.value);
                    setPaymentForm({
                      ...paymentForm, 
                      tenantId: e.target.value,
                      amount: selectedTenant ? selectedTenant.monthlyRent.toString() : ''
                    });
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Select a tenant</option>
                  {tenants.map((tenant) => (
                    <option key={tenant.id} value={tenant.id}>
                      {tenant.name} - {tenant.propertyAddress}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">£</span>
                  </div>
                  <input
                    type="number"
                    value={paymentForm.amount}
                    onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Date
                </label>
                <input
                  type="date"
                  value={paymentForm.paidDate}
                  onChange={(e) => setPaymentForm({...paymentForm, paidDate: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Method
                </label>
                <select
                  value={paymentForm.paymentMethod}
                  onChange={(e) => setPaymentForm({...paymentForm, paymentMethod: e.target.value as any})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  <option value="bank_transfer">Bank Transfer</option>
                  <option value="standing_order">Standing Order</option>
                  <option value="cash">Cash</option>
                  <option value="cheque">Cheque</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({...paymentForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={2}
                  placeholder="Any additional notes..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentForm(false)}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  Record Payment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};