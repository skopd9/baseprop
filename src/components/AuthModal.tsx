import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { PersonaService } from '../services/PersonaService';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (userEmail: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [useCase, setUseCase] = useState('');
  const [howDidYouHear, setHowDidYouHear] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isWaitlistMode, setIsWaitlistMode] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);

  const resetForm = () => {
    setEmail('');
    setName('');
    setCompany('');
    setUseCase('');
    setHowDidYouHear('');
    setError('');
    setIsWaitlistMode(false);
    setWaitlistSuccess(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const checkAlphaAccess = async (email: string): Promise<boolean> => {
    // Allow admin email immediately
    if (email === 'admin@turnkey.com') {
      return true;
    }

    try {
      // Try using the function first, fallback to direct query
      const { data, error } = await supabase
        .rpc('is_alpha_user', { user_email: email });
      
      if (error) {
        console.log('Function not found, using direct query:', error.message);
        // Fallback to direct table query
        const { data: alphaData, error: alphaError } = await supabase
          .from('alpha_list')
          .select('email')
          .eq('email', email)
          .single();
        
        if (alphaError && alphaError.code !== 'PGRST116') {
          console.error('Error checking alpha list:', alphaError);
          // If database queries fail, allow admin email as fallback
          return email === 'admin@turnkey.com';
        }
        
        return alphaData !== null;
      }
      
      return data === true;
    } catch (error) {
      console.error('Error checking alpha access:', error);
      // Final fallback for admin email
      return email === 'admin@turnkey.com';
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Check if user is in alpha list
      const hasAlphaAccess = await checkAlphaAccess(email);
      
      if (hasAlphaAccess) {
        // User has alpha access - proceed to main app with email
        console.log('Alpha user detected, granting access');
        onSuccess(email);
        handleClose();
      } else {
        // User not in alpha list - show waitlist form
        setIsWaitlistMode(true);
      }
    } catch (error) {
      console.error('Login error:', error);
      setError('An error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleWaitlistSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      // Try using the function first, fallback to direct insert
      const { error } = await supabase
        .rpc('join_waitlist', {
          user_email: email,
          user_name: name || null,
          user_company: company || null,
          user_use_case: useCase || null,
          how_heard: howDidYouHear || null
        });

      if (error) {
        console.log('Function not found, using direct insert:', error.message);
        // Fallback to direct table insert with minimal required fields
        const { error: insertError } = await supabase
          .from('waitlist')
          .insert({
            email: email,
            ...(name && { name }),
            ...(company && { company }),
            ...(useCase && { use_case: useCase }),
            ...(howDidYouHear && { how_did_you_hear: howDidYouHear })
          });

        if (insertError) {
          console.log('Direct insert failed, trying with email only:', insertError.message);
          // Final fallback - just insert email
          const { error: emailOnlyError } = await supabase
            .from('waitlist')
            .insert({ email: email });
          
          if (emailOnlyError) {
            throw emailOnlyError;
          }
        }
      }

      setWaitlistSuccess(true);
    } catch (error) {
      console.error('Waitlist error:', error);
      setError('Failed to join waitlist. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 relative max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
        >
          ×
        </button>

        {/* Success State */}
        {waitlistSuccess ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">You're on the list!</h2>
            <p className="text-gray-600 mb-6">
              Thanks for joining our alpha waitlist. We'll notify you as soon as access becomes available.
            </p>
            <button
              onClick={handleClose}
              className="w-full bg-orange-500 text-white py-3 px-4 rounded-xl font-semibold hover:bg-orange-600 transition-colors"
            >
              Got it
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {isWaitlistMode ? 'Join Alpha Waitlist' : 'Get Started with Turnkey'}
              </h2>
              <p className="text-gray-600">
                {isWaitlistMode 
                  ? 'Tell us about your real estate workflow needs'
                  : 'Enter your email to access Turnkey'
                }
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Login Form */}
            {!isWaitlistMode ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email address
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="you@company.com"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-orange-500 text-white py-3 px-4 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Checking access...' : 'Continue'}
                </button>
              </form>
            ) : (
              /* Waitlist Form */
              <form onSubmit={handleWaitlistSubmit} className="space-y-4">
                <div>
                  <label htmlFor="waitlist-email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email address *
                  </label>
                  <input
                    type="email"
                    id="waitlist-email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="you@company.com"
                    required
                  />
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label htmlFor="company" className="block text-sm font-medium text-gray-700 mb-1">
                    Company
                  </label>
                  <input
                    type="text"
                    id="company"
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    placeholder="Your company"
                  />
                </div>

                <div>
                  <label htmlFor="useCase" className="block text-sm font-medium text-gray-700 mb-1">
                    What's your real estate workflow use case?
                  </label>
                  <select
                    id="useCase"
                    value={useCase}
                    onChange={(e) => setUseCase(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select use case</option>
                    <option value="property_acquisition">Property Acquisition</option>
                    <option value="lease_management">Lease Management</option>
                    <option value="capex_planning">CapEx Planning</option>
                    <option value="asset_disposal">Asset Disposal</option>
                    <option value="portfolio_management">Portfolio Management</option>
                    <option value="property_management">Property Management</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="howDidYouHear" className="block text-sm font-medium text-gray-700 mb-1">
                    How did you hear about us?
                  </label>
                  <select
                    id="howDidYouHear"
                    value={howDidYouHear}
                    onChange={(e) => setHowDidYouHear(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  >
                    <option value="">Select source</option>
                    <option value="social_media">Social Media</option>
                    <option value="google_search">Google Search</option>
                    <option value="referral">Referral</option>
                    <option value="industry_event">Industry Event</option>
                    <option value="newsletter">Newsletter</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsWaitlistMode(false)}
                    className="flex-1 bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="flex-1 bg-orange-500 text-white py-3 px-4 rounded-xl font-semibold hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isLoading ? 'Joining...' : 'Join Waitlist'}
                  </button>
                </div>
              </form>
            )}

            {/* Footer */}
            <div className="mt-6 text-center text-sm text-gray-500">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </div>
          </>
        )}
      </div>
    </div>
  );
};
