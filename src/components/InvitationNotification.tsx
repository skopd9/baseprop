import React, { useState, useEffect } from 'react';
import { 
  EnvelopeIcon, 
  XMarkIcon,
  CheckIcon,
  XCircleIcon
} from '@heroicons/react/24/outline';
import { OrganizationService, OrganizationInvitation } from '../services/OrganizationService';
import { supabase } from '../lib/supabase';
import { AcceptInvite } from './AcceptInvite';

interface InvitationNotificationProps {
  userEmail: string;
  onInvitationAccepted?: () => void;
}

export const InvitationNotification: React.FC<InvitationNotificationProps> = ({
  userEmail,
  onInvitationAccepted
}) => {
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dismissedInvitations, setDismissedInvitations] = useState<Set<string>>(new Set());
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<OrganizationInvitation | null>(null);

  useEffect(() => {
    if (userEmail) {
      loadInvitations();
      // Refresh invitations every 30 seconds
      const interval = setInterval(loadInvitations, 30000);
      return () => clearInterval(interval);
    }
  }, [userEmail]);

  const loadInvitations = async () => {
    if (!userEmail) return;
    
    try {
      setIsLoading(true);
      const pendingInvitations = await OrganizationService.getUserPendingInvitations(userEmail);
      
      // Filter out dismissed invitations
      const visibleInvitations = pendingInvitations.filter(
        inv => !dismissedInvitations.has(inv.id)
      );
      
      setInvitations(visibleInvitations);
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptClick = (invitation: OrganizationInvitation) => {
    setSelectedInvitation(invitation);
    setShowAcceptModal(true);
  };

  const handleDismiss = (invitationId: string) => {
    setDismissedInvitations(prev => new Set([...prev, invitationId]));
    setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
  };

  const handleInvitationAccepted = (organizationName: string, role: 'owner' | 'member') => {
    setShowAcceptModal(false);
    setSelectedInvitation(null);
    // Reload invitations to remove the accepted one
    loadInvitations();
    if (onInvitationAccepted) {
      onInvitationAccepted();
    }
  };

  const handleInvitationError = (message: string) => {
    console.error('Invitation error:', message);
    // Don't close modal on error, let user try again
  };

  // Don't show anything if no invitations or still loading
  if (isLoading || invitations.length === 0) {
    return null;
  }

  return (
    <>
      <div className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-green-600 to-green-700 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-3">
            {invitations.length === 1 ? (
              // Single invitation - simpler layout
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <EnvelopeIcon className="h-5 w-5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      You've been invited to join <span className="font-semibold">{invitations[0].organization_name || 'a workspace'}</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleAcceptClick(invitations[0])}
                    className="flex items-center space-x-1.5 bg-white text-green-600 px-4 py-2 rounded-md text-sm font-semibold hover:bg-green-50 transition-colors shadow-sm"
                  >
                    <CheckIcon className="h-4 w-4" />
                    <span>Accept Invitation</span>
                  </button>
                  <button
                    onClick={() => handleDismiss(invitations[0].id)}
                    className="text-white/80 hover:text-white transition-colors p-1"
                    aria-label="Dismiss"
                  >
                    <XMarkIcon className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ) : (
              // Multiple invitations - more compact layout
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <EnvelopeIcon className="h-5 w-5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">
                      You have <span className="font-semibold">{invitations.length} pending workspace invitations</span>
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 flex-wrap">
                  {invitations.slice(0, 3).map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex items-center space-x-2 bg-white/20 rounded-lg px-3 py-1.5"
                    >
                      <span className="text-xs font-medium truncate max-w-[120px] sm:max-w-[200px]">
                        {invitation.organization_name || 'Workspace'}
                      </span>
                      <button
                        onClick={() => handleAcceptClick(invitation)}
                        className="flex items-center space-x-1 bg-white text-green-600 px-2 py-1 rounded text-xs font-semibold hover:bg-green-50 transition-colors"
                      >
                        <CheckIcon className="h-3 w-3" />
                        <span className="hidden sm:inline">Accept</span>
                      </button>
                      <button
                        onClick={() => handleDismiss(invitation.id)}
                        className="text-white/80 hover:text-white transition-colors"
                        aria-label="Dismiss"
                      >
                        <XMarkIcon className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  {invitations.length > 3 && (
                    <span className="text-xs text-white/80">
                      +{invitations.length - 3} more
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Accept Invitation Modal */}
      {showAcceptModal && selectedInvitation && (
        <AcceptInvite
          token={selectedInvitation.token}
          onSuccess={handleInvitationAccepted}
          onError={handleInvitationError}
        />
      )}
    </>
  );
};

