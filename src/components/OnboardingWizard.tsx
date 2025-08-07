import React, { useState } from 'react';
import { XMarkIcon, ChevronRightIcon, CheckIcon } from '@heroicons/react/24/outline';

interface OnboardingWizardProps {
  onComplete: () => void;
  onSkip: () => void;
}

interface UserProfile {
  userType: string;
  portfolioSize: string;
  propertyTypes: string[];
  location: string;
}

const userTypes = [
  { id: 'family_office', label: 'Family Office', description: 'Managing wealth for high-net-worth families' },
  { id: 'reit', label: 'REIT', description: 'Real Estate Investment Trust' },
  { id: 'investor', label: 'Investor', description: 'Professional real estate investor' },
  { id: 'diy_landlord', label: 'DIY Landlord', description: 'Individual property owner' },
  { id: 'property_manager', label: 'Property Manager', description: 'Managing properties for others' },
];

const portfolioSizes = [
  { id: '1-5', label: '1-5 Properties', description: 'Small portfolio' },
  { id: '6-20', label: '6-20 Properties', description: 'Medium portfolio' },
  { id: '21-100', label: '21-100 Properties', description: 'Large portfolio' },
  { id: '100+', label: '100+ Properties', description: 'Enterprise portfolio' },
];

const propertyTypes = [
  { id: 'residential', label: 'Residential' },
  { id: 'commercial', label: 'Commercial' },
  { id: 'retail', label: 'Retail' },
  { id: 'office', label: 'Office' },
  { id: 'industrial', label: 'Industrial' },
  { id: 'mixed_use', label: 'Mixed Use' },
];

const getSolutionRecommendations = (userType: string, portfolioSize: string) => {
  const baseRecommendations = [
    { name: 'Property Valuations', description: 'Professional property appraisals', available: true },
    { name: 'Portfolio Analytics', description: 'Performance tracking and insights', available: false },
    { name: 'Compliance Management', description: 'Regulatory compliance tracking', available: false },
    { name: 'Tenant Management', description: 'Tenant screening and management', available: false },
    { name: 'Financial Reporting', description: 'Automated financial reports', available: false },
    { name: 'Market Intelligence', description: 'Market trends and analysis', available: false },
  ];

  // Customize recommendations based on user type
  if (userType === 'family_office' || userType === 'reit') {
    return [
      baseRecommendations[0], // Valuations
      baseRecommendations[1], // Portfolio Analytics
      baseRecommendations[4], // Financial Reporting
      baseRecommendations[5], // Market Intelligence
      baseRecommendations[2], // Compliance
      baseRecommendations[3], // Tenant Management
    ];
  } else if (userType === 'property_manager') {
    return [
      baseRecommendations[3], // Tenant Management
      baseRecommendations[0], // Valuations
      baseRecommendations[4], // Financial Reporting
      baseRecommendations[2], // Compliance
      baseRecommendations[1], // Portfolio Analytics
      baseRecommendations[5], // Market Intelligence
    ];
  } else {
    return baseRecommendations;
  }
};

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState<UserProfile>({
    userType: '',
    portfolioSize: '',
    propertyTypes: [],
    location: '',
  });

  const totalSteps = 4;

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      onComplete();
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handlePropertyTypeToggle = (typeId: string) => {
    setProfile(prev => ({
      ...prev,
      propertyTypes: prev.propertyTypes.includes(typeId)
        ? prev.propertyTypes.filter(id => id !== typeId)
        : [...prev.propertyTypes, typeId]
    }));
  };

  const canProceed = () => {
    switch (step) {
      case 1: return profile.userType !== '';
      case 2: return profile.portfolioSize !== '' && profile.propertyTypes.length > 0;
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  };

  const recommendations = getSolutionRecommendations(profile.userType, profile.portfolioSize);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Welcome to turnkey</h2>
            <p className="text-sm text-gray-500">Step {step} of {totalSteps}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onSkip}
              className="text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-100"
            >
              Skip
            </button>
            <button
              onClick={onSkip}
              className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-3 bg-gray-50">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 160px)' }}>
          {step === 1 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">What best describes you?</h3>
              <div className="space-y-3">
                {userTypes.map((type) => (
                  <button
                    key={type.id}
                    onClick={() => setProfile(prev => ({ ...prev, userType: type.id }))}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                      profile.userType === type.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium text-gray-900">{type.label}</div>
                    <div className="text-sm text-gray-500">{type.description}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Tell us about your portfolio</h3>
              
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">Portfolio size</label>
                <div className="grid grid-cols-2 gap-3">
                  {portfolioSizes.map((size) => (
                    <button
                      key={size.id}
                      onClick={() => setProfile(prev => ({ ...prev, portfolioSize: size.id }))}
                      className={`p-3 rounded-lg border-2 text-left transition-colors ${
                        profile.portfolioSize === size.id
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="font-medium text-gray-900">{size.label}</div>
                      <div className="text-xs text-gray-500">{size.description}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Property types (select all that apply)</label>
                <div className="grid grid-cols-3 gap-3">
                  {propertyTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => handlePropertyTypeToggle(type.id)}
                      className={`p-3 rounded-lg border-2 text-center transition-colors ${
                        profile.propertyTypes.includes(type.id)
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="text-sm font-medium text-gray-900">{type.label}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Recommended solutions for you</h3>
              <p className="text-sm text-gray-600 mb-6">
                Based on your profile as a {userTypes.find(t => t.id === profile.userType)?.label?.toLowerCase()} 
                with a {profile.portfolioSize} property portfolio, here are our top recommendations:
              </p>
              
              <div className="space-y-3">
                {recommendations.map((solution, index) => (
                  <div
                    key={solution.name}
                    className={`p-4 rounded-lg border-2 ${
                      solution.available
                        ? 'border-green-200 bg-green-50'
                        : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-gray-900">{index + 1}. {solution.name}</span>
                          {solution.available && (
                            <CheckIcon className="w-4 h-4 text-green-600" />
                          )}
                        </div>
                        <div className="text-sm text-gray-600">{solution.description}</div>
                      </div>
                      <div className={`text-xs px-2 py-1 rounded-full ${
                        solution.available
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-500'
                      }`}>
                        {solution.available ? 'Available' : 'Coming Soon'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckIcon className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">You're all set!</h3>
              <p className="text-gray-600 mb-6">
                Currently, only <strong>Property Valuations</strong> is ready to use, but we're adding new solutions every week. 
                You'll get access to new features as they become available.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="text-sm text-blue-800">
                  <strong>What's next:</strong> Start by adding your properties to the Asset Register, 
                  then use the Task Manager to initiate property valuations.
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleBack}
            disabled={step === 1}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Back
          </button>
          
          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <span>{step === totalSteps ? 'Get Started' : 'Continue'}</span>
            <ChevronRightIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}; 