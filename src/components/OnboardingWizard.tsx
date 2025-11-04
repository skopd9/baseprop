import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { getCountryList, CountryCode } from '../lib/countries';
import { SimplifiedAddPropertyModal } from './SimplifiedAddPropertyModal';

interface OnboardingWizardProps {
  userId: string;
  userEmail: string;
  onComplete: () => void;
}

interface OnboardingData {
  fullName: string;
  companyName: string;
  role: 'landlord' | 'property_manager' | 'real_estate_professional' | 'other';
  portfolioSize: '1-5' | '6-10' | '11-25' | '26-50' | '50+';
  country: CountryCode;
  useCases: string[];
}

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ userId, userEmail, onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);

  const [formData, setFormData] = useState<OnboardingData>({
    fullName: '',
    companyName: '',
    role: 'landlord',
    portfolioSize: '1-5',
    country: 'UK',
    useCases: []
  });

  const totalSteps = 6;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleUseCaseToggle = (useCase: string) => {
    setFormData(prev => ({
      ...prev,
      useCases: prev.useCases.includes(useCase)
        ? prev.useCases.filter(uc => uc !== useCase)
        : [...prev.useCases, useCase]
    }));
  };

  const completeOnboarding = async (startingOption: 'add_property' | 'empty') => {
    setIsLoading(true);
    setError('');

    try {
      // 1. Save user profile
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          full_name: formData.fullName,
          has_completed_onboarding: true,
          onboarding_data: {
            company_name: formData.companyName,
            role: formData.role,
            portfolio_size: formData.portfolioSize,
            country: formData.country,
            use_cases: formData.useCases,
            starting_option: startingOption,
            completed_at: new Date().toISOString()
          }
        });

      if (profileError) throw profileError;

      // 2. Create organization
      const orgName = formData.companyName || `${formData.fullName}'s Properties`;
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name: orgName,
          created_by: userId,
          settings: {
            country: formData.country,
            default_currency: formData.country === 'UK' ? 'GBP' : formData.country === 'GR' ? 'EUR' : 'USD'
          }
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // 3. Add user as organization owner
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: org.id,
          user_id: userId,
          role: 'owner',
          status: 'active',
          joined_at: new Date().toISOString()
        });

      if (memberError) throw memberError;

      // 4. Handle starting option
      if (startingOption === 'add_property') {
        // Store org ID and show add property modal
        localStorage.setItem('currentOrganizationId', org.id);
        setShowAddPropertyModal(true);
        return; // Don't complete yet, wait for modal to close
      }

      // Complete onboarding
      onComplete();
    } catch (err: any) {
      console.error('Error completing onboarding:', err);
      setError(err.message || 'Failed to complete onboarding');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePropertyModalClose = () => {
    setShowAddPropertyModal(false);
    onComplete();
  };

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Welcome! Let's get started</h2>
            <p className="text-gray-600 mb-6">Tell us a bit about yourself</p>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="John Smith"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Company Name (Optional)
              </label>
              <input
                type="text"
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder="Smith Property Management"
              />
              <p className="text-xs text-gray-500 mt-1">
                We'll use this to name your workspace
              </p>
            </div>

            <button
              onClick={handleNext}
              disabled={!formData.fullName.trim()}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue
            </button>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">What's your role?</h2>
            <p className="text-gray-600 mb-6">Help us customize your experience</p>

            <div className="space-y-3">
              {[
                { value: 'landlord', label: 'Landlord', description: 'I own and manage rental properties' },
                { value: 'property_manager', label: 'Property Manager', description: 'I manage properties for others' },
                { value: 'real_estate_professional', label: 'Real Estate Professional', description: 'Agent, broker, or consultant' },
                { value: 'other', label: 'Other', description: 'None of the above' }
              ].map((option) => (
                <label
                  key={option.value}
                  className={`flex items-start p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.role === option.value
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={option.value}
                    checked={formData.role === option.value}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="mt-1 mr-3"
                  />
                  <div>
                    <div className="font-semibold text-gray-900">{option.label}</div>
                    <div className="text-sm text-gray-600">{option.description}</div>
                  </div>
                </label>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleBack}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-green-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Portfolio size</h2>
            <p className="text-gray-600 mb-6">How many properties do you manage?</p>

            <div className="grid grid-cols-2 gap-3">
              {[
                { value: '1-5', label: '1-5' },
                { value: '6-10', label: '6-10' },
                { value: '11-25', label: '11-25' },
                { value: '26-50', label: '26-50' },
                { value: '50+', label: '50+' }
              ].map((option) => (
                <button
                  key={option.value}
                  onClick={() => setFormData({ ...formData, portfolioSize: option.value as any })}
                  className={`p-4 border-2 rounded-lg font-semibold transition-all ${
                    formData.portfolioSize === option.value
                      ? 'border-green-600 bg-green-50 text-green-700'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {option.label} properties
                </button>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleBack}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-green-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Where are your properties?</h2>
            <p className="text-gray-600 mb-6">Select your primary location</p>

            <div className="space-y-3">
              {getCountryList().map((country) => {
                const flags: Record<string, string> = {
                  'UK': '🇬🇧',
                  'GR': '🇬🇷',
                  'US': '🇺🇸'
                };

                return (
                  <button
                    key={country.code}
                    onClick={() => setFormData({ ...formData, country: country.code })}
                    className={`w-full flex items-center p-4 border-2 rounded-lg transition-all ${
                      formData.country === country.code
                        ? 'border-green-600 bg-green-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <span className="text-3xl mr-3">{flags[country.code]}</span>
                    <span className="font-semibold text-gray-900">{country.name}</span>
                  </button>
                );
              })}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleBack}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-green-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">What do you want to focus on?</h2>
            <p className="text-gray-600 mb-6">Select all that apply</p>

            <div className="space-y-3">
              {[
                { value: 'tenant_management', label: 'Tenant Management', icon: '👥' },
                { value: 'rent_collection', label: 'Rent Collection', icon: '💰' },
                { value: 'property_maintenance', label: 'Property Maintenance', icon: '🔧' },
                { value: 'compliance_tracking', label: 'Compliance Tracking', icon: '📋' },
                { value: 'financial_reporting', label: 'Financial Reporting', icon: '📊' }
              ].map((useCase) => (
                <label
                  key={useCase.value}
                  className={`flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${
                    formData.useCases.includes(useCase.value)
                      ? 'border-green-600 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={formData.useCases.includes(useCase.value)}
                    onChange={() => handleUseCaseToggle(useCase.value)}
                    className="mr-3"
                  />
                  <span className="text-2xl mr-3">{useCase.icon}</span>
                  <span className="font-semibold text-gray-900">{useCase.label}</span>
                </label>
              ))}
            </div>

            <div className="flex gap-3 pt-4">
              <button
                onClick={handleBack}
                className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleNext}
                className="flex-1 bg-green-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-green-700 transition-colors"
              >
                Continue
              </button>
            </div>
          </div>
        );

      case 6:
        return (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">You're all set!</h2>
            <p className="text-gray-600 mb-6">How would you like to get started?</p>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => completeOnboarding('add_property')}
                disabled={isLoading}
                className="w-full flex items-start p-4 border-2 border-green-600 bg-green-50 rounded-lg hover:bg-green-100 transition-colors text-left disabled:opacity-50"
              >
                <span className="text-2xl mr-3">🏠</span>
                <div>
                  <div className="font-semibold text-gray-900">Add my first property</div>
                  <div className="text-sm text-gray-600">Start by adding a property to your portfolio</div>
                </div>
              </button>

              <button
                onClick={() => completeOnboarding('empty')}
                disabled={isLoading}
                className="w-full flex items-start p-4 border-2 border-gray-200 rounded-lg hover:border-gray-300 transition-colors text-left disabled:opacity-50"
              >
                <span className="text-2xl mr-3">✨</span>
                <div>
                  <div className="font-semibold text-gray-900">Start with empty portfolio</div>
                  <div className="text-sm text-gray-600">Set up everything yourself</div>
                </div>
              </button>
            </div>

            <button
              onClick={handleBack}
              disabled={isLoading}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
            >
              Back
            </button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <div className="bg-white rounded-2xl max-w-2xl w-full p-8 shadow-xl">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStep} of {totalSteps}</span>
            <span>{Math.round((currentStep / totalSteps) * 100)}% complete</span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-green-600 transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step content */}
        {renderStep()}
      </div>

      {/* Add Property Modal */}
      {showAddPropertyModal && (
        <SimplifiedAddPropertyModal
          isOpen={showAddPropertyModal}
          onClose={handlePropertyModalClose}
          onPropertyAdded={handlePropertyModalClose}
        />
      )}
    </>
  );
};

