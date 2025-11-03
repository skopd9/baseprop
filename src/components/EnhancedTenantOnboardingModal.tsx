import React, { useState } from 'react';
import { XMarkIcon, UserIcon, CheckCircleIcon, ClockIcon, DocumentTextIcon, ShieldCheckIcon, HomeIcon, ArrowUpTrayIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { SimplifiedTenant, SimplifiedProperty } from '../utils/simplifiedDataTransforms';
import { CreditCheck } from '../types/creditCheck';
import { CreditCheckService } from '../services/CreditCheckService';
import { DocuSignService } from '../services/DocuSignService';
import { DocuSignEnvelope } from '../types/docusign';

interface EnhancedTenantOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: SimplifiedTenant;
  property: SimplifiedProperty;
  onComplete: (tenant: SimplifiedTenant) => void;
}

interface LeaseInfo {
  startDate: string;
  endDate: string;
  monthlyRent: number;
  depositWeeks: number;
  rentDueDate: number;
}

interface TenancyAgreement {
  method: 'generate' | 'upload';
  status: 'not_started' | 'generating' | 'ready_for_signing' | 'signed' | 'uploaded';
  generatedDate?: Date;
  signedDate?: Date;
  uploadedFile?: File;
  uploadedFileName?: string;
  docusignEnvelope?: DocuSignEnvelope;
  questions: {
    petsAllowed: boolean;
    smokingAllowed: boolean;
    sublettingAllowed: boolean;
    decoratingAllowed: boolean;
    breakClause: boolean;
    breakClauseMonths?: number;
  };
}

interface PreparationService {
  type: 'diy' | 'concierge';
  checklist: {
    id: string;
    task: string;
    completed: boolean;
    required: boolean;
  }[];
  conciergeOrdered: boolean;
  conciergeOrderedDate?: Date;
}

const ONBOARDING_STEPS = [
  { id: 'lease', title: 'Lease Information', icon: DocumentTextIcon },
  { id: 'credit', title: 'Credit Checks', icon: ShieldCheckIcon },
  { id: 'agreement', title: 'Tenancy Agreement', icon: DocumentTextIcon },
  { id: 'preparation', title: 'Tenancy Preparation', icon: HomeIcon },
];

const DEFAULT_CHECKLIST = [
  { id: 'inventory', task: 'Complete property inventory', completed: false, required: true },
  { id: 'keys', task: 'Cut additional keys if needed', completed: false, required: true },
  { id: 'utilities', task: 'Set up utility accounts', completed: false, required: true },
  { id: 'insurance', task: 'Update landlord insurance', completed: false, required: true },
  { id: 'deposit', task: 'Protect deposit in scheme', completed: false, required: true },
  { id: 'safety', task: 'Check smoke/CO alarms', completed: false, required: true },
  { id: 'cleaning', task: 'Professional cleaning if needed', completed: false, required: false },
  { id: 'maintenance', task: 'Complete any outstanding repairs', completed: false, required: false },
];

