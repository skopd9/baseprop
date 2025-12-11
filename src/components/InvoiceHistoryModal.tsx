import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CurrencyPoundIcon,
  PaperAirplaneIcon,
  CalendarIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { InvoiceService, Invoice, TenantInvoiceData, InvoiceStatus } from '../services/InvoiceService';
import { useCurrency } from '../hooks/useCurrency';

interface InvoiceHistoryModalProps {
  tenant: TenantInvoiceData;
  onClose: () => void;
  onRecordPayment: (invoice: Invoice) => void;
}

export const InvoiceHistoryModal: React.FC<InvoiceHistoryModalProps> = ({
  tenant,
  onClose,
  onRecordPayment,
}) => {
  const { formatCurrency } = useCurrency();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [filter, setFilter] = useState<'all' | 'unpaid' | 'paid'>('all');

  useEffect(() => {
    loadInvoices();
  }, [tenant.tenantId]);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const data = await InvoiceService.getInvoicesByTenant(tenant.tenantId);
      setInvoices(data);
    } catch (error) {
      console.error('Error loading invoices:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = invoices.filter(inv => {
    if (filter === 'unpaid') return inv.status !== 'paid' && inv.status !== 'cancelled';
    if (filter === 'paid') return inv.status === 'paid';
    return true;
  });

  const getStatusBadge = (status: InvoiceStatus) => {
    const badges: Record<InvoiceStatus, { bg: string; text: string; icon: React.ReactNode; label: string }> = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', icon: <DocumentTextIcon className="w-3 h-3" />, label: 'Draft' },
      pending_approval: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: <ClockIcon className="w-3 h-3" />, label: 'Pending Approval' },
      approved: { bg: 'bg-blue-100', text: 'text-blue-700', icon: <CheckCircleIcon className="w-3 h-3" />, label: 'Approved' },
      sent: { bg: 'bg-purple-100', text: 'text-purple-700', icon: <PaperAirplaneIcon className="w-3 h-3" />, label: 'Sent' },
      paid: { bg: 'bg-green-100', text: 'text-green-700', icon: <CheckCircleIcon className="w-3 h-3" />, label: 'Paid' },
      partial: { bg: 'bg-orange-100', text: 'text-orange-700', icon: <CurrencyPoundIcon className="w-3 h-3" />, label: 'Partial' },
      overdue: { bg: 'bg-red-100', text: 'text-red-700', icon: <ExclamationTriangleIcon className="w-3 h-3" />, label: 'Overdue' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', icon: <XMarkIcon className="w-3 h-3" />, label: 'Cancelled' },
    };
    
    const badge = badges[status];
    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.icon}
        {badge.label}
      </span>
    );
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const totalPaid = invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0);
  const totalOutstanding = invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled')
    .reduce((sum, i) => sum + (i.totalAmount - i.amountPaid), 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Invoice History</h2>
            <p className="text-sm text-gray-500">{tenant.tenantName} • {tenant.propertyAddress}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Summary Cards */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500">Total Invoices</p>
              <p className="text-xl font-semibold text-gray-900">{invoices.length}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500">Total Paid</p>
              <p className="text-xl font-semibold text-green-600">{formatCurrency(totalPaid)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500">Outstanding</p>
              <p className="text-xl font-semibold text-red-600">{formatCurrency(totalOutstanding)}</p>
            </div>
            <div className="bg-white rounded-lg p-3 border border-gray-200">
              <p className="text-xs text-gray-500">Monthly Rent</p>
              <p className="text-xl font-semibold text-gray-900">{formatCurrency(tenant.monthlyRent)}</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="px-6 py-3 border-b border-gray-200 flex items-center gap-2">
          <span className="text-sm text-gray-500">Filter:</span>
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              filter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All ({invoices.length})
          </button>
          <button
            onClick={() => setFilter('unpaid')}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              filter === 'unpaid' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Unpaid ({invoices.filter(i => i.status !== 'paid' && i.status !== 'cancelled').length})
          </button>
          <button
            onClick={() => setFilter('paid')}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              filter === 'paid' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Paid ({invoices.filter(i => i.status === 'paid').length})
          </button>
        </div>

        {/* Invoice List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center p-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredInvoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <DocumentTextIcon className="w-12 h-12 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No invoices found</h3>
              <p className="text-gray-500">
                {filter === 'all' ? 'No invoices have been created yet' : `No ${filter} invoices`}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {filteredInvoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="px-6 py-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                        <DocumentTextIcon className="w-5 h-5 text-gray-500" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium text-gray-900">{invoice.invoiceNumber}</p>
                          {getStatusBadge(invoice.status)}
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                          <span className="flex items-center gap-1">
                            <CalendarIcon className="w-3 h-3" />
                            {formatDate(invoice.invoiceDate)}
                          </span>
                          <span>Due: {formatDate(invoice.dueDate)}</span>
                          {invoice.periodStart && invoice.periodEnd && (
                            <span>Period: {formatDate(invoice.periodStart)} - {formatDate(invoice.periodEnd)}</span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">{formatCurrency(invoice.totalAmount)}</p>
                        {invoice.amountPaid > 0 && invoice.amountPaid < invoice.totalAmount && (
                          <p className="text-xs text-gray-500">Paid: {formatCurrency(invoice.amountPaid)}</p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setSelectedInvoice(selectedInvoice?.id === invoice.id ? null : invoice)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="View details"
                        >
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        
                        {invoice.status !== 'paid' && invoice.status !== 'cancelled' && invoice.status !== 'draft' && (
                          <button
                            onClick={() => onRecordPayment(invoice)}
                            className="p-2 text-green-500 hover:text-green-600 hover:bg-green-50 rounded-lg"
                            title="Record payment"
                          >
                            <CurrencyPoundIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Expanded Details */}
                  {selectedInvoice?.id === invoice.id && (
                    <div className="mt-4 pl-14 border-l-2 border-gray-200 ml-5">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <p className="text-gray-500">Sent To</p>
                          <p className="text-gray-900">
                            {invoice.sentTo?.join(', ') || 'Not sent yet'}
                          </p>
                        </div>
                        <div>
                          <p className="text-gray-500">Sent At</p>
                          <p className="text-gray-900">
                            {invoice.sentAt ? formatDate(invoice.sentAt) : '-'}
                          </p>
                        </div>
                        {invoice.status === 'paid' && (
                          <>
                            <div>
                              <p className="text-gray-500">Payment Method</p>
                              <p className="text-gray-900">{invoice.paymentMethod || '-'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Payment Reference</p>
                              <p className="text-gray-900">{invoice.paymentReference || '-'}</p>
                            </div>
                            <div>
                              <p className="text-gray-500">Paid At</p>
                              <p className="text-gray-900">{formatDate(invoice.paidAt)}</p>
                            </div>
                          </>
                        )}
                        {invoice.notes && (
                          <div className="col-span-2">
                            <p className="text-gray-500">Notes</p>
                            <p className="text-gray-900">{invoice.notes}</p>
                          </div>
                        )}
                      </div>
                      
                      {/* Line Items */}
                      {invoice.lineItems && invoice.lineItems.length > 0 && (
                        <div className="mt-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Line Items</p>
                          <div className="bg-gray-50 rounded-lg p-3">
                            <table className="w-full text-sm">
                              <thead>
                                <tr className="text-left text-gray-500">
                                  <th className="pb-2">Description</th>
                                  <th className="pb-2 text-right">Qty</th>
                                  <th className="pb-2 text-right">Unit Price</th>
                                  <th className="pb-2 text-right">Amount</th>
                                </tr>
                              </thead>
                              <tbody className="text-gray-900">
                                {invoice.lineItems.map((item, idx) => (
                                  <tr key={idx}>
                                    <td className="py-1">{item.description}</td>
                                    <td className="py-1 text-right">{item.quantity}</td>
                                    <td className="py-1 text-right">{formatCurrency(item.unitPrice)}</td>
                                    <td className="py-1 text-right">{formatCurrency(item.amount)}</td>
                                  </tr>
                                ))}
                              </tbody>
                              <tfoot className="border-t border-gray-200">
                                <tr className="font-medium">
                                  <td colSpan={3} className="pt-2 text-right">Total:</td>
                                  <td className="pt-2 text-right">{formatCurrency(invoice.totalAmount)}</td>
                                </tr>
                              </tfoot>
                            </table>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
