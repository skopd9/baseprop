import React, { useState, useEffect } from 'react';
import { OrganizationService, OrganizationInvitation } from '../services/OrganizationService';
import { supabase } from '../lib/supabase';

interface AcceptInviteProps {
  token: string;
  onSuccess: (organizationName: string, role: 'owner' | 'member') => void;
  onError: (message: string) => void;
}

export const AcceptInvite: React.FC<AcceptInviteProps> = ({ token, onSuccess, onError }) => {
  const [invitation, setInvitation] = useState<OrganizationInvitation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInvitation();
  }, [token]);

  const loadInvitation = async () => {
    setIsLoading(true);
    setError('');

    try {
      const invite = await OrganizationService.getInvitationByToken(token);
      
      if (!invite) {
        setError('This invitation is invalid or has expired.');
      } else {
        setInvitation(invite);
      }
    } catch (err: any) {
      console.error('Error loading invitation:', err);
      setError('Failed to load invitation details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccept = async () => {
    if (!invitation) return;

    setIsAccepting(true);
    setError('');

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('You must be signed in to accept an invitation.');
        setIsAccepting(false);
        return;
      }

      // Accept invitation
      await OrganizationService.acceptInvitation(token, user.id);
      
      // Success! Pass organization details for welcome tour
      onSuccess(invitation.organization_name, invitation.role);
    } catch (err: any) {
      console.error('Error accepting invitation:', err);
      setError(err.message || 'Failed to accept invitation.');
    } finally {
      setIsAccepting(false);
    }
  };

  const handleDecline = () => {
    // Clear token from URL and close
    window.history.replaceState({}, '', window.location.pathname);
    onError('Invitation declined');
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
        <div className="bg-white rounded-2xl max-w-md w-full p-8 text-center">
          <div className="w-12 h-12 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading invitation...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-8">
        {error && !invitation ? (
          // Error state
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Invalid Invitation</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={handleDecline}
              className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        ) : invitation ? (
          // Valid invitation
          <div>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                You've been invited!
              </h2>
              <p className="text-gray-600">
                Join <span className="font-semibold">{invitation.organization_name}</span> as a {invitation.role}
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <div className="text-sm text-gray-600 space-y-2">
                <div className="flex justify-between">
                  <span>Organization:</span>
                  <span className="font-medium text-gray-900">{invitation.organization_name}</span>
                </div>
                <div className="flex justify-between">
                  <span>Role:</span>
                  <span className="font-medium text-gray-900 capitalize">{invitation.role}</span>
                </div>
                <div className="flex justify-between">
                  <span>Invited to:</span>
                  <span className="font-medium text-gray-900">{invitation.email}</span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleAccept}
                disabled={isAccepting}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAccepting ? 'Accepting...' : 'Accept Invitation'}
              </button>
              <button
                onClick={handleDecline}
                disabled={isAccepting}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Decline
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

