import React, { useState, useEffect } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { OrganizationService, OrganizationMember, OrganizationInvitation } from '../services/OrganizationService';

interface OrganizationSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

export const OrganizationSettings: React.FC<OrganizationSettingsProps> = ({ isOpen, onClose }) => {
  const { currentOrganization, currentUserRole, refreshOrganizations } = useOrganization();
  const [activeTab, setActiveTab] = useState<'members' | 'invitations'>('members');
  const [members, setMembers] = useState<OrganizationMember[]>([]);
  const [invitations, setInvitations] = useState<OrganizationInvitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Invite form
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'owner' | 'member'>('member');
  const [isInviting, setIsInviting] = useState(false);
  const [cancelingInvitationId, setCancelingInvitationId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentOrganization) {
      loadData();
    }
  }, [isOpen, currentOrganization]);

  const loadData = async () => {
    if (!currentOrganization) return;

    setIsLoading(true);
    setError('');

    try {
      const [membersData, invitationsData] = await Promise.all([
        OrganizationService.getOrganizationMembers(currentOrganization.id),
        OrganizationService.getOrganizationInvitations(currentOrganization.id)
      ]);

      setMembers(membersData);
      setInvitations(invitationsData);
    } catch (err: any) {
      console.error('Error loading organization data:', err);
      setError(err.message || 'Failed to load organization data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;

    setIsInviting(true);
    setError('');
    setSuccess('');

    try {
      await OrganizationService.inviteUser(
        currentOrganization.id,
        inviteEmail,
        inviteRole,
        currentOrganization.created_by
      );

      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('member');
      
      // Reload invitations
      await loadData();
    } catch (err: any) {
      console.error('Error inviting user:', err);
      setError(err.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from this organization?`)) {
      return;
    }

    try {
      await OrganizationService.removeOrganizationMember(currentOrganization!.id, memberId);
      setSuccess(`${userName} has been removed`);
      await loadData();
    } catch (err: any) {
      console.error('Error removing member:', err);
      setError(err.message || 'Failed to remove member');
    }
  };

  const handleCancelInvitation = async (invitationId: string, email: string) => {
    if (!confirm(`Are you sure you want to cancel the invitation for ${email}?`)) {
      return;
    }

    setCancelingInvitationId(invitationId);
    setError('');
    setSuccess('');

    try {
      await OrganizationService.cancelInvitation(invitationId);
      setSuccess(`Invitation for ${email} has been canceled`);
      await loadData();
    } catch (err: any) {
      console.error('Error canceling invitation:', err);
      setError(err.message || 'Failed to cancel invitation');
    } finally {
      setCancelingInvitationId(null);
    }
  };

  if (!isOpen) return null;

  const isOwner = currentUserRole === 'owner';

  // DEBUG: Log role information
  console.log('OrganizationSettings Debug:', {
    currentUserRole,
    isOwner,
    currentOrganization: currentOrganization?.name
  });

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Organization Settings</h2>
              <p className="text-gray-600 mt-1">{currentOrganization?.name}</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-4 mt-6">
            <button
              onClick={() => setActiveTab('members')}
              className={`pb-2 px-1 font-medium transition-colors ${
                activeTab === 'members'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Members ({members.length})
            </button>
            <button
              onClick={() => setActiveTab('invitations')}
              className={`pb-2 px-1 font-medium transition-colors ${
                activeTab === 'invitations'
                  ? 'text-green-600 border-b-2 border-green-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Pending Invitations ({invitations.length})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Messages */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
              <p className="text-green-600 text-sm">{success}</p>
            </div>
          )}

          {/* Invite Form (for owners only) */}
          {activeTab === 'members' && (
            isOwner ? (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-5 mb-6 border-2 border-green-200">
                <div className="flex items-center gap-2 mb-3">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                  </svg>
                  <h3 className="font-bold text-gray-900">Invite Team Member</h3>
                </div>
                <form onSubmit={handleInvite} className="space-y-3">
                  <div className="flex gap-3">
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      placeholder="colleague@example.com"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      required
                      disabled={isInviting}
                    />
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as 'owner' | 'member')}
                      className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                      disabled={isInviting}
                    >
                      <option value="member">Member</option>
                      <option value="owner">Owner</option>
                    </select>
                    <button
                      type="submit"
                      disabled={isInviting}
                      className="px-6 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                    >
                      {isInviting ? 'Inviting...' : 'Invite'}
                    </button>
                  </div>
                  <p className="text-xs text-gray-600">
                    <strong>Member:</strong> Can view and edit properties. <strong>Owner:</strong> Can also invite/remove members.
                  </p>
                </form>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> Only organization owners can invite new members. Your current role: <strong>{currentUserRole || 'Unknown'}</strong>
                </p>
              </div>
            )
          )}

          {/* Loading */}
          {isLoading && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
              <p className="text-gray-600">Loading...</p>
            </div>
          )}

          {/* Members Tab */}
          {!isLoading && activeTab === 'members' && (
            <div className="space-y-3">
              {members.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No members yet</p>
              ) : (
                members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-semibold">
                          {member.user_name?.charAt(0).toUpperCase() || member.user_email?.charAt(0).toUpperCase() || '?'}
                        </span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">
                          {member.user_name || 'Unnamed User'}
                        </div>
                        <div className="text-sm text-gray-600">{member.user_email || 'No email'}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        member.role === 'owner'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {member.role === 'owner' ? 'Owner' : 'Member'}
                      </span>
                      {isOwner && member.role !== 'owner' && (
                        <button
                          onClick={() => handleRemoveMember(member.user_id, member.user_name || member.user_email || 'this user')}
                          className="text-red-600 hover:text-red-700 text-sm font-medium"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Invitations Tab */}
          {!isLoading && activeTab === 'invitations' && (
            <div className="space-y-3">
              {invitations.length === 0 ? (
                <p className="text-gray-600 text-center py-8">No pending invitations</p>
              ) : (
                invitations.map((invitation) => (
                  <div
                    key={invitation.id}
                    className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{invitation.email}</div>
                      <div className="text-sm text-gray-600">
                        Invited {new Date(invitation.created_at).toLocaleDateString()} • 
                        Expires {new Date(invitation.expires_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                        invitation.role === 'owner'
                          ? 'bg-purple-100 text-purple-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {invitation.role === 'owner' ? 'Owner' : 'Member'}
                      </span>
                      {isOwner && (
                        <button
                          onClick={() => handleCancelInvitation(invitation.id, invitation.email)}
                          disabled={cancelingInvitationId === invitation.id}
                          className="text-red-600 hover:text-red-700 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {cancelingInvitationId === invitation.id ? 'Canceling...' : 'Cancel'}
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="w-full bg-gray-100 text-gray-700 py-3 px-4 rounded-xl font-semibold hover:bg-gray-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

