import React from 'react';
import { 
  HomeIcon,
  UserGroupIcon,
  CurrencyPoundIcon,
  DocumentCheckIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface QuickStartGuideProps {
  properties: any[];
  tenants: any[];
  onAddProperty: () => void;
  onAddTenant: () => void;
  onViewRent: () => void;
  onViewInspections: () => void;
  onLoadDemoData?: () => void;
  isLoadingDemo?: boolean;
}

export const QuickStartGuide: React.FC<QuickStartGuideProps> = ({
  properties,
  tenants,
  onAddProperty,
  onAddTenant,
  onViewRent,
  onViewInspections,
  onLoadDemoData,
  isLoadingDemo = false
}) => {
  const steps = [
    {
      id: 'add-property',
      title: 'Add Your First Property',
      description: 'Start by adding a property to your portfolio',
      icon: HomeIcon,
      completed: properties.length > 0,
      action: onAddProperty,
      buttonText: 'Add Property'
    },
    {
      id: 'add-tenant',
      title: 'Add Tenants',
      description: 'Add tenants and assign them to your properties',
      icon: UserGroupIcon,
      completed: tenants.length > 0,
      action: onAddTenant,
      buttonText: 'Add Tenant',
      disabled: properties.length === 0
    },
    {
      id: 'setup-rent',
      title: 'Set Up Rent Tracking',
      description: 'Configure rent amounts and payment schedules',
      icon: CurrencyPoundIcon,
      completed: tenants.some(t => t.monthlyRent > 0),
      action: onViewRent,
      buttonText: 'Manage Rent',
      disabled: tenants.length === 0
    },
    {
      id: 'schedule-inspection',
      title: 'Schedule Inspections',
      description: 'Set up regular property inspections',
      icon: DocumentCheckIcon,
      completed: false, // This would need to be tracked in your data
      action: onViewInspections,
      buttonText: 'View Inspections',
      disabled: properties.length === 0
    }
  ];

  const completedSteps = steps.filter(step => step.completed).length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium text-gray-900 mb-2">Quick Start Guide</h3>
        <p className="text-sm text-gray-600 mb-4">
          Complete these steps to get your property management system up and running.
        </p>
        
        {/* Progress bar */}
        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{completedSteps} of {steps.length} completed</span>
          </div>
          <div className="bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => {
          const Icon = step.icon;
          
          return (
            <div 
              key={step.id}
              className={`flex items-center p-4 rounded-lg border ${
                step.completed 
                  ? 'bg-green-50 border-green-200' 
                  : step.disabled
                  ? 'bg-gray-50 border-gray-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex-shrink-0 mr-4">
                {step.completed ? (
                  <CheckCircleIcon className="w-8 h-8 text-green-500" />
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    step.disabled ? 'bg-gray-300' : 'bg-blue-100'
                  }`}>
                    <Icon className={`w-5 h-5 ${
                      step.disabled ? 'text-gray-500' : 'text-blue-600'
                    }`} />
                  </div>
                )}
              </div>
              
              <div className="flex-1">
                <h4 className={`font-medium ${
                  step.completed ? 'text-green-900' : 
                  step.disabled ? 'text-gray-500' : 'text-gray-900'
                }`}>
                  {step.title}
                </h4>
                <p className={`text-sm ${
                  step.completed ? 'text-green-700' : 
                  step.disabled ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {step.description}
                </p>
              </div>
              
              {!step.completed && (
                <button
                  onClick={step.action}
                  disabled={step.disabled}
                  className={`ml-4 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    step.disabled
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500'
                  }`}
                >
                  {step.buttonText}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Demo data option for new users */}
      {properties.length === 0 && tenants.length === 0 && onLoadDemoData && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-blue-900">Want to explore first?</h4>
              <p className="text-sm text-blue-700">
                Load sample properties and tenants to see how the system works before adding your own data.
              </p>
            </div>
            <button
              onClick={onLoadDemoData}
              disabled={isLoadingDemo}
              className="ml-4 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
            >
              {isLoadingDemo ? 'Loading...' : 'Try Demo Data'}
            </button>
          </div>
        </div>
      )}

      {completedSteps === steps.length && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <CheckCircleIcon className="w-6 h-6 text-green-500 mr-3" />
            <div>
              <h4 className="font-medium text-green-900">All set up!</h4>
              <p className="text-sm text-green-700">
                Your property management system is ready to use. You can now manage your properties, tenants, and workflows efficiently.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};