import React, { useState, useRef } from 'react';
import { auth } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Cooldown period: 60 seconds between requests for the same email
const EMAIL_COOLDOWN_MS = 60 * 1000;

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const isSubmittingRef = useRef(false);
  const lastSubmissionRef = useRef<{ email: string; timestamp: number } | null>(null);

  const resetForm = () => {
    setEmail('');
    setError('');
    setEmailSent(false);
    isSubmittingRef.current = false;
    // Note: We keep lastSubmissionRef to maintain cooldown even after modal close
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    e.stopPropagation(); // Prevent event bubbling
    
    // Prevent double submission - check ref immediately
    if (isSubmittingRef.current) {
      console.log('Submission blocked: already submitting');
      return;
    }

    // Check if we're already loading
    if (isLoading) {
      console.log('Submission blocked: already loading');
      return;
    }

    // Check cooldown period for the same email
    const now = Date.now();
    if (lastSubmissionRef.current) {
      const { email: lastEmail, timestamp } = lastSubmissionRef.current;
      const timeSinceLastSubmission = now - timestamp;
      
      if (lastEmail.toLowerCase() === email.toLowerCase() && timeSinceLastSubmission < EMAIL_COOLDOWN_MS) {
        const secondsRemaining = Math.ceil((EMAIL_COOLDOWN_MS - timeSinceLastSubmission) / 1000);
        setError(`Please wait ${secondsRemaining} second${secondsRemaining !== 1 ? 's' : ''} before requesting another magic link for this email.`);
        return;
      }
    }

    // Set submitting flag immediately (before async operations)
    isSubmittingRef.current = true;
    setIsLoading(true);
    setError('');

    try {
      const { error: authError } = await auth.signInWithMagicLink(email);
      
      if (authError) {
        throw authError;
      }

      // Record successful submission
      lastSubmissionRef.current = {
        email: email.toLowerCase(),
        timestamp: Date.now()
      };

      // Show success message
      setEmailSent(true);
    } catch (error: any) {
      console.error('Magic link error:', error);
      
      // Check for rate limit errors specifically
      // Supabase AuthApiError can have message, status, or statusCode
      const errorMessage = error.message || '';
      const errorStatus = error.status || error.statusCode;
      const isRateLimitError = 
        errorMessage.toLowerCase().includes('rate limit') ||
        errorMessage.toLowerCase().includes('429') ||
        errorMessage.toLowerCase().includes('email rate limit') ||
        errorMessage.toLowerCase().includes('too many requests') ||
        errorStatus === 429 ||
        error.code === '429';
      
      if (isRateLimitError) {
        setError('Too many emails sent. Please wait a few minutes before requesting another magic link. If you need immediate access, please contact support.');
        
        // Record the rate limit to prevent immediate retry
        lastSubmissionRef.current = {
          email: email.toLowerCase(),
          timestamp: Date.now()
        };
      } else {
        setError(errorMessage || 'Failed to send magic link. Please try again.');
      }
    } finally {
      setIsLoading(false);
      // Use setTimeout to ensure ref is reset after React's state update cycle
      setTimeout(() => {
        isSubmittingRef.current = false;
      }, 100);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 relative">
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
        >
          ×
        </button>

        {/* Success State - Email Sent */}
        {emailSent ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Check your email</h2>
            <p className="text-gray-600 mb-6">
              We've sent a magic link to <span className="font-semibold">{email}</span>
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Click the link in the email to sign in. The link will expire in 1 hour.
            </p>
            <button
              onClick={handleClose}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-green-700 transition-colors"
            >
              Got it
            </button>
            <button
              onClick={() => setEmailSent(false)}
              className="w-full text-gray-600 py-2 px-4 rounded-xl font-medium hover:text-gray-900 transition-colors mt-2"
            >
              Use a different email
            </button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Welcome to Base Prop
              </h2>
              <p className="text-gray-600">
                Sign in with your email to get started
              </p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email address
                </label>
                <input
                  type="email"
                  id="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="you@company.com"
                  required
                  disabled={isLoading}
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending magic link...' : 'Continue with Email'}
              </button>
            </form>

            {/* Info */}
            <div className="mt-6 text-center">
              <p className="text-sm text-gray-500">
                We'll send you a magic link for a password-free sign in
              </p>
            </div>

            {/* Footer */}
            <div className="mt-6 text-center text-xs text-gray-500">
              By continuing, you agree to our Terms of Service and Privacy Policy
            </div>
          </>
        )}
      </div>
    </div>
  );
};
