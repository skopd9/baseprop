import React, { useState } from 'react';
import {
  XMarkIcon,
  CurrencyPoundIcon,
  BanknotesIcon,
  CreditCardIcon,
  BuildingLibraryIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { Invoice } from '../services/InvoiceService';
import { useCurrency } from '../hooks/useCurrency';

interface RecordPaymentModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSave: (paymentDetails: {
    amountPaid: number;
    paymentMethod: string;
    paymentReference: string;
    paymentNotes: string;
  }) => void;
}

const paymentMethods = [
  { id: 'bank_transfer', label: 'Bank Transfer', icon: BuildingLibraryIcon },
  { id: 'standing_order', label: 'Standing Order', icon: CreditCardIcon },
  { id: 'cash', label: 'Cash', icon: BanknotesIcon },
  { id: 'cheque', label: 'Cheque', icon: CurrencyPoundIcon },
  { id: 'card', label: 'Card Payment', icon: CreditCardIcon },
  { id: 'other', label: 'Other', icon: BanknotesIcon },
];

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  invoice,
  onClose,
  onSave,
}) => {
  const { formatCurrency } = useCurrency();
  const remainingAmount = invoice.totalAmount - invoice.amountPaid;
  
  const [amountPaid, setAmountPaid] = useState(remainingAmount.toString());
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const amount = parseFloat(amountPaid);
    if (isNaN(amount) || amount <= 0) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        amountPaid: amount,
        paymentMethod,
        paymentReference,
        paymentNotes,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFullPayment = parseFloat(amountPaid) >= remainingAmount;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CurrencyPoundIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Record Payment</h2>
              <p className="text-sm text-gray-500">Invoice {invoice.invoiceNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Invoice Summary */}
        <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-xs text-gray-500">Invoice Total</p>
              <p className="text-lg font-semibold text-gray-900">{formatCurrency(invoice.totalAmount)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Already Paid</p>
              <p className="text-lg font-semibold text-green-600">{formatCurrency(invoice.amountPaid)}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Remaining</p>
              <p className="text-lg font-semibold text-red-600">{formatCurrency(remainingAmount)}</p>
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Payment Amount
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <span className="text-gray-500">£</span>
              </div>
              <input
                type="number"
                step="0.01"
                min="0.01"
                max={remainingAmount}
                value={amountPaid}
                onChange={(e) => setAmountPaid(e.target.value)}
                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>
            <div className="flex items-center gap-2 mt-2">
              <button
                type="button"
                onClick={() => setAmountPaid(remainingAmount.toString())}
                className={`px-3 py-1 text-xs font-medium rounded-full ${
                  isFullPayment
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Full Payment ({formatCurrency(remainingAmount)})
              </button>
            </div>
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <div className="grid grid-cols-3 gap-2">
              {paymentMethods.map((method) => {
                const Icon = method.icon;
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => setPaymentMethod(method.id)}
                    className={`flex flex-col items-center p-3 rounded-lg border-2 transition-colors ${
                      paymentMethod === method.id
                        ? 'border-green-500 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${paymentMethod === method.id ? 'text-green-600' : 'text-gray-400'}`} />
                    <span className={`text-xs mt-1 ${paymentMethod === method.id ? 'text-green-700 font-medium' : 'text-gray-600'}`}>
                      {method.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Payment Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reference Number (Optional)
            </label>
            <input
              type="text"
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="e.g., Transaction ID, Cheque number"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes (Optional)
            </label>
            <textarea
              value={paymentNotes}
              onChange={(e) => setPaymentNotes(e.target.value)}
              placeholder="Any additional notes about this payment"
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>

          {/* Summary */}
          {isFullPayment && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
              <p className="text-sm text-green-700">
                This will mark the invoice as <strong>Fully Paid</strong>
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || parseFloat(amountPaid) <= 0}
              className="flex-1 px-4 py-2 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Recording...' : 'Record Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
