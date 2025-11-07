import React, { useState, useEffect, useRef } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { OrganizationService, OrganizationInvitation } from '../services/OrganizationService';
import { AcceptInvite } from './AcceptInvite';

interface NotificationBellProps {
  userEmail: string;
  onInvitationAccepted?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  userEmail,
  onInvitationAccepted
}) => {
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<OrganizationInvitation | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userEmail) {
      loadInvitations();
      // Refresh invitations every 30 seconds
      const interval = setInterval(loadInvitations, 30000);
      return () => clearInterval(interval);
    }
  }, [userEmail]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const loadInvitations = async () => {
    if (!userEmail) return;
    
    try {
      setIsLoading(true);
      const pendingInvitations = await OrganizationService.getUserPendingInvitations(userEmail);
      setInvitations(pendingInvitations);
    } catch (error) {
      console.error('Error loading invitations:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptClick = (invitation: OrganizationInvitation) => {
    setSelectedInvitation(invitation);
    setShowAcceptModal(true);
    setIsOpen(false);
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

  const invitationCount = invitations.length;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Notifications"
        >
          <BellIcon className="h-6 w-6" />
          {invitationCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 text-white text-xs font-semibold items-center justify-center">
                {invitationCount}
              </span>
            </span>
          )}
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">
                Notifications
              </h3>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  Loading...
                </div>
              ) : invitationCount === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No pending invitations
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="p-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 mb-1">
                            Workspace Invitation
                          </p>
                          <p className="text-xs text-gray-600 mb-2">
                            Join <span className="font-semibold">{invitation.organization_name || 'workspace'}</span> as {invitation.role}
                          </p>
                          <button
                            onClick={() => handleAcceptClick(invitation)}
                            className="inline-flex items-center px-3 py-1.5 bg-green-600 text-white text-xs font-semibold rounded-md hover:bg-green-700 transition-colors"
                          >
                            Accept Invitation
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
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

