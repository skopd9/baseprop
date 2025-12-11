import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  EnvelopeIcon,
  CalendarIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyPoundIcon,
  PaperAirplaneIcon,
  PlusIcon,
  TrashIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  HomeIcon,
  UserIcon,
  EyeIcon,
  ArrowDownTrayIcon,
  PaperClipIcon,
} from '@heroicons/react/24/outline';
import { TenantWithInvoices, InvoiceRecipient } from './InvoiceManager';
import { Invoice, InvoiceSettings, InvoiceService } from '../services/InvoiceService';
import { useCurrency } from '../hooks/useCurrency';
import { supabase } from '../lib/supabase';
import { downloadInvoicePDF, generateInvoicePDFBase64 } from '../utils/generateInvoicePDF';
import { RegenerateInvoicesButton } from './RegenerateInvoicesButton';

interface TenantInvoicePanelProps {
  tenant: TenantWithInvoices;
  settings: InvoiceSettings | null;
  onClose: () => void;
  onApprove: (invoice: Invoice, e?: React.MouseEvent) => void;
  onDataChange: () => void;
  onSuccess?: (message: string) => void;
}

type TabType = 'overview' | 'details' | 'recipients' | 'schedule';

export const TenantInvoicePanel: React.FC<TenantInvoicePanelProps> = ({
  tenant,
  settings,
  onClose,
  onApprove,
  onDataChange,
  onSuccess,
}) => {
  const { formatCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [recipients, setRecipients] = useState<InvoiceRecipient[]>(tenant.recipients);
  const [newEmail, setNewEmail] = useState('');
  const [addingEmail, setAddingEmail] = useState(false);
  const [sendingInvoice, setSendingInvoice] = useState(false);
  const [scheduleFilter, setScheduleFilter] = useState<'all' | 'pending' | 'sent' | 'paid'>('all');
  const [attachPDF, setAttachPDF] = useState(true);

  // Animation state
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(true);
    return () => setIsVisible(false);
  }, []);

  // Update recipients when tenant changes (but preserve tab state)
  useEffect(() => {
    setRecipients(tenant.recipients);
  }, [tenant.recipients]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(onClose, 200);
  };

  const formatDate = (date: string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const formatMonth = (date: string | undefined) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('en-GB', { 
      month: 'short', 
      year: 'numeric' 
    });
  };

  // Email Recipients Management
  const handleAddEmail = async () => {
    if (!newEmail || !newEmail.includes('@')) {
      onSuccess?.('Please enter a valid email');
      return;
    }

    try {
      const { error } = await supabase
        .from('invoice_recipients')
        .insert({
          tenant_id: tenant.id,
          email: newEmail,
          is_primary: false,
          is_active: true,
        });

      if (error) {
        console.error('Error adding recipient:', error);
        onSuccess?.('Failed to add email');
        return;
      }

      setRecipients([...recipients, {
        id: `new-${Date.now()}`,
        email: newEmail,
        isPrimary: false,
      }]);
      setNewEmail('');
      setAddingEmail(false);
      onSuccess?.(`Added ${newEmail} as invoice recipient`);
      onDataChange();
    } catch (error) {
      console.error('Error adding email:', error);
    }
  };

  const handleRemoveEmail = async (recipientId: string) => {
    if (recipientId === 'tenant-email') {
      onSuccess?.('Cannot remove tenant\'s primary email');
      return;
    }

    try {
      const { error } = await supabase
        .from('invoice_recipients')
        .delete()
        .eq('id', recipientId);

      if (error) {
        console.error('Error removing recipient:', error);
        return;
      }

      setRecipients(recipients.filter(r => r.id !== recipientId));
      onSuccess?.('Email removed');
      onDataChange();
    } catch (error) {
      console.error('Error removing email:', error);
    }
  };

  // Invoice Actions
  const handleTogglePaid = async (invoice: Invoice) => {
    const success = await InvoiceService.togglePaidStatus(invoice.id);
    if (success) {
      onSuccess?.(invoice.status === 'paid' ? 'Invoice marked as unpaid' : 'Invoice marked as paid');
      onDataChange();
    }
  };

  const handleSendInvoice = async (invoice: Invoice) => {
    if (recipients.length === 0) {
      onSuccess?.('No email recipients configured');
      return;
    }

    setSendingInvoice(true);
    try {
      const emailList = recipients.map(r => r.email);
      
      // Generate PDF if attachment option is enabled
      let pdfBase64: string | undefined;
      if (attachPDF) {
        try {
          pdfBase64 = generateInvoicePDFBase64(invoice, settings);
        } catch (pdfError) {
          console.error('Error generating PDF:', pdfError);
          // Continue without PDF if generation fails
        }
      }
      
      // Call the send invoice email function
      const result = await InvoiceService.sendInvoiceEmail(
        invoice,
        emailList,
        settings,
        pdfBase64
      );

      if (result.success) {
        onSuccess?.(`Invoice sent to ${emailList.join(', ')}${attachPDF ? ' with PDF attached' : ''}`);
        onDataChange();
      } else {
        onSuccess?.(result.error || 'Failed to send invoice');
      }
    } catch (error) {
      console.error('Error sending invoice:', error);
      onSuccess?.('Failed to send invoice');
    } finally {
      setSendingInvoice(false);
    }
  };

  const handleDownloadPDF = (invoice: Invoice) => {
    try {
      downloadInvoicePDF(invoice, settings);
      onSuccess?.(`Invoice ${invoice.invoiceNumber} downloaded`);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      onSuccess?.('Failed to download invoice PDF');
    }
  };

  // Filter invoices for schedule tab
  const filteredInvoices = tenant.invoices.filter(inv => {
    if (scheduleFilter === 'pending') return inv.status === 'pending_approval' || inv.status === 'approved';
    if (scheduleFilter === 'sent') return inv.status === 'sent';
    if (scheduleFilter === 'paid') return inv.status === 'paid';
    return true;
  });

  const getInvoiceStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      pending_approval: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'Pending Approval' },
      approved: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Approved' },
      sent: { bg: 'bg-purple-100', text: 'text-purple-700', label: 'Sent' },
      paid: { bg: 'bg-green-100', text: 'text-green-700', label: 'Paid' },
      overdue: { bg: 'bg-red-100', text: 'text-red-700', label: 'Overdue' },
      cancelled: { bg: 'bg-gray-100', text: 'text-gray-500', label: 'Cancelled' },
    };
    const badge = badges[status] || badges.pending_approval;
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  // Calculate stats
  const totalPaid = tenant.invoices.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.totalAmount, 0);
  // Outstanding = only invoices that have been SENT but not fully paid
  const totalOutstanding = tenant.invoices
    .filter(i => i.status === 'sent' && i.amountPaid < i.totalAmount)
    .reduce((sum, i) => sum + (i.totalAmount - i.amountPaid), 0);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: EyeIcon },
    { id: 'details', label: 'Details', icon: UserIcon },
    { id: 'recipients', label: 'Recipients', icon: EnvelopeIcon },
    { id: 'schedule', label: 'Schedule', icon: CalendarIcon },
  ] as const;

  return (
    <>
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-black transition-opacity duration-200 z-40 ${
          isVisible ? 'bg-opacity-50' : 'bg-opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Panel */}
      <div 
        className={`fixed inset-y-0 right-0 w-full max-w-lg bg-white shadow-2xl z-50 transform transition-transform duration-200 ease-out ${
          isVisible ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-lg ${
                  tenant.overdueCount > 0 
                    ? 'bg-red-100 text-red-600'
                    : tenant.nextInvoice 
                      ? 'bg-amber-100 text-amber-600' 
                      : 'bg-blue-100 text-blue-600'
                }`}>
                  {tenant.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{tenant.name}</h2>
                  <p className="text-sm text-gray-500 flex items-center gap-1">
                    <HomeIcon className="w-4 h-4" />
                    {tenant.propertyAddress}
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Stats */}
            <div className="mt-4 grid grid-cols-3 gap-3">
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-500">Monthly Rent</p>
                <p className="text-lg font-semibold text-gray-900">{formatCurrency(tenant.monthlyRent)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-500">Total Paid</p>
                <p className="text-lg font-semibold text-green-600">{formatCurrency(totalPaid)}</p>
              </div>
              <div className="bg-white rounded-lg p-3 border border-gray-200">
                <p className="text-xs text-gray-500">Outstanding</p>
                <p className="text-lg font-semibold text-red-600">{formatCurrency(totalOutstanding)}</p>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6 py-2 border-b border-gray-200 flex gap-1 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                    activeTab === tab.id
                      ? 'bg-blue-100 text-blue-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Next Invoice Card */}
                {tenant.nextInvoice ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-amber-800 flex items-center gap-2">
                        <ClockIcon className="w-5 h-5" />
                        Next Invoice - Needs Approval
                      </h3>
                      {getInvoiceStatusBadge(tenant.nextInvoice.status)}
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Invoice Date</p>
                        <p className="font-medium text-gray-900">{formatDate(tenant.nextInvoice.invoiceDate)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Due Date</p>
                        <p className="font-medium text-gray-900">{formatDate(tenant.nextInvoice.dueDate)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Period</p>
                        <p className="font-medium text-gray-900">{formatMonth(tenant.nextInvoice.periodStart)}</p>
                      </div>
                      <div>
                        <p className="text-gray-500">Amount</p>
                        <p className="font-semibold text-gray-900">{formatCurrency(tenant.nextInvoice.totalAmount)}</p>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={() => onApprove(tenant.nextInvoice!)}
                        className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
                      >
                        <CheckCircleIcon className="w-4 h-4 mr-2" />
                        Approve Invoice
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <CheckCircleIcon className="w-8 h-8 text-green-600" />
                      <div>
                        <h3 className="font-semibold text-green-800">All Caught Up!</h3>
                        <p className="text-sm text-green-700">No pending invoices requiring approval.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Overdue Warning */}
                {tenant.overdueCount > 0 && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
                      <div>
                        <h3 className="font-semibold text-red-800">{tenant.overdueCount} Overdue Invoice{tenant.overdueCount > 1 ? 's' : ''}</h3>
                        <p className="text-sm text-red-700">Payment is past due. Consider sending a reminder.</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Invoice Summary */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3">Invoice Summary</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-gray-900">{tenant.invoices.length}</p>
                      <p className="text-xs text-gray-500">Total Invoices</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-2xl font-bold text-green-600">{tenant.paidCount}</p>
                      <p className="text-xs text-gray-500">Paid</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Details Tab */}
            {activeTab === 'details' && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-700">Tenant Information</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <UserIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm text-gray-900">{tenant.email || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Lease Period</p>
                      <p className="text-sm text-gray-900">
                        {formatDate(tenant.leaseStart)} - {formatDate(tenant.leaseEnd)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CurrencyPoundIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Monthly Rent</p>
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(tenant.monthlyRent)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <CalendarIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Rent Due Day</p>
                      <p className="text-sm text-gray-900">{tenant.rentDueDay}{getOrdinalSuffix(tenant.rentDueDay)} of each month</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <HomeIcon className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-xs text-gray-500">Property</p>
                      <p className="text-sm text-gray-900">{tenant.propertyAddress}</p>
                    </div>
                  </div>
                </div>

                {/* Invoice Management */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-700 mb-2">Invoice Management</h3>
                  <p className="text-xs text-gray-600 mb-3">
                    If your invoice dates need updating (e.g., after changing the "invoice date days before rent" setting), 
                    you can regenerate all invoices with the correct dates.
                  </p>
                  <RegenerateInvoicesButton
                    tenant={tenant}
                    onSuccess={onSuccess || (() => {})}
                    onComplete={() => {
                      onDataChange();
                      handleClose();
                    }}
                  />
                </div>
              </div>
            )}

            {/* Recipients Tab */}
            {activeTab === 'recipients' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-700">Invoice Recipients</h3>
                  <button
                    onClick={() => setAddingEmail(!addingEmail)}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Add Email
                  </button>
                </div>

                {/* Add Email Form */}
                {addingEmail && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <p className="text-sm text-blue-800 mb-2">Add a new email recipient:</p>
                    <div className="flex gap-2">
                      <input
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddEmail()}
                      />
                      <button
                        onClick={handleAddEmail}
                        className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700"
                      >
                        Add
                      </button>
                      <button
                        onClick={() => { setAddingEmail(false); setNewEmail(''); }}
                        className="px-4 py-2 bg-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-300"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}

                {/* Recipients List */}
                <div className="space-y-2">
                  {recipients.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <EnvelopeIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No email recipients configured</p>
                      <p className="text-sm mt-1">Add an email to send invoices</p>
                    </div>
                  ) : (
                    recipients.map((recipient) => (
                      <div
                        key={recipient.id}
                        className={`flex items-center justify-between p-3 rounded-lg border ${
                          recipient.isPrimary 
                            ? 'bg-blue-50 border-blue-200' 
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-full ${
                            recipient.isPrimary ? 'bg-blue-100' : 'bg-gray-200'
                          }`}>
                            <EnvelopeIcon className={`w-4 h-4 ${
                              recipient.isPrimary ? 'text-blue-600' : 'text-gray-500'
                            }`} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{recipient.email}</p>
                            {recipient.isPrimary && (
                              <p className="text-xs text-blue-600">Primary recipient</p>
                            )}
                          </div>
                        </div>
                        {!recipient.isPrimary && recipient.id !== 'tenant-email' && (
                          <button
                            onClick={() => handleRemoveEmail(recipient.id)}
                            className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>

                <p className="text-xs text-gray-500 mt-4">
                  Invoices will be sent to all recipients listed above. The primary recipient is the tenant's main email address.
                </p>
              </div>
            )}

            {/* Schedule Tab */}
            {activeTab === 'schedule' && (
              <div className="space-y-4">
                {/* Filter */}
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Filter:</span>
                  {(['all', 'pending', 'sent', 'paid'] as const).map((filter) => (
                    <button
                      key={filter}
                      onClick={() => setScheduleFilter(filter)}
                      className={`px-3 py-1 rounded-full text-xs font-medium capitalize ${
                        scheduleFilter === filter
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {filter}
                    </button>
                  ))}
                </div>

                {/* Invoice Table */}
                <div className="overflow-x-auto">
                  {filteredInvoices.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <DocumentTextIcon className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <p>No invoices found</p>
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Period</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice Date</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Due Date</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Last Sent</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {filteredInvoices.map((invoice) => (
                          <tr
                            key={invoice.id}
                            className={`${
                              invoice.status === 'paid'
                                ? 'bg-green-50'
                                : invoice.status === 'pending_approval' && tenant.nextInvoice?.id === invoice.id
                                  ? 'bg-amber-50'
                                  : ''
                            }`}
                          >
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900">{formatMonth(invoice.periodStart)}</span>
                                {tenant.nextInvoice?.id === invoice.id && (
                                  <span className="px-1.5 py-0.5 bg-amber-500 text-white text-xs font-bold rounded">
                                    NEXT
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-gray-600">
                              {formatDate(invoice.invoiceDate)}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-gray-600">
                              {formatDate(invoice.dueDate)}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap font-semibold text-gray-900">
                              {formatCurrency(invoice.totalAmount)}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              {getInvoiceStatusBadge(invoice.status)}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              {invoice.sentAt ? (
                                <div>
                                  <p className="text-gray-900 font-medium">{formatDate(invoice.sentAt)}</p>
                                  {invoice.sentTo && invoice.sentTo.length > 0 && (
                                    <p className="text-xs text-gray-500 truncate max-w-[150px]">
                                      {invoice.sentTo.join(', ')}
                                    </p>
                                  )}
                                </div>
                              ) : (
                                <span className="text-gray-400">-</span>
                              )}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleDownloadPDF(invoice)}
                                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                                  title="Download PDF"
                                >
                                  <ArrowDownTrayIcon className="w-4 h-4" />
                                </button>
                                {invoice.status === 'pending_approval' && (
                                  <button
                                    onClick={() => onApprove(invoice)}
                                    className="px-2 py-1 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700"
                                  >
                                    Approve
                                  </button>
                                )}
                                {(invoice.status === 'approved' || invoice.status === 'sent') && (
                                  <>
                                    <button
                                      onClick={() => setAttachPDF(!attachPDF)}
                                      className={`p-1.5 rounded ${
                                        attachPDF 
                                          ? 'bg-purple-100 text-purple-600' 
                                          : 'text-gray-400 hover:text-gray-600 hover:bg-gray-50'
                                      }`}
                                      title={attachPDF ? 'PDF attachment enabled' : 'PDF attachment disabled'}
                                    >
                                      <PaperClipIcon className="w-4 h-4" />
                                    </button>
                                    <button
                                      onClick={() => handleSendInvoice(invoice)}
                                      disabled={sendingInvoice || recipients.length === 0}
                                      className="px-2 py-1 bg-purple-600 text-white text-xs font-medium rounded hover:bg-purple-700 disabled:opacity-50"
                                    >
                                      {sendingInvoice ? '...' : 'Send'}
                                    </button>
                                    <button
                                      onClick={() => handleTogglePaid(invoice)}
                                      className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700"
                                    >
                                      Paid
                                    </button>
                                  </>
                                )}
                                {invoice.status === 'paid' && (
                                  <button
                                    onClick={() => handleTogglePaid(invoice)}
                                    className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-300"
                                  >
                                    Unpaid
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </>
  );
};

// Helper function for ordinal suffix
function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}
