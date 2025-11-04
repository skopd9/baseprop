import React, { useState, useEffect } from 'react';
import { 
  CurrencyPoundIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  HomeIcon
} from '@heroicons/react/24/outline';
import { SimplifiedProperty, SimplifiedTenant } from '../utils/simplifiedDataTransforms';
import { RentPaymentService } from '../services/RentPaymentService';
import { RentPayment } from '../types/index';

interface RentTrackingProps {
  properties: SimplifiedProperty[];
  tenants: SimplifiedTenant[];
}

interface RentRecord {
  id: string;
  tenantId: string;
  tenantName: string;
  propertyAddress: string;
  amountDue: number;
  dueDate: Date;
  isPaid: boolean;
  isProRated: boolean;
  proRateDays?: number;
  periodStart: Date;
  periodEnd: Date;
  paidAmount?: number;
  paidDate?: Date;
  notes?: string;
}

export const RentTracking: React.FC<RentTrackingProps> = ({
  properties,
  tenants
}) => {
  const [rentRecords, setRentRecords] = useState<RentRecord[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<RentRecord | null>(null);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Load rent payment records from database for current month
  useEffect(() => {
    const loadPaymentRecords = async () => {
      setIsLoading(true);
      try {
        // Get current month's start and end
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

        // Load payments for all tenants for current month
        const allPayments = await Promise.all(
          tenants.map(async (tenant) => {
            const payments = await RentPaymentService.getRentPaymentsForTenant(tenant.id);
            // Filter to current month's payments
            return payments.filter(payment => {
              const dueDate = new Date(payment.dueDate);
              return dueDate >= startOfMonth && dueDate <= endOfMonth;
            });
          })
        );

        // Flatten and transform to RentRecord format
        const records: RentRecord[] = allPayments.flat().map(payment => {
          const tenant = tenants.find(t => t.id === payment.tenantId);
          const property = properties.find(p => p.id === payment.propertyId);
          
          return {
            id: payment.id,
            tenantId: payment.tenantId,
            tenantName: tenant?.name || 'Unknown Tenant',
            propertyAddress: property?.address || 'Unknown Property',
            amountDue: payment.amountDue,
            dueDate: new Date(payment.dueDate),
            isPaid: payment.status === 'paid',
            isProRated: payment.isProRated || false,
            proRateDays: payment.proRateDays,
            periodStart: payment.periodStart ? new Date(payment.periodStart) : new Date(payment.dueDate),
            periodEnd: payment.periodEnd ? new Date(payment.periodEnd) : new Date(payment.dueDate),
            paidAmount: payment.amountPaid,
            paidDate: payment.amountPaid ? new Date(payment.paymentDate) : undefined,
            notes: payment.notes,
          };
        });

        setRentRecords(records);
      } catch (error) {
        console.error('Error loading payment records:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (tenants.length > 0) {
      loadPaymentRecords();
    } else {
      setIsLoading(false);
    }
  }, [tenants, properties]);

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

  const handleMarkAsPaid = (record: RentRecord) => {
    setSelectedRecord(record);
    setPaymentAmount(record.amountDue.toString());
    setPaymentDate(new Date().toISOString().split('T')[0]);
    setPaymentNotes('');
    setShowPaymentModal(true);
  };

  const handleRecordPayment = async () => {
    if (!selectedRecord) return;

    try {
      // Save payment to database
      const success = await RentPaymentService.recordPayment({
        paymentId: selectedRecord.id,
        amountPaid: parseFloat(paymentAmount),
        paymentDate: new Date(paymentDate),
        paymentMethod: 'bank_transfer', // Default method
        notes: paymentNotes || undefined,
      });

      if (success) {
        // Update local state
        const updatedRecord: RentRecord = {
          ...selectedRecord,
          isPaid: true,
          paidAmount: parseFloat(paymentAmount),
          paidDate: new Date(paymentDate),
          notes: paymentNotes || undefined
        };

        setRentRecords(prev => 
          prev.map(record => 
            record.id === selectedRecord.id ? updatedRecord : record
          )
        );

        setShowPaymentModal(false);
        setSelectedRecord(null);
        setPaymentAmount('');
        setPaymentDate('');
        setPaymentNotes('');
      } else {
        alert('Failed to record payment. Please try again.');
      }
    } catch (error) {
      console.error('Error recording payment:', error);
      alert('An error occurred while recording the payment.');
    }
  };

  const handleMarkAsUnpaid = async (record: RentRecord) => {
    // Note: For simplicity, we're just updating the UI
    // In a full implementation, you'd add an API method to mark as unpaid
    console.log('Mark as unpaid not yet implemented for database records');
    alert('This feature will be available in a future update.');
  };

  // Calculate summary stats
  const totalRent = rentRecords.reduce((sum, record) => sum + record.amountDue, 0);
  const paidRecords = rentRecords.filter(record => record.isPaid);
  const unpaidRecords = rentRecords.filter(record => !record.isPaid);
  const totalPaid = paidRecords.reduce((sum, record) => sum + (record.paidAmount || 0), 0);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Rent Tracking</h2>
          <p className="text-sm sm:text-base text-gray-600">Track tenant rent payments for {formatDate(new Date())}</p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
              <CurrencyPoundIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total Expected</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{formatCurrency(totalRent)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
              <CheckCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Paid</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{formatCurrency(totalPaid)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
              <XCircleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-red-600" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Outstanding</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900 truncate">{formatCurrency(totalRent - totalPaid)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center">
            <div className="p-2 bg-yellow-100 rounded-lg flex-shrink-0">
              <ClockIcon className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-600" />
            </div>
            <div className="ml-3 sm:ml-4 min-w-0">
              <p className="text-xs sm:text-sm font-medium text-gray-600">Tenants Paid</p>
              <p className="text-xl sm:text-2xl font-bold text-gray-900">{paidRecords.length}/{rentRecords.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rent Records Table */}
      <div className="bg-white rounded-lg shadow border border-gray-200">
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-200">
          <h3 className="text-base sm:text-lg font-medium text-gray-900">Rent Payments</h3>
        </div>
        
        {isLoading ? (
          <div className="p-6 sm:p-8 text-center">
            <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-blue-600 mx-auto mb-3 sm:mb-4"></div>
            <p className="text-sm sm:text-base text-gray-600">Loading payment records...</p>
          </div>
        ) : rentRecords.length === 0 ? (
          <div className="p-6 sm:p-8 text-center">
            <UserIcon className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-3 sm:mb-4" />
            <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No Payment Records</h3>
            <p className="text-sm sm:text-base text-gray-600">Payment records will appear here when tenants are added with lease details.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {rentRecords.map((record) => (
              <div key={record.id} className="p-4 sm:p-6 hover:bg-gray-50">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start space-x-3 sm:space-x-4 flex-1 min-w-0">
                    <div className="flex-shrink-0">
                      <div className={`p-1.5 sm:p-2 rounded-lg ${
                        record.isPaid ? 'bg-green-100' : 'bg-gray-100'
                      }`}>
                        {record.isPaid ? (
                          <CheckCircleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-green-600" />
                        ) : (
                          <CurrencyPoundIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-600" />
                        )}
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="text-sm sm:text-base font-medium text-gray-900 truncate">
                          {record.tenantName}
                        </p>
                        <span className={`inline-flex items-center px-2 py-0.5 sm:py-1 rounded-full text-xs font-medium whitespace-nowrap ${
                          record.isPaid 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {record.isPaid ? 'Paid' : 'Unpaid'}
                        </span>
                      </div>
                      
                      <div className="space-y-1 text-xs sm:text-sm text-gray-500">
                        <div className="flex items-center space-x-1">
                          <HomeIcon className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">{record.propertyAddress}</span>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                          <span className="whitespace-nowrap">Due: {formatDate(record.dueDate)}</span>
                          {record.paidDate && (
                            <span className="whitespace-nowrap">Paid: {formatDate(record.paidDate)}</span>
                          )}
                        </div>
                        
                        {record.notes && (
                          <p className="text-gray-600 mt-1 line-clamp-2">{record.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-4 flex-shrink-0">
                    <div className="text-left sm:text-right">
                      <p className="text-base sm:text-lg font-medium text-gray-900">
                        {formatCurrency(record.amountDue)}
                      </p>
                      {record.isProRated && (
                        <p className="text-xs text-gray-500">
                          Pro-rated ({record.proRateDays} days)
                        </p>
                      )}
                      {record.isPaid && record.paidAmount !== record.amountDue && (
                        <p className="text-xs sm:text-sm text-gray-500">
                          Paid: {formatCurrency(record.paidAmount || 0)}
                        </p>
                      )}
                    </div>
                    
                    <div className="flex flex-shrink-0">
                      {record.isPaid ? (
                        <button
                          onClick={() => handleMarkAsUnpaid(record)}
                          className="inline-flex items-center px-2 sm:px-3 py-1 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 whitespace-nowrap"
                        >
                          Mark Unpaid
                        </button>
                      ) : (
                        <button
                          onClick={() => handleMarkAsPaid(record)}
                          className="inline-flex items-center px-2 sm:px-3 py-1 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 whitespace-nowrap"
                        >
                          Mark Paid
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      {showPaymentModal && selectedRecord && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Record Payment</h3>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600">
                  <strong>{selectedRecord.tenantName}</strong> - {selectedRecord.propertyAddress}
                </p>
                <p className="text-sm text-gray-500">
                  Expected: {formatCurrency(selectedRecord.amountDue)}
                  {selectedRecord.isProRated && ` (Pro-rated for ${selectedRecord.proRateDays} days)`}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Period: {formatDate(selectedRecord.periodStart)} - {formatDate(selectedRecord.periodEnd)}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Amount Paid
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">£</span>
                  </div>
                  <input
                    type="number"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
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
                  value={paymentDate}
                  onChange={(e) => setPaymentDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  rows={2}
                  placeholder="Payment method, reference, etc..."
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleRecordPayment}
                  className="px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                >
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};