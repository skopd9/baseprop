import React, { useState } from 'react';
import { XMarkIcon, UserIcon, CheckCircleIcon } from '@heroicons/react/24/outline';
import { SimplifiedTenant } from '../utils/simplifiedDataTransforms';

interface SimpleTenantOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenant: SimplifiedTenant;
  onComplete: (tenant: SimplifiedTenant) => void;
}

const SIMPLE_ONBOARDING_STEPS = [
  {
    id: 'welcome',
    title: 'Welcome Email Sent',
    description: 'Welcome email with property details sent to tenant',
    completed: true
  },
  {
    id: 'documents',
    title: 'Documents Provided',
    description: 'Tenancy agreement, safety certificates, and guides provided',
    completed: false
  },
  {
    id: 'deposit',
    title: 'Deposit Collected',
    description: 'Security deposit and first month rent collected',
    completed: false
  },
  {
    id: 'keys',
    title: 'Keys Handed Over',
    description: 'Property keys and access cards provided to tenant',
    completed: false
  }
];

export const SimpleTenantOnboardingModal: React.FC<SimpleTenantOnboardingModalProps> = ({
  isOpen,
  onClose,
  tenant,
  onComplete
}) => {
  const [steps, setSteps] = useState(SIMPLE_ONBOARDING_STEPS);
  const [notes, setNotes] = useState('');

  const handleStepToggle = (stepId: string) => {
    setSteps(prev => prev.map(step => 
      step.id === stepId ? { ...step, completed: !step.completed } : step
    ));
  };

  const handleComplete = () => {
    const completedSteps = steps.filter(step => step.completed).length;
    const progress = Math.round((completedSteps / steps.length) * 100);
    
    // Update tenant with onboarding completion
    const updatedTenant = {
      ...tenant,
      onboardingStatus: progress === 100 ? 'completed' : 'in_progress',
      onboardingProgress: progress,
      onboardingNotes: notes
    };
    
    onComplete(updatedTenant);
    onClose();
  };

  if (!isOpen) return null;

  const completedSteps = steps.filter(step => step.completed).length;
  const progress = Math.round((completedSteps / steps.length) * 100);

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-10 mx-auto p-6 border w-full max-w-2xl shadow-lg rounded-lg bg-white">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <UserIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Tenant Onboarding</h3>
              <p className="text-sm text-gray-500">{tenant.name} - {tenant.propertyAddress}</p>
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
            <span>{completedSteps} of {steps.length} steps completed</span>
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

        {/* Onboarding Steps */}
        <div className="space-y-4 mb-6">
          {steps.map((step) => (
            <div
              key={step.id}
              className={`border rounded-lg p-4 transition-all ${
                step.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    step.completed ? 'bg-green-100' : 'bg-gray-100'
                  }`}>
                    {step.completed ? (
                      <CheckCircleIcon className="w-4 h-4 text-green-600" />
                    ) : (
                      <div className="w-2 h-2 bg-gray-400 rounded-full" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">{step.title}</h4>
                    <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                  </div>
                </div>
                
                <button
                  onClick={() => handleStepToggle(step.id)}
                  className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                    step.completed
                      ? 'bg-green-100 text-green-700 hover:bg-green-200'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {step.completed ? 'Completed' : 'Mark Complete'}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
            Onboarding Notes
          </label>
          <textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="Add any notes about the onboarding process..."
          />
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Cancel
          </button>
          <button
            onClick={handleComplete}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            {progress === 100 ? 'Complete Onboarding' : 'Save Progress'}
          </button>
        </div>
      </div>
    </div>
  );
};