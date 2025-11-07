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
  const [showNameForm, setShowNameForm] = useState(false);
  const [fullName, setFullName] = useState('');
  const [showEmailSent, setShowEmailSent] = useState(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    loadInvitation();
  }, [token]);

  const checkIfAccountExists = async (email: string): Promise<boolean> => {
    try {
      // Call serverless function to check if account exists
      const response = await fetch('/.netlify/functions/check-user-exists', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });

      if (!response.ok) {
        console.error('[Invite Flow] Error checking account existence:', response.statusText);
        // If check fails, assume user doesn't exist (safer to proceed with signup)
        return false;
      }

      const result = await response.json();
      return result.exists || false;
    } catch (error) {
      console.error('[Invite Flow] Exception checking account existence:', error);
      // If check fails, assume user doesn't exist (safer to proceed with signup)
      return false;
    }
  };

  const formatExpirationDate = (expiresAt?: string): string => {
    if (!expiresAt) return 'soon';
    
    const date = new Date(expiresAt);
    const now = new Date();
    const daysLeft = Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysLeft < 0) return 'expired';
    if (daysLeft === 0) return 'today';
    if (daysLeft === 1) return 'tomorrow';
    return `in ${daysLeft} days`;
  };

  const loadInvitation = async () => {
    setIsLoading(true);
    setError('');

    try {
      const invite = await OrganizationService.getInvitationByToken(token);
      
      console.log('[Invite Flow] Loaded invitation:', invite);
      
      if (!invite) {
        setError('This invitation is invalid or has expired.');
      } else {
        setInvitation(invite);
        
        // Check if user is authenticated and has a pending name from before auth
        const { data: { user } } = await supabase.auth.getUser();
        const storedName = localStorage.getItem('pendingInviteName');
        
        if (user && storedName) {
          // User authenticated after entering their name - auto-accept invitation
          console.log('[Invite Flow] User authenticated with pending name, auto-accepting invitation');
          setIsLoading(false);
          await acceptInvitationWithName(storedName);
          return;
        }
      }
    } catch (err: any) {
      console.error('Error loading invitation:', err);
      setError('Failed to load invitation details.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptClick = async () => {
    if (!invitation) return;

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      
      console.log('[Invite Flow] handleAcceptClick - User:', user?.id, user?.email);
      
      if (!user) {
        // User not authenticated - check if their account exists
        console.log('[Invite Flow] User not authenticated, checking if account exists for:', invitation.email);
        const accountExists = await checkIfAccountExists(invitation.email);
        
        if (accountExists) {
          // Existing user - show login prompt instead of magic link
          console.log('[Invite Flow] Account exists, showing login prompt');
          setShowLoginPrompt(true);
        } else {
          // New user - show name collection form for sign-up
          console.log('[Invite Flow] New user, showing name form');
          setShowNameForm(true);
          setFullName('');
        }
        return;
      }

      // First, check if user is already a member of this organization
      const isAlreadyMember = await OrganizationService.isUserMember(
        invitation.organization_id,
        user.id
      );

      if (isAlreadyMember) {
        // User is already a member - accept invitation immediately without asking for name
        console.log('[Invite Flow] User is already a member, accepting invitation directly');
        await acceptInvitationWithName(''); // Empty name is fine, will use existing profile
        return;
      }

      // Check if user has a name set
      console.log('[Invite Flow] Checking user profile for existing name...');
      const { data: profileData, error: profileError } = await supabase
        .from('user_profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      if (profileError) {
        console.error('[Invite Flow] Error fetching profile:', profileError);
        // Profile might not exist yet - treat as no name
        console.log('[Invite Flow] No profile found, showing name form');
        setShowNameForm(true);
        setFullName(user.email?.split('@')[0] || '');
        return;
      }

      console.log('[Invite Flow] Profile data:', profileData);

      // If user doesn't have a name or it's just their email prefix, ask for their name
      const emailPrefix = user.email?.split('@')[0] || '';
      const hasValidName = profileData?.full_name && 
                          profileData.full_name.trim() !== '' && 
                          profileData.full_name !== emailPrefix;

      console.log('[Invite Flow] Name validation:', {
        fullName: profileData?.full_name,
        emailPrefix,
        hasValidName
      });

      if (!hasValidName) {
        // Show name collection form
        console.log('[Invite Flow] No valid name, showing name form');
        setShowNameForm(true);
        setFullName(profileData?.full_name || emailPrefix || '');
      } else {
        // User has a valid name, proceed directly
        console.log('[Invite Flow] Valid name found, accepting invitation directly with name:', profileData.full_name);
        await acceptInvitationWithName(profileData.full_name);
      }
    } catch (err: any) {
      console.error('[Invite Flow] Error in handleAcceptClick:', err);
      setError(err.message || 'Failed to process invitation.');
    }
  };

  const acceptInvitationWithName = async (name: string) => {
    if (!invitation) return;
    
    // Only require name if user is not authenticated (new user signup)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user && !name.trim()) {
      setError('Please enter your full name');
      return;
    }

    setIsAccepting(true);
    setError('');

    try {
      // Get current user
      let { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // User not authenticated - check if user exists and handle accordingly
        console.log('[Invite Flow] User not authenticated, checking if account exists:', invitation.email);
        
        try {
          // Call our serverless function to either create account or check if user exists
          const response = await fetch('/.netlify/functions/accept-invitation-signup', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              email: invitation.email,
              name: name.trim(),
              invitationToken: token
            })
          });

          const result = await response.json();

          // Check if user already exists (before treating as error)
          if (result.userExists) {
            // Existing user - send magic link directly
            console.log('[Invite Flow] Existing user detected, sending magic link to:', invitation.email);
            try {
              const { auth } = await import('../lib/supabase');
              const { error: magicLinkError } = await auth.signInWithMagicLink(invitation.email);
              
              if (magicLinkError) {
                console.error('[Invite Flow] Magic link error:', magicLinkError);
                
                // Handle rate limit error specifically
                if (magicLinkError.message?.includes('rate limit') || magicLinkError.message?.includes('429')) {
                  setError(`Too many emails sent. Please wait a few minutes and try again, or sign in manually at the login page, then click the invitation link again.`);
                } else {
                  setError(`Failed to send magic link: ${magicLinkError.message}. Please sign in manually first, then click the invitation link again.`);
                }
                setIsAccepting(false);
                return;
              }
              
              console.log('[Invite Flow] Magic link sent successfully');
              setError('');
              setIsAccepting(false);
              setShowEmailSent(true);
              setShowNameForm(false);
              localStorage.setItem('pendingInviteName', name.trim());
              return;
            } catch (magicLinkError: any) {
              console.error('[Invite Flow] Exception sending magic link:', magicLinkError);
              
              // Handle rate limit error specifically
              if (magicLinkError.message?.includes('rate limit') || magicLinkError.message?.includes('429')) {
                setError(`Too many emails sent. Please wait a few minutes and try again, or sign in manually at the login page, then click the invitation link again.`);
              } else {
                setError(`Unable to send magic link. Please try logging in manually first, then click the invitation link again.`);
              }
              setIsAccepting(false);
              return;
            }
          }

          // If response not ok and user doesn't exist, it's a real error
          if (!response.ok) {
            throw new Error(result.error || 'Failed to create account');
          }

          // New user created successfully - set the session
          console.log('[Invite Flow] New user created, setting session');
          // Set the session returned from the serverless function
          console.log('[Invite Flow] Setting session from serverless function');
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: result.session.access_token,
            refresh_token: result.session.refresh_token
          });

          if (sessionError) {
            throw new Error('Failed to authenticate: ' + sessionError.message);
          }

          // Get the newly authenticated user
          const { data: { user: newUser } } = await supabase.auth.getUser();
          if (!newUser) {
            throw new Error('Failed to get authenticated user');
          }

          user = newUser;
          console.log('[Invite Flow] User account created and authenticated:', user.id);
          
        } catch (createError: any) {
          console.error('[Invite Flow] Error creating account:', createError);
          console.error('[Invite Flow] Error details:', createError.message);
          
          // Show user-friendly error instead of fallback
          setError('Unable to auto-create account. The serverless function may not be deployed yet. Please check the setup guide.');
          setIsAccepting(false);
          return;
        }
      }

      // User is authenticated - accept invitation with the provided name
      // Check if there's a stored name from before authentication
      const storedName = localStorage.getItem('pendingInviteName');
      let nameToUse = storedName || name.trim();
      
      // If no name provided and user is authenticated, try to get their existing name
      if (!nameToUse && user) {
        const { data: profileData } = await supabase
          .from('user_profiles')
          .select('full_name')
          .eq('id', user.id)
          .single();
        
        if (profileData?.full_name && profileData.full_name.trim() !== '') {
          nameToUse = profileData.full_name;
        }
      }
      
      // Clear stored name
      if (storedName) {
        localStorage.removeItem('pendingInviteName');
      }
      
      await OrganizationService.acceptInvitation(token, user.id, nameToUse || undefined);
      
      // Success! Pass organization details for welcome tour
      onSuccess(invitation.organization_name || 'the organization', invitation.role);
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
        {showLoginPrompt ? (
          // Login prompt for existing users
          <div>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                Please Log In
              </h2>
              <p className="text-gray-600">
                You already have an account. Please log in to accept your invitation to{' '}
                <span className="font-semibold">{invitation?.organization_name}</span>
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 mb-2">
                Once logged in, you'll see this invitation in your notifications.
              </p>
              <p className="text-xs text-blue-700">
                Invitation expires: {formatExpirationDate(invitation?.expires_at)}
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  // Clear invite token from URL but keep in localStorage
                  window.history.replaceState({}, '', window.location.pathname);
                  // Trigger login by going to home page
                  window.location.href = '/';
                }}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-blue-700 transition-colors"
              >
                Go to Log In
              </button>
              <button
                onClick={() => setShowLoginPrompt(false)}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
              >
                Back
              </button>
            </div>
          </div>
        ) : showEmailSent ? (
          // Email sent confirmation
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              Check your email
            </h2>
            <p className="text-gray-600 mb-6">
              We've sent a magic link to <span className="font-semibold">{invitation?.email}</span>
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800">
                Click the link in your email to complete your invitation to <span className="font-semibold">{invitation?.organization_name}</span>
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="text-gray-600 hover:text-gray-900 text-sm"
            >
              Didn't receive the email? Click here
            </button>
          </div>
        ) : showNameForm ? (
          // Name collection form
          <div>
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                What's your name?
              </h2>
              <p className="text-gray-600">
                Help your team recognize you in <span className="font-semibold">{invitation?.organization_name}</span>
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Full Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g., John Smith"
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                maxLength={100}
                disabled={isAccepting}
                autoFocus
                onKeyPress={(e) => {
                  if (e.key === 'Enter' && fullName.trim()) {
                    acceptInvitationWithName(fullName);
                  }
                }}
              />
              <p className="text-xs text-gray-500 mt-2">
                This name will be visible to other members on the team
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => acceptInvitationWithName(fullName)}
                disabled={isAccepting || !fullName.trim()}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAccepting ? 'Accepting...' : 'Continue'}
              </button>
              <button
                onClick={() => {
                  setShowNameForm(false);
                  setFullName('');
                  setError('');
                }}
                disabled={isAccepting}
                className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Back
              </button>
            </div>
          </div>
        ) : error && !invitation ? (
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
                onClick={handleAcceptClick}
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

