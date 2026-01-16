import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  Cog6ToothIcon,
  BuildingOffice2Icon,
  EnvelopeIcon,
  PhoneIcon,
  DocumentTextIcon,
  BellIcon,
} from '@heroicons/react/24/outline';
import { useOrganization } from '../contexts/OrganizationContext';
import { InvoiceService, InvoiceSettings } from '../services/InvoiceService';

interface InvoiceTemplateSettingsProps {
  onClose: () => void;
  onSave: () => void;
}

export const InvoiceTemplateSettings: React.FC<InvoiceTemplateSettingsProps> = ({
  onClose,
  onSave,
}) => {
  const { currentOrganization } = useOrganization();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'company' | 'template' | 'automation'>('company');
  
  const [settings, setSettings] = useState<Partial<InvoiceSettings>>({
    companyName: '',
    companyAddress: '',
    companyEmail: '',
    companyPhone: '',
    invoicePrefix: 'INV',
    paymentTerms: 'Payment due within 14 days',
    paymentInstructions: '',
    footerNotes: '',
    autoSendEnabled: false,
    daysBeforeDue: 7,
    invoiceDateDaysBeforeRent: 7,
    sendReminderEnabled: false,
    reminderDaysAfter: 7,
  });

  useEffect(() => {
    loadSettings();
  }, [currentOrganization]);

  const loadSettings = async () => {
    if (!currentOrganization) return;
    
    setLoading(true);
    try {
      const data = await InvoiceService.getInvoiceSettings(currentOrganization.id);
      if (data) {
        setSettings(data);
      } else {
        // Use organization name as default company name
        setSettings(prev => ({
          ...prev,
          companyName: currentOrganization.name,
        }));
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!currentOrganization) return;
    
    setSaving(true);
    try {
      await InvoiceService.saveInvoiceSettings(currentOrganization.id, settings);
      onSave();
    } catch (error) {
      console.error('Error saving settings:', error);
    } finally {
      setSaving(false);
    }
  };

  const tabs = [
    { id: 'company', label: 'Company Details', icon: BuildingOffice2Icon },
    { id: 'template', label: 'Invoice Template', icon: DocumentTextIcon },
    { id: 'automation', label: 'Automation', icon: BellIcon },
  ] as const;

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-xl p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-500 mt-4">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Cog6ToothIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Invoice Settings</h2>
              <p className="text-sm text-gray-500">Configure your invoice template and automation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 py-3 border-b border-gray-200 flex gap-1">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
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
          {/* Company Details Tab */}
          {activeTab === 'company' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Name
                </label>
                <input
                  type="text"
                  value={settings.companyName || ''}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  placeholder="Your Company Ltd"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">This will appear at the top of your invoices</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Company Address
                </label>
                <textarea
                  value={settings.companyAddress || ''}
                  onChange={(e) => setSettings({ ...settings, companyAddress: e.target.value })}
                  placeholder="123 Business Street&#10;London, SW1A 1AA"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <EnvelopeIcon className="w-4 h-4 inline mr-1" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={settings.companyEmail || ''}
                    onChange={(e) => setSettings({ ...settings, companyEmail: e.target.value })}
                    placeholder="accounts@company.com"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <PhoneIcon className="w-4 h-4 inline mr-1" />
                    Phone
                  </label>
                  <input
                    type="tel"
                    value={settings.companyPhone || ''}
                    onChange={(e) => setSettings({ ...settings, companyPhone: e.target.value })}
                    placeholder="+44 20 1234 5678"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Invoice Template Tab */}
          {activeTab === 'template' && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Number Prefix
                </label>
                <input
                  type="text"
                  value={settings.invoicePrefix || 'INV'}
                  onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value.toUpperCase() })}
                  placeholder="INV"
                  maxLength={10}
                  className="w-48 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Example: {settings.invoicePrefix || 'INV'}-202412-001
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Terms
                </label>
                <input
                  type="text"
                  value={settings.paymentTerms || ''}
                  onChange={(e) => setSettings({ ...settings, paymentTerms: e.target.value })}
                  placeholder="Payment due within 14 days"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Payment Instructions
                </label>
                <textarea
                  value={settings.paymentInstructions || ''}
                  onChange={(e) => setSettings({ ...settings, paymentInstructions: e.target.value })}
                  placeholder="Bank: Example Bank&#10;Account Name: Your Company Ltd&#10;Sort Code: 12-34-56&#10;Account No: 12345678"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">Include bank details or payment link</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Footer Notes
                </label>
                <textarea
                  value={settings.footerNotes || ''}
                  onChange={(e) => setSettings({ ...settings, footerNotes: e.target.value })}
                  placeholder="Thank you for your payment. Please contact us if you have any questions."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          )}

          {/* Automation Tab */}
          {activeTab === 'automation' && (
            <div className="space-y-6">
              {/* Invoice Date Setting - Applies to ALL invoices */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
                  <DocumentTextIcon className="w-5 h-5 text-purple-600" />
                  Invoice Date Configuration
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  Set how many days before the rent period to date your invoices (applies to all invoices)
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Days before rent period
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      value={settings.invoiceDateDaysBeforeRent ?? 7}
                      onChange={(e) => setSettings({ ...settings, invoiceDateDaysBeforeRent: parseInt(e.target.value) || 0 })}
                      className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Invoice will be dated {settings.invoiceDateDaysBeforeRent ?? 7} days before the rent period starts
                    </p>
                  </div>
                  <div className="flex-1 bg-white rounded-lg p-3 border border-gray-200">
                    <p className="text-xs text-gray-600 mb-1">Example:</p>
                    <p className="text-xs text-gray-900">
                      For January 2026 rent, invoice dated:{' '}
                      <span className="font-semibold">
                        {new Date(2026, 0, 1 - (settings.invoiceDateDaysBeforeRent ?? 7)).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> Automated email sending requires email integration to be set up. 
                  These settings control when invoices should be generated and reminders sent.
                </p>
              </div>

              <div className="space-y-4">
                <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Auto-generate Invoices</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Automatically create invoices before the rent due date
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.autoSendEnabled || false}
                      onChange={(e) => setSettings({ ...settings, autoSendEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {settings.autoSendEnabled && (
                  <div className="ml-4 pl-4 border-l-2 border-blue-200">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Days before due date to generate invoice
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={settings.daysBeforeDue || 7}
                      onChange={(e) => setSettings({ ...settings, daysBeforeDue: parseInt(e.target.value) || 7 })}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Invoice will be created {settings.daysBeforeDue || 7} days before rent is due
                    </p>
                  </div>
                )}

                <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="font-medium text-gray-900">Payment Reminders</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Send reminder emails for overdue invoices
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.sendReminderEnabled || false}
                      onChange={(e) => setSettings({ ...settings, sendReminderEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                {settings.sendReminderEnabled && (
                  <div className="ml-4 pl-4 border-l-2 border-blue-200">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Days after due date to send reminder
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={settings.reminderDaysAfter || 7}
                      onChange={(e) => setSettings({ ...settings, reminderDaysAfter: parseInt(e.target.value) || 7 })}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Reminder will be sent {settings.reminderDaysAfter || 7} days after the due date
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};
