import React, { useState } from 'react';
import {
  HomeIcon,
  UserGroupIcon,
  CurrencyPoundIcon,
  DocumentCheckIcon,
  SparklesIcon,
  XMarkIcon
} from '@heroicons/react/24/outline';

interface WelcomeToOrganizationModalProps {
  isOpen: boolean;
  organizationName: string;
  role: 'owner' | 'member';
  onComplete: () => void;
}

export const WelcomeToOrganizationModal: React.FC<WelcomeToOrganizationModalProps> = ({
  isOpen,
  organizationName,
  role,
  onComplete
}) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const tourSteps = [
    {
      title: `Welcome to ${organizationName}! 🎉`,
      description: 'You\'ve successfully joined the organization. Let\'s take a quick tour to get you started.',
      icon: SparklesIcon,
      iconBg: 'bg-green-100',
      iconColor: 'text-green-600',
      content: (
        <div className="space-y-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800 text-sm">
              <span className="font-semibold">You are a {role}</span> of this organization.
              {role === 'owner' ? ' You have full access to manage properties, tenants, and settings.' : ' You can view and manage properties and tenants.'}
            </p>
          </div>
          <p className="text-gray-600 text-sm">
            This organization uses Base Prop to manage properties, tenants, rent payments, and compliance checks. 
            Let's show you around!
          </p>
        </div>
      )
    },
    {
      title: 'Properties & Portfolio',
      description: 'View and manage all properties in your organization',
      icon: HomeIcon,
      iconBg: 'bg-blue-100',
      iconColor: 'text-blue-600',
      content: (
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-sm">1</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">View Properties</h4>
              <p className="text-gray-600 text-sm">See all properties with details, status, and key information</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-sm">2</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">Track Status</h4>
              <p className="text-gray-600 text-sm">Monitor occupancy, maintenance needs, and compliance</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <span className="text-blue-600 font-semibold text-sm">3</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">{role === 'owner' ? 'Add & Edit' : 'Collaborate'}</h4>
              <p className="text-gray-600 text-sm">
                {role === 'owner' 
                  ? 'Add new properties and update existing ones'
                  : 'Work together with your team on property management'
                }
              </p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Tenant Management',
      description: 'Manage tenants, leases, and onboarding',
      icon: UserGroupIcon,
      iconBg: 'bg-purple-100',
      iconColor: 'text-purple-600',
      content: (
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 font-semibold text-sm">1</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">Tenant Directory</h4>
              <p className="text-gray-600 text-sm">Access contact info, lease details, and tenant history</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 font-semibold text-sm">2</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">Onboarding Workflow</h4>
              <p className="text-gray-600 text-sm">Complete tenant onboarding with credit checks and agreements</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
              <span className="text-purple-600 font-semibold text-sm">3</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">Communication</h4>
              <p className="text-gray-600 text-sm">Send notices and track tenant communications</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Rent & Financials',
      description: 'Track rent payments and expenses',
      icon: CurrencyPoundIcon,
      iconBg: 'bg-amber-100',
      iconColor: 'text-amber-600',
      content: (
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <span className="text-amber-600 font-semibold text-sm">1</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">Rent Tracking</h4>
              <p className="text-gray-600 text-sm">Monitor rent payments, mark as paid, and track overdue amounts</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <span className="text-amber-600 font-semibold text-sm">2</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">Expense Management</h4>
              <p className="text-gray-600 text-sm">Record property expenses and track spending</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
              <span className="text-amber-600 font-semibold text-sm">3</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">Financial Reports</h4>
              <p className="text-gray-600 text-sm">View income, expenses, and profitability at a glance</p>
            </div>
          </div>
        </div>
      )
    },
    {
      title: 'Inspections & Compliance',
      description: 'Stay on top of property inspections and compliance',
      icon: DocumentCheckIcon,
      iconBg: 'bg-indigo-100',
      iconColor: 'text-indigo-600',
      content: (
        <div className="space-y-3">
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <span className="text-indigo-600 font-semibold text-sm">1</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">Schedule Inspections</h4>
              <p className="text-gray-600 text-sm">Plan routine property inspections and track completion</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <span className="text-indigo-600 font-semibold text-sm">2</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">Compliance Checks</h4>
              <p className="text-gray-600 text-sm">Manage safety certificates, gas checks, and legal requirements</p>
            </div>
          </div>
          <div className="flex items-start space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
              <span className="text-indigo-600 font-semibold text-sm">3</span>
            </div>
            <div>
              <h4 className="font-medium text-gray-900 text-sm">Maintenance Records</h4>
              <p className="text-gray-600 text-sm">Document repairs, maintenance, and property history</p>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentTourStep = tourSteps[currentStep];
  const Icon = currentTourStep.icon;
  const isLastStep = currentStep === tourSteps.length - 1;

  const handleNext = () => {
    if (isLastStep) {
      onComplete();
    } else {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSkip = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 text-white relative">
          <button
            onClick={handleSkip}
            className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
          <div className="flex items-center space-x-4">
            <div className={`${currentTourStep.iconBg} p-3 rounded-xl`}>
              <Icon className={`w-8 h-8 ${currentTourStep.iconColor}`} />
            </div>
            <div>
              <h2 className="text-2xl font-bold">{currentTourStep.title}</h2>
              <p className="text-green-100 text-sm mt-1">{currentTourStep.description}</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentTourStep.content}
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center space-x-2 px-6 pb-4">
          {tourSteps.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentStep(index)}
              className={`w-2 h-2 rounded-full transition-all ${
                index === currentStep 
                  ? 'bg-green-600 w-8' 
                  : index < currentStep
                    ? 'bg-green-300'
                    : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
          <div className="text-sm text-gray-600">
            Step {currentStep + 1} of {tourSteps.length}
          </div>
          <div className="flex space-x-3">
            {currentStep > 0 && (
              <button
                onClick={handleBack}
                className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg font-medium transition-colors"
              >
                Back
              </button>
            )}
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-gray-600 hover:bg-gray-200 rounded-lg font-medium transition-colors"
            >
              Skip Tour
            </button>
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors"
            >
              {isLastStep ? 'Get Started' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};