export const EnhancedTenantOnboardingModal: React.FC<EnhancedTenantOnboardingModalProps> = ({
  isOpen,
  onClose,
  tenant,
  property,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedProvider, setSelectedProvider] = useState(CreditCheckService.getDefaultProvider().id);
  
  const [leaseInfo, setLeaseInfo] = useState<LeaseInfo>({
    startDate: tenant.leaseStart ? tenant.leaseStart.toISOString().split('T')[0] : '',
    endDate: tenant.leaseEnd ? tenant.leaseEnd.toISOString().split('T')[0] : '',
    monthlyRent: tenant.monthlyRent || Math.round(property.targetRent / (property.propertyType === 'hmo' ? property.bedrooms : 1)),
    depositWeeks: 4,
    rentDueDate: 1,
  });

  const [creditChecks, setCreditChecks] = useState<CreditCheck[]>([
    {
      id: '1',
      type: 'tenant',
      name: tenant.name,
      email: tenant.email,
      status: 'pending',
      cost: CreditCheckService.getDefaultProvider().cost,
    }
  ]);

  const [tenancyAgreement, setTenancyAgreement] = useState<TenancyAgreement>({
    method: 'generate',
    status: 'not_started',
    questions: {
      petsAllowed: false,
      smokingAllowed: false,
      sublettingAllowed: false,
      decoratingAllowed: false,
      breakClause: false,
      breakClauseMonths: 6,
    }
  });

  const [preparationService, setPreparationService] = useState<PreparationService>({
    type: 'diy',
    checklist: DEFAULT_CHECKLIST,
    conciergeOrdered: false,
  });

  const calculateDepositAmount = (monthlyRent: number, weeks: number) => {
    return Math.round((monthlyRent * 12) / 52 * weeks);
  };

  const addGuarantor = () => {
    const provider = CreditCheckService.getProvider(selectedProvider);
    const newGuarantor: CreditCheck = {
      id: Date.now().toString(),
      type: 'guarantor',
      name: '',
      email: '',
      status: 'pending',
      cost: provider?.cost || 30,
    };
    setCreditChecks(prev => [...prev, newGuarantor]);
  };

  const updateCreditCheck = (id: string, updates: Partial<CreditCheck>) => {
    setCreditChecks(prev => prev.map(check => 
      check.id === id ? { ...check, ...updates } : check
    ));
  };

  const removeCreditCheck = (id: string) => {
    setCreditChecks(prev => prev.filter(check => check.id !== id));
  };

  const orderCreditCheck = async (id: string) => {
    const check = creditChecks.find(c => c.id === id);
    if (!check) return;

    const orderedCheck = await CreditCheckService.orderCreditCheck(check, selectedProvider);
    updateCreditCheck(id, orderedCheck);

    // Auto-complete after 3 seconds for demo
    setTimeout(() => {
      const completedCheck = CreditCheckService.simulateCompletion(orderedCheck);
      updateCreditCheck(id, completedCheck);
    }, 3000);
  };

  const markCheckComplete = (id: string) => {
    const check = creditChecks.find(c => c.id === id);
    if (!check) return;
    
    const completed = CreditCheckService.markAsCompleted(check);
    updateCreditCheck(id, completed);
  };

  const markCheckFailed = (id: string) => {
    const check = creditChecks.find(c => c.id === id);
    if (!check) return;
    
    const failed = CreditCheckService.markAsFailed(check, 'Manual failure');
    updateCreditCheck(id, failed);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setTenancyAgreement(prev => ({
        ...prev,
        status: 'uploaded',
        uploadedFile: file,
        uploadedFileName: file.name
      }));
    }
  };

  const generateTenancyAgreement = async () => {
    setTenancyAgreement(prev => ({
      ...prev,
      status: 'generating'
    }));

    setTimeout(() => {
      setTenancyAgreement(prev => ({
        ...prev,
        status: 'ready_for_signing',
        generatedDate: new Date()
      }));
    }, 2000);
  };

  const sendForDocuSignSignature = async () => {
    try {
      const envelope = await DocuSignService.createEnvelope({
        documentName: 'Tenancy Agreement',
        documentContent: 'base64_encoded_pdf_content_here',
        signers: [
          { name: tenant.name, email: tenant.email, routingOrder: 1 },
          { name: 'Landlord', email: 'landlord@example.com', routingOrder: 2 }
        ],
        emailSubject: `Tenancy Agreement for ${property.address}`,
        emailBlurb: 'Please review and sign the tenancy agreement.'
      });

      setTenancyAgreement(prev => ({
        ...prev,
        docusignEnvelope: envelope
      }));

      // Simulate signature completion after 5 seconds
      setTimeout(() => {
        const signedEnvelope = DocuSignService.simulateSignature(envelope);
        setTenancyAgreement(prev => ({
          ...prev,
          status: 'signed',
          signedDate: new Date(),
          docusignEnvelope: signedEnvelope
        }));
      }, 5000);
    } catch (error) {
      console.error('Error sending for signature:', error);
    }
  };

  const orderConciergeService = () => {
    setPreparationService(prev => ({
      ...prev,
      type: 'concierge',
      conciergeOrdered: true,
      conciergeOrderedDate: new Date()
    }));
  };

  const toggleChecklistItem = (id: string) => {
    setPreparationService(prev => ({
      ...prev,
      checklist: prev.checklist.map(item =>
        item.id === id ? { ...item, completed: !item.completed } : item
      )
    }));
  };

  const getStepStatus = (stepIndex: number) => {
    switch (stepIndex) {
      case 0: // Lease Info
        return leaseInfo.startDate && leaseInfo.endDate && leaseInfo.monthlyRent > 0 ? 'completed' : 'pending';
      case 1: // Credit Checks
        const allChecksComplete = creditChecks.every(check => 
          check.status === 'completed' || check.status === 'failed'
        );
        const someChecksOrdered = creditChecks.some(check => check.status === 'ordered');
        return allChecksComplete ? 'completed' : someChecksOrdered ? 'in_progress' : 'pending';
      case 2: // Tenancy Agreement
        return tenancyAgreement.status === 'signed' || tenancyAgreement.status === 'uploaded' ? 'completed' : 
               tenancyAgreement.status === 'ready_for_signing' ? 'in_progress' : 'pending';
      case 3: // Preparation
        if (preparationService.type === 'concierge') {
          return preparationService.conciergeOrdered ? 'completed' : 'pending';
        } else {
          const requiredTasks = preparationService.checklist.filter(item => item.required);
          return requiredTasks.every(item => item.completed) ? 'completed' : 'pending';
        }
      default:
        return 'pending';
    }
  };

  const getTotalCost = () => {
    const creditCheckCost = creditChecks.reduce((total, check) => total + check.cost, 0);
    const conciergeCost = preparationService.type === 'concierge' ? 75 : 0;
    return creditCheckCost + conciergeCost;
  };

  const canProceedToNext = () => {
    const status = getStepStatus(currentStep);
    return status === 'completed' || status === 'in_progress';
  };

  const handleComplete = () => {
    const updatedTenant: SimplifiedTenant = {
      ...tenant,
      leaseStart: new Date(leaseInfo.startDate),
      leaseEnd: new Date(leaseInfo.endDate),
      monthlyRent: leaseInfo.monthlyRent,
      depositAmount: calculateDepositAmount(leaseInfo.monthlyRent, leaseInfo.depositWeeks),
      rentStatus: 'current',
      onboardingStatus: 'completed',
      onboardingProgress: 100,
    };
    
    onComplete(updatedTenant);
    onClose();
  };

  if (!isOpen) return null;

  const completedSteps = ONBOARDING_STEPS.filter((_, index) => getStepStatus(index) === 'completed').length;
  const progress = Math.round((completedSteps / ONBOARDING_STEPS.length) * 100);
  const providers = CreditCheckService.getProviders();
  const hasFailedChecks = creditChecks.some(check => check.status === 'failed');

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-4 mx-auto p-6 border w-full max-w-4xl shadow-lg rounded-lg bg-white mb-8">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Tenant Onboarding</h3>
              <p className="text-sm text-gray-500">{tenant.name} - {property.address}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Progress: {progress}%</span>
            <span>{completedSteps} of {ONBOARDING_STEPS.length} steps completed</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className={`h-2 rounded-full transition-all duration-300 ${
                progress === 100 ? 'bg-green-600' : 'bg-blue-600'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Step Navigation */}
        <div className="flex items-center justify-between mb-6 bg-gray-50 rounded-lg p-4">
          {ONBOARDING_STEPS.map((step, index) => {
            const status = getStepStatus(index);
            const Icon = step.icon;
            return (
              <button
                key={step.id}
                onClick={() => setCurrentStep(index)}
                className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  currentStep === index
                    ? 'bg-blue-100 text-blue-700'
                    : status === 'completed'
                    ? 'bg-green-100 text-green-700 hover:bg-green-200'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{step.title}</span>
                {status === 'completed' && (
                  <CheckCircleIcon className="w-4 h-4 text-green-600" />
                )}
                {status === 'in_progress' && (
                  <ClockIcon className="w-4 h-4 text-yellow-600" />
                )}
              </button>
            );
          })}
        </div>

        {/* Step Content */}
        <div className="min-h-96">
          {/* Step 1: Lease Information */}
          {currentStep === 0 && (
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-gray-900">Lease Information</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lease Start Date *
                  </label>
                  <input
                    type="date"
                    value={leaseInfo.startDate}
                    onChange={(e) => setLeaseInfo(prev => ({ ...prev, startDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Lease End Date *
                  </label>
                  <input
                    type="date"
                    value={leaseInfo.endDate}
                    onChange={(e) => setLeaseInfo(prev => ({ ...prev, endDate: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Monthly Rent (£) *
                  </label>
                  <input
                    type="number"
                    value={leaseInfo.monthlyRent}
                    onChange={(e) => setLeaseInfo(prev => ({ ...prev, monthlyRent: parseFloat(e.target.value) || 0 }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Deposit (weeks) *
                  </label>
                  <select
                    value={leaseInfo.depositWeeks}
                    onChange={(e) => setLeaseInfo(prev => ({ ...prev, depositWeeks: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value={1}>1 week</option>
                    <option value={2}>2 weeks</option>
                    <option value={3}>3 weeks</option>
                    <option value={4}>4 weeks</option>
                    <option value={5}>5 weeks</option>
                  </select>
                  <p className="text-xs text-gray-500 mt-1">
                    Amount: £{calculateDepositAmount(leaseInfo.monthlyRent, leaseInfo.depositWeeks)} ({leaseInfo.depositWeeks} weeks)
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rent Due Date
                  </label>
                  <select
                    value={leaseInfo.rentDueDate}
                    onChange={(e) => setLeaseInfo(prev => ({ ...prev, rentDueDate: parseInt(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map(day => (
                      <option key={day} value={day}>{day}{day === 1 ? 'st' : day === 2 ? 'nd' : day === 3 ? 'rd' : 'th'} of each month</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Credit Checks */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h4 className="text-lg font-medium text-gray-900">Credit Reference Checks</h4>
                <div className="text-sm text-gray-600">
                  Total cost: £{creditChecks.reduce((total, check) => total + check.cost, 0)}
                </div>
              </div>

              {/* Provider Selection */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Credit Check Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => {
                    setSelectedProvider(e.target.value);
                    const provider = CreditCheckService.getProvider(e.target.value);
                    if (provider) {
                      setCreditChecks(prev => prev.map(check => ({
                        ...check,
                        cost: provider.cost
                      })));
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {providers.map(provider => (
                    <option key={provider.id} value={provider.id}>
                      {provider.name} - £{provider.cost} ({provider.turnaroundTime})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-600 mt-2">
                  {CreditCheckService.getProvider(selectedProvider)?.description}
                </p>
              </div>

              {hasFailedChecks && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-start space-x-2">
                  <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-700">
                    Some credit checks have failed. You can still proceed, but consider reviewing the tenant's application carefully.
                  </div>
                </div>
              )}

              <div className="space-y-4">
                {creditChecks.map((check) => (
                  <div key={check.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-2">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          check.type === 'tenant' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        }`}>
                          {check.type === 'tenant' ? 'Tenant' : 'Guarantor'}
                        </span>
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          check.status === 'completed' ? 'bg-green-100 text-green-700' :
                          check.status === 'ordered' ? 'bg-yellow-100 text-yellow-700' :
                          check.status === 'failed' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {check.status.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium">£{check.cost}</span>
                        {check.type === 'guarantor' && check.status === 'pending' && (
                          <button
                            onClick={() => removeCreditCheck(check.id)}
                            className="text-red-600 hover:text-red-800 text-sm"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Full Name
                        </label>
                        <input
                          type="text"
                          value={check.name}
                          onChange={(e) => updateCreditCheck(check.id, { name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={check.status !== 'pending'}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Email Address
                        </label>
                        <input
                          type="email"
                          value={check.email}
                          onChange={(e) => updateCreditCheck(check.id, { email: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          disabled={check.status !== 'pending'}
                        />
                      </div>
                    </div>

                    {check.status === 'pending' && check.name && check.email && (
                      <button
                        onClick={() => orderCreditCheck(check.id)}
                        className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        Order Credit Check - £{check.cost}
                      </button>
                    )}

                    {check.status === 'ordered' && (
                      <div className="space-y-2">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                          <p className="text-sm text-yellow-700">
                            Credit check ordered on {check.orderedDate?.toLocaleDateString()}. 
                            Results will be available shortly (auto-completing in 3 seconds for demo).
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => markCheckComplete(check.id)}
                            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 transition-colors text-sm"
                          >
                            Mark as Complete
                          </button>
                          <button
                            onClick={() => markCheckFailed(check.id)}
                            className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors text-sm"
                          >
                            Mark as Failed
                          </button>
                        </div>
                      </div>
                    )}

                    {check.status === 'completed' && (
                      <div className="bg-green-50 border border-green-200 rounded-md p-3">
                        <div className="flex items-center space-x-2">
                          <CheckCircleIcon className="w-5 h-5 text-green-600" />
                          <span className="text-green-700 font-medium">
                            Credit check completed successfully!
                          </span>
                        </div>
                        <p className="text-green-600 text-sm mt-1">
                          Completed on {check.completedDate?.toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {check.status === 'failed' && (
                      <div className="bg-red-50 border border-red-200 rounded-md p-3">
                        <div className="flex items-center space-x-2">
                          <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                          <span className="text-red-700 font-medium">
                            Credit check failed
                          </span>
                        </div>
                        <p className="text-red-600 text-sm mt-1">
                          Failed on {check.completedDate?.toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                <button
                  onClick={addGuarantor}
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                >
                  + Add Guarantor (£{CreditCheckService.getProvider(selectedProvider)?.cost || 30})
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Tenancy Agreement */}
          {currentStep === 2 && (
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-gray-900">Tenancy Agreement</h4>

              {tenancyAgreement.status === 'not_started' && (
                <div className="space-y-6">
                  {/* Method Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div 
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                        tenancyAgreement.method === 'generate' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setTenancyAgreement(prev => ({ ...prev, method: 'generate' }))}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <input
                          type="radio"
                          checked={tenancyAgreement.method === 'generate'}
                          onChange={() => setTenancyAgreement(prev => ({ ...prev, method: 'generate' }))}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium text-gray-900">Generate Agreement</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Create a customized tenancy agreement in-app using our template
                      </p>
                    </div>

                    <div 
                      className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                        tenancyAgreement.method === 'upload' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setTenancyAgreement(prev => ({ ...prev, method: 'upload' }))}
                    >
                      <div className="flex items-center space-x-2 mb-2">
                        <input
                          type="radio"
                          checked={tenancyAgreement.method === 'upload'}
                          onChange={() => setTenancyAgreement(prev => ({ ...prev, method: 'upload' }))}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <span className="font-medium text-gray-900">Upload Agent Contract</span>
                      </div>
                      <p className="text-sm text-gray-600">
                        Upload a contract created by your agent or solicitor
                      </p>
                    </div>
                  </div>

                  {/* Generate Agreement Flow */}
                  {tenancyAgreement.method === 'generate' && (
                    <div className="space-y-4">
                      <p className="text-gray-600">
                        Answer a few questions to generate a customized AST (Assured Shorthold Tenancy) agreement.
                      </p>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-white">
                      <span className="text-sm font-medium text-gray-700">Pets allowed?</span>
                      <input
                        type="checkbox"
                        checked={tenancyAgreement.questions.petsAllowed}
                        onChange={(e) => setTenancyAgreement(prev => ({
                          ...prev,
                          questions: { ...prev.questions, petsAllowed: e.target.checked }
                        }))}
                        className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 checked:bg-blue-600 checked:border-blue-600"
                        style={{ backgroundColor: tenancyAgreement.questions.petsAllowed ? '' : 'white' }}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-white">
                      <span className="text-sm font-medium text-gray-700">Smoking allowed?</span>
                      <input
                        type="checkbox"
                        checked={tenancyAgreement.questions.smokingAllowed}
                        onChange={(e) => setTenancyAgreement(prev => ({
                          ...prev,
                          questions: { ...prev.questions, smokingAllowed: e.target.checked }
                        }))}
                        className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 checked:bg-blue-600 checked:border-blue-600"
                        style={{ backgroundColor: tenancyAgreement.questions.smokingAllowed ? '' : 'white' }}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-white">
                      <span className="text-sm font-medium text-gray-700">Subletting allowed?</span>
                      <input
                        type="checkbox"
                        checked={tenancyAgreement.questions.sublettingAllowed}
                        onChange={(e) => setTenancyAgreement(prev => ({
                          ...prev,
                          questions: { ...prev.questions, sublettingAllowed: e.target.checked }
                        }))}
                        className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 checked:bg-blue-600 checked:border-blue-600"
                        style={{ backgroundColor: tenancyAgreement.questions.sublettingAllowed ? '' : 'white' }}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-white">
                      <span className="text-sm font-medium text-gray-700">Decorating allowed?</span>
                      <input
                        type="checkbox"
                        checked={tenancyAgreement.questions.decoratingAllowed}
                        onChange={(e) => setTenancyAgreement(prev => ({
                          ...prev,
                          questions: { ...prev.questions, decoratingAllowed: e.target.checked }
                        }))}
                        className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 checked:bg-blue-600 checked:border-blue-600"
                        style={{ backgroundColor: tenancyAgreement.questions.decoratingAllowed ? '' : 'white' }}
                      />
                    </div>

                    <div className="flex items-center justify-between p-3 border border-gray-200 rounded-md bg-white">
                      <span className="text-sm font-medium text-gray-700">Include break clause?</span>
                      <input
                        type="checkbox"
                        checked={tenancyAgreement.questions.breakClause}
                        onChange={(e) => setTenancyAgreement(prev => ({
                          ...prev,
                          questions: { ...prev.questions, breakClause: e.target.checked }
                        }))}
                        className="w-5 h-5 rounded border-2 border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 checked:bg-blue-600 checked:border-blue-600"
                        style={{ backgroundColor: tenancyAgreement.questions.breakClause ? '' : 'white' }}
                      />
                    </div>
                      </div>

                      {tenancyAgreement.questions.breakClause && (
                        <div className="mt-4">
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Break clause after (months)
                          </label>
                          <select
                            value={tenancyAgreement.questions.breakClauseMonths || 6}
                            onChange={(e) => setTenancyAgreement(prev => ({
                              ...prev,
                              questions: { ...prev.questions, breakClauseMonths: parseInt(e.target.value) }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          >
                            <option value={3}>3 months</option>
                            <option value={6}>6 months</option>
                            <option value={9}>9 months</option>
                            <option value={12}>12 months</option>
                          </select>
                        </div>
                      )}

                      <button
                        onClick={generateTenancyAgreement}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
                      >
                        Generate AST Agreement
                      </button>
                    </div>
                  )}

                  {/* Upload Agreement Flow */}
                  {tenancyAgreement.method === 'upload' && (
                    <div className="space-y-4">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                        <ArrowUpTrayIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <label className="cursor-pointer">
                          <span className="text-blue-600 hover:text-blue-800 font-medium">
                            Click to upload
                          </span>
                          <span className="text-gray-600"> or drag and drop</span>
                          <input
                            type="file"
                            accept=".pdf,.docx,.doc"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                        </label>
                        <p className="text-xs text-gray-500 mt-2">PDF or DOCX up to 10MB</p>
                      </div>

                      {tenancyAgreement.uploadedFileName && (
                        <div className="bg-green-50 border border-green-200 rounded-md p-4">
                          <div className="flex items-center space-x-2">
                            <CheckCircleIcon className="w-5 h-5 text-green-600" />
                            <span className="text-green-700 font-medium">
                              File uploaded: {tenancyAgreement.uploadedFileName}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {tenancyAgreement.status === 'generating' && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-gray-600">Generating your tenancy agreement...</p>
                </div>
              )}

              {tenancyAgreement.status === 'ready_for_signing' && (
                <div className="space-y-4">
                  <div className="bg-green-50 border border-green-200 rounded-md p-4">
                    <div className="flex items-center space-x-2">
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      <span className="text-green-700 font-medium">
                        Tenancy agreement generated successfully!
                      </span>
                    </div>
                    <p className="text-green-600 text-sm mt-1">
                      Generated on {tenancyAgreement.generatedDate?.toLocaleDateString()}
                    </p>
                  </div>

                  {!DocuSignService.isConfigured() && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                      <p className="text-sm text-yellow-700">
                        DocuSign is not configured. Operating in demo mode. 
                        {' '}<button className="underline hover:text-yellow-800" onClick={() => alert(DocuSignService.getConfigurationInstructions())}>
                          View setup instructions
                        </button>
                      </p>
                    </div>
                  )}

                  <div className="space-y-3">
                    <button 
                      onClick={sendForDocuSignSignature}
                      className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Send for Digital Signature (DocuSign)
                    </button>
                    <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors">
                      Download PDF
                    </button>
                    <button className="w-full border border-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-50 transition-colors">
                      Preview Agreement
                    </button>
                  </div>

                  {tenancyAgreement.docusignEnvelope && tenancyAgreement.docusignEnvelope.status === 'sent' && (
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <p className="text-sm text-blue-700">
                        Agreement sent for signature via DocuSign. Envelope ID: {tenancyAgreement.docusignEnvelope.envelopeId}
                        <br />
                        Auto-completing in 5 seconds for demo...
                      </p>
                    </div>
                  )}
                </div>
              )}

              {tenancyAgreement.status === 'signed' && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    <span className="text-green-700 font-medium">
                      Tenancy agreement signed by all parties!
                    </span>
                  </div>
                  <p className="text-green-600 text-sm mt-1">
                    Signed on {tenancyAgreement.signedDate?.toLocaleDateString()}
                  </p>
                </div>
              )}

              {tenancyAgreement.status === 'uploaded' && (
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex items-center space-x-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    <span className="text-green-700 font-medium">
                      Agent contract uploaded successfully!
                    </span>
                  </div>
                  <p className="text-green-600 text-sm mt-1">
                    File: {tenancyAgreement.uploadedFileName}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Preparation */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <h4 className="text-lg font-medium text-gray-900">Preparation for Tenancy</h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                  preparationService.type === 'diy' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`} onClick={() => setPreparationService(prev => ({ ...prev, type: 'diy' }))}>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="radio"
                      checked={preparationService.type === 'diy'}
                      onChange={() => setPreparationService(prev => ({ ...prev, type: 'diy' }))}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-gray-900">DIY Checklist</span>
                    <span className="text-green-600 font-medium">FREE</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    Complete the preparation tasks yourself using our comprehensive checklist.
                  </p>
                </div>

                <div className={`border-2 rounded-lg p-4 cursor-pointer transition-colors ${
                  preparationService.type === 'concierge' ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                }`} onClick={() => setPreparationService(prev => ({ ...prev, type: 'concierge' }))}>
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="radio"
                      checked={preparationService.type === 'concierge'}
                      onChange={() => setPreparationService(prev => ({ ...prev, type: 'concierge' }))}
                      className="text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-medium text-gray-900">Concierge Service</span>
                    <span className="text-blue-600 font-medium">£75</span>
                  </div>
                  <p className="text-sm text-gray-600">
                    We'll handle all the preparation tasks for you, ensuring everything is ready for move-in.
                  </p>
                </div>
              </div>

              {preparationService.type === 'diy' && (
                <div className="space-y-3">
                  <h5 className="font-medium text-gray-900">Preparation Checklist</h5>
                  {preparationService.checklist.map((item) => (
                    <div key={item.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-md">
                      <input
                        type="checkbox"
                        checked={item.completed}
                        onChange={() => toggleChecklistItem(item.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <div className="flex-1">
                        <span className={`text-sm ${item.completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {item.task}
                        </span>
                        {item.required && (
                          <span className="ml-2 text-xs text-red-600">*Required</span>
                        )}
                      </div>
                    </div>
                  ))}
                  
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
                    <p className="text-sm text-blue-700">
                      <strong>Progress:</strong> {preparationService.checklist.filter(item => item.completed).length} of {preparationService.checklist.length} tasks completed
                    </p>
                    <p className="text-sm text-blue-700">
                      <strong>Required tasks:</strong> {preparationService.checklist.filter(item => item.required && item.completed).length} of {preparationService.checklist.filter(item => item.required).length} completed
                    </p>
                  </div>
                </div>
              )}

              {preparationService.type === 'concierge' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                    <h5 className="font-medium text-blue-900 mb-2">Concierge Service Includes:</h5>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>• Complete property inventory</li>
                      <li>• Key cutting and access setup</li>
                      <li>• Utility account coordination</li>
                      <li>• Insurance updates</li>
                      <li>• Deposit protection</li>
                      <li>• Safety checks and maintenance</li>
                      <li>• Professional cleaning if needed</li>
                      <li>• Move-in coordination</li>
                    </ul>
                  </div>

                  {!preparationService.conciergeOrdered ? (
                    <button
                      onClick={orderConciergeService}
                      className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
                    >
                      Order Concierge Service - £75
                    </button>
                  ) : (
                    <div className="bg-green-50 border border-green-200 rounded-md p-4">
                      <div className="flex items-center space-x-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                        <span className="text-green-700 font-medium">
                          Concierge service ordered!
                        </span>
                      </div>
                      <p className="text-green-600 text-sm mt-1">
                        Ordered on {preparationService.conciergeOrderedDate?.toLocaleDateString()}. 
                        We'll contact you within 24 hours to coordinate the service.
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation and Actions */}
        <div className="flex items-center justify-between pt-6 border-t border-gray-200 mt-6">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
              disabled={currentStep === 0}
              className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            
            {currentStep < ONBOARDING_STEPS.length - 1 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canProceedToNext()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={progress < 100}
                className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Complete Onboarding
              </button>
            )}
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-600">Total Cost</div>
            <div className="text-lg font-semibold text-gray-900">£{getTotalCost()}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
