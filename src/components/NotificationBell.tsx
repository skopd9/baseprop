import React, { useState, useEffect, useRef } from 'react';
import { BellIcon } from '@heroicons/react/24/outline';
import { OrganizationService, OrganizationInvitation } from '../services/OrganizationService';
import { NotificationService, PropertyNotification } from '../services/NotificationService';
import { AcceptInvite } from './AcceptInvite';
import { useOrganization } from '../contexts/OrganizationContext';

interface NotificationBellProps {
  userEmail: string;
  onInvitationAccepted?: () => void;
}

export const NotificationBell: React.FC<NotificationBellProps> = ({
  userEmail,
  onInvitationAccepted
}) => {
  const { currentOrganization } = useOrganization();
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [propertyNotifications, setPropertyNotifications] = useState<PropertyNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedInvitation, setSelectedInvitation] = useState<OrganizationInvitation | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (userEmail) {
      loadNotifications();
      // Refresh notifications every 2 minutes
      const interval = setInterval(loadNotifications, 120000);
      return () => clearInterval(interval);
    }
  }, [userEmail, currentOrganization?.id]);

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

  const loadNotifications = async () => {
    if (!userEmail) return;
    
    try {
      setIsLoading(true);
      
      // Load invitations
      const pendingInvitations = await OrganizationService.getUserPendingInvitations(userEmail);
      setInvitations(pendingInvitations);

      // Load property notifications if user has an organization
      if (currentOrganization?.id) {
        const notifications = await NotificationService.generatePropertyNotifications(
          currentOrganization.id
        );
        setPropertyNotifications(notifications);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
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
    // Reload notifications to remove the accepted one
    loadNotifications();
    if (onInvitationAccepted) {
      onInvitationAccepted();
    }
  };

  const handleInvitationError = (message: string) => {
    console.error('Invitation error:', message);
    // Don't close modal on error, let user try again
  };

  const dismissNotification = (notificationId: string) => {
    setPropertyNotifications(prev => prev.filter(n => n.id !== notificationId));
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high':
        return 'bg-red-50 border-l-4 border-red-500';
      case 'medium':
        return 'bg-yellow-50 border-l-4 border-yellow-500';
      case 'low':
        return 'bg-blue-50 border-l-4 border-blue-500';
    }
  };

  const totalNotificationCount = invitations.length + propertyNotifications.length;

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Notifications"
        >
          <BellIcon className="h-6 w-6" />
          {totalNotificationCount > 0 && (
            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-4 w-4 bg-green-500 text-white text-xs font-semibold items-center justify-center">
                {totalNotificationCount > 9 ? '9+' : totalNotificationCount}
              </span>
            </span>
          )}
        </button>

        {/* Dropdown */}
        {isOpen && (
          <div className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-lg border border-gray-200 z-50 max-h-[600px] flex flex-col">
            <div className="p-3 border-b border-gray-200">
              <h3 className="text-sm font-semibold text-gray-900">
                Notifications
                {totalNotificationCount > 0 && (
                  <span className="ml-2 text-xs font-normal text-gray-500">
                    ({totalNotificationCount})
                  </span>
                )}
              </h3>
            </div>

            <div className="overflow-y-auto flex-1">
              {isLoading ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  Loading...
                </div>
              ) : totalNotificationCount === 0 ? (
                <div className="p-8 text-center">
                  <div className="text-4xl mb-2">🎉</div>
                  <p className="text-sm text-gray-500">You're all caught up!</p>
                  <p className="text-xs text-gray-400 mt-1">No notifications at the moment</p>
                </div>
              ) : (
                <div>
                  {/* Invitations Section */}
                  {invitations.length > 0 && (
                    <div className="border-b border-gray-100">
                      <div className="px-3 py-2 bg-gray-50">
                        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                          Invitations
                        </h4>
                      </div>
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
                    </div>
                  )}

                  {/* Property Notifications Section */}
                  {propertyNotifications.length > 0 && (
                    <div>
                      <div className="px-3 py-2 bg-gray-50">
                        <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
                          Property Management
                        </h4>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {propertyNotifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`p-3 hover:bg-gray-50 transition-colors ${getPriorityColor(notification.priority)}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 mb-1">
                                  {notification.title}
                                </p>
                                <p className="text-xs text-gray-600 mb-2 leading-relaxed">
                                  {notification.message}
                                </p>
                                {notification.daysUntilDue !== undefined && (
                                  <p className="text-xs text-gray-500 mb-2">
                                    ⏰ {notification.daysUntilDue === 0 
                                      ? 'Due today' 
                                      : `${notification.daysUntilDue} day${notification.daysUntilDue !== 1 ? 's' : ''} remaining`}
                                  </p>
                                )}
                                <div className="flex items-center gap-2">
                                  {notification.actionText && (
                                    <button
                                      onClick={() => {
                                        // Handle action based on type
                                        setIsOpen(false);
                                      }}
                                      className="inline-flex items-center px-3 py-1.5 bg-gray-900 text-white text-xs font-semibold rounded-md hover:bg-gray-800 transition-colors"
                                    >
                                      {notification.actionText}
                                    </button>
                                  )}
                                  <button
                                    onClick={() => dismissNotification(notification.id)}
                                    className="inline-flex items-center px-2 py-1.5 text-gray-500 text-xs hover:text-gray-700 transition-colors"
                                  >
                                    Dismiss
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
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

