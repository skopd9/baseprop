import React, { useState, useEffect } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { OrganizationService, OrganizationMember, OrganizationInvitation } from '../services/OrganizationService';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';
import { supabase } from '../lib/supabase';

interface WorkspaceSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = 'settings' | 'members' | 'invitations';

export const WorkspaceSettings: React.FC<WorkspaceSettingsProps> = ({ isOpen, onClose }) => {
  const { currentOrganization, currentUserRole, refreshOrganizations, switchOrganization, userOrganizations } = useOrganization();
  const [activeTab, setActiveTab] = useState<TabType>('settings');
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

  // Settings form
  const [workspaceName, setWorkspaceName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [isRenaming, setIsRenaming] = useState(false);
  const [country, setCountry] = useState('UK');
  const [currency, setCurrency] = useState('GBP');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // Delete workspace
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmName, setDeleteConfirmName] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  // Role management
  const [changingRoleFor, setChangingRoleFor] = useState<string | null>(null);
  const [transferringOwnershipTo, setTransferringOwnershipTo] = useState<string | null>(null);

  // Create workspace modal
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);

  // Current user ID
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentOrganization) {
      setSuccess('');
      setError('');
      loadData();
      loadSettings();
    }
  }, [isOpen, currentOrganization]);

  // Refresh data when switching tabs
  useEffect(() => {
    if (isOpen && currentOrganization && !isLoading && (activeTab === 'members' || activeTab === 'invitations')) {
      loadData();
    }
  }, [activeTab]);

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
      console.error('Error loading workspace data:', err);
      setError(err.message || 'Failed to load workspace data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSettings = () => {
    if (!currentOrganization) return;
    setWorkspaceName(currentOrganization.name);
    // Country is now from country_code column (immutable)
    const orgCountry = currentOrganization.country_code || currentOrganization.settings?.country || 'UK';
    setCountry(orgCountry);
    setCurrency(currentOrganization.settings?.default_currency || (orgCountry === 'UK' ? 'GBP' : orgCountry === 'GR' ? 'EUR' : 'USD'));
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrganization) return;

    setIsInviting(true);
    setError('');
    setSuccess('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      await OrganizationService.inviteUser(
        currentOrganization.id,
        inviteEmail,
        inviteRole,
        user.id
      );

      setSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail('');
      setInviteRole('member');
      
      await loadData();
    } catch (err: any) {
      console.error('Error inviting user:', err);
      setError(err.message || 'Failed to send invitation');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string, userName: string) => {
    if (!confirm(`Are you sure you want to remove ${userName} from this workspace?`)) {
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

  const handleRenameWorkspace = async () => {
    if (!currentOrganization || !workspaceName.trim()) return;

    setIsRenaming(true);
    setError('');
    setSuccess('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      await OrganizationService.updateOrganizationName(currentOrganization.id, workspaceName.trim(), user.id);
      setSuccess('Workspace name updated');
      setIsEditingName(false);
      await refreshOrganizations();
    } catch (err: any) {
      console.error('Error renaming workspace:', err);
      setError(err.message || 'Failed to rename workspace');
    } finally {
      setIsRenaming(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!currentOrganization) return;

    setIsSavingSettings(true);
    setError('');
    setSuccess('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Only save currency (country is immutable)
      await OrganizationService.updateOrganizationSettings(
        currentOrganization.id,
        {
          default_currency: currency
        },
        user.id
      );

      setSuccess('Workspace settings updated');
      await refreshOrganizations();
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message || 'Failed to save settings');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleDeleteWorkspace = async () => {
    if (!currentOrganization) return;
    if (deleteConfirmName !== currentOrganization.name) {
      setError('Workspace name does not match');
      return;
    }

    setIsDeleting(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      await OrganizationService.deleteOrganization(currentOrganization.id, user.id);
      
      // Switch to another workspace if available
      const remainingOrgs = userOrganizations.filter(o => o.id !== currentOrganization.id);
      if (remainingOrgs.length > 0) {
        await switchOrganization(remainingOrgs[0].id);
      }

      setShowDeleteConfirm(false);
      setDeleteConfirmName('');
      onClose();
      await refreshOrganizations();
    } catch (err: any) {
      console.error('Error deleting workspace:', err);
      setError(err.message || 'Failed to delete workspace');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: 'owner' | 'member') => {
    if (!currentOrganization) return;

    setChangingRoleFor(memberId);
    setError('');
    setSuccess('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      await OrganizationService.updateMemberRole(currentOrganization.id, memberId, newRole, user.id);
      await loadData();
      await refreshOrganizations();
    } catch (err: any) {
      console.error('Error changing role:', err);
      setError(err.message || 'Failed to change role');
    } finally {
      setChangingRoleFor(null);
    }
  };

  const handleTransferOwnership = async (newOwnerId: string) => {
    if (!currentOrganization) return;
    if (!confirm('Are you sure you want to transfer ownership? You will become a member.')) {
      return;
    }

    setTransferringOwnershipTo(newOwnerId);
    setError('');
    setSuccess('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      await OrganizationService.transferOwnership(currentOrganization.id, newOwnerId, user.id);
      setSuccess('Ownership transferred successfully');
      await loadData();
      await refreshOrganizations();
    } catch (err: any) {
      console.error('Error transferring ownership:', err);
      setError(err.message || 'Failed to transfer ownership');
    } finally {
      setTransferringOwnershipTo(null);
    }
  };

  useEffect(() => {
    const getCurrentUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };
    if (isOpen) {
      getCurrentUser();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const isOwner = currentUserRole === 'owner';

  return (
    <>
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50"
        onClick={onClose}
      >
        <div 
          className="bg-white rounded-lg sm:rounded-2xl w-full max-w-3xl max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-4 sm:p-6 border-b border-gray-200">
            <div className="flex items-start sm:items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 truncate">Workspace Settings</h2>
                <p className="text-sm sm:text-base text-gray-600 mt-1 truncate">{currentOrganization?.name}</p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowCreateWorkspace(true)}
                  className="px-3 py-1.5 text-xs sm:text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors whitespace-nowrap"
                >
                  + New Workspace
                </button>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 text-2xl flex-shrink-0 -mt-1 sm:mt-0"
                >
                  ×
                </button>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex flex-col sm:flex-row justify-between sm:items-center mt-4 sm:mt-6 gap-3 sm:gap-0">
              <div className="flex gap-3 sm:gap-4 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('settings')}
                  className={`pb-2 px-1 text-sm sm:text-base font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'settings'
                      ? 'text-green-600 border-b-2 border-green-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Settings
                </button>
                <button
                  onClick={() => setActiveTab('members')}
                  className={`pb-2 px-1 text-sm sm:text-base font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'members'
                      ? 'text-green-600 border-b-2 border-green-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Members ({members.length})
                </button>
                <button
                  onClick={() => setActiveTab('invitations')}
                  className={`pb-2 px-1 text-sm sm:text-base font-medium transition-colors whitespace-nowrap ${
                    activeTab === 'invitations'
                      ? 'text-green-600 border-b-2 border-green-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Invitations ({invitations.length})
                </button>
              </div>
              {(activeTab === 'members' || activeTab === 'invitations') && (
                <button
                  onClick={loadData}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-2 px-3 py-1.5 text-xs sm:text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                  title="Refresh members and invitations"
                >
                  <svg 
                    className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  {isLoading ? 'Refreshing...' : 'Refresh'}
                </button>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            {/* Messages */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3 mb-4">
                <p className="text-red-600 text-xs sm:text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-2 sm:p-3 mb-4">
                <p className="text-green-600 text-xs sm:text-sm">{success}</p>
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === 'settings' && (
              <div className="space-y-6">
                {/* Workspace Name */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Workspace Name
                  </label>
                  {isEditingName ? (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={workspaceName}
                        onChange={(e) => setWorkspaceName(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={isRenaming}
                        autoFocus
                      />
                      <button
                        onClick={handleRenameWorkspace}
                        disabled={isRenaming || !workspaceName.trim()}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm"
                      >
                        {isRenaming ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => {
                          setIsEditingName(false);
                          setWorkspaceName(currentOrganization?.name || '');
                        }}
                        disabled={isRenaming}
                        className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="flex-1 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900">
                        {currentOrganization?.name}
                      </p>
                      {isOwner && (
                        <button
                          onClick={() => setIsEditingName(true)}
                          className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                      )}
                    </div>
                  )}
                </div>

                {/* Country - Read Only after creation */}
                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                    Workspace Country
                  </label>
                  <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 flex items-center gap-2">
                    <span className="text-2xl">
                      {currentOrganization?.country_code === 'UK' ? '🇬🇧' : 
                       currentOrganization?.country_code === 'US' ? '🇺🇸' : 
                       currentOrganization?.country_code === 'GR' ? '🇬🇷' : '🌍'}
                    </span>
                    <span className="font-medium">
                      {currentOrganization?.country_code === 'UK' ? 'United Kingdom' : 
                       currentOrganization?.country_code === 'US' ? 'United States' : 
                       currentOrganization?.country_code === 'GR' ? 'Greece' : 
                       'Not Set'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    <svg className="w-4 h-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    Workspace country cannot be changed after creation. All properties must be in the same country as the workspace.
                  </p>
                </div>

                {/* Currency - Read Only (set by country) */}
                <div>
                  <label htmlFor="currency" className="block text-sm font-medium text-gray-700 mb-2">
                    Default Currency
                  </label>
                  <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-gray-900 flex items-center gap-2">
                    <span className="font-medium">
                      {currency === 'GBP' ? 'GBP (£)' : 
                       currency === 'EUR' ? 'EUR (€)' : 
                       currency === 'USD' ? 'USD ($)' : 
                       currency}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Currency is automatically set based on workspace country
                  </p>
                </div>

                {/* Danger Zone */}
                {isOwner && (
                  <div className="pt-6 border-t border-gray-200">
                    <h3 className="text-lg font-medium text-red-600 mb-4">Danger Zone</h3>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
                    >
                      Delete Workspace
                    </button>
                    <p className="mt-2 text-xs text-gray-500">
                      This will permanently delete this workspace and all associated data. This action cannot be undone.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* Invite Form (for owners only) */}
            {activeTab === 'members' && (
              isOwner ? (
                <div className="bg-gradient-to-r from-green-50 to-blue-50 rounded-lg p-4 sm:p-5 mb-4 sm:mb-6 border-2 border-green-200">
                  <div className="flex items-center gap-2 mb-3">
                    <svg className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    <h3 className="text-sm sm:text-base font-bold text-gray-900">Invite Team Member</h3>
                  </div>
                  <form onSubmit={handleInvite} className="space-y-3">
                    <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                      <input
                        type="email"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        placeholder="colleague@example.com"
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                        required
                        disabled={isInviting}
                      />
                      <select
                        value={inviteRole}
                        onChange={(e) => setInviteRole(e.target.value as 'owner' | 'member')}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                        disabled={isInviting}
                      >
                        <option value="member">Member</option>
                        <option value="owner">Owner</option>
                      </select>
                      <button
                        type="submit"
                        disabled={isInviting}
                        className="px-4 sm:px-6 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm whitespace-nowrap"
                      >
                        {isInviting ? 'Inviting...' : 'Invite'}
                      </button>
                    </div>
                    <p className="text-xs text-gray-600">
                      <strong>Member:</strong> Can view and edit properties. <strong>Owner:</strong> Can also invite/remove members and manage workspace settings.
                    </p>
                  </form>
                </div>
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 sm:p-4 mb-4 sm:mb-6">
                  <p className="text-xs sm:text-sm text-yellow-800">
                    <strong>Note:</strong> Only workspace owners can invite new members. Your current role: <strong>{currentUserRole || 'Unknown'}</strong>
                  </p>
                </div>
              )
            )}

            {/* Loading */}
            {isLoading && (activeTab === 'members' || activeTab === 'invitations') && (
              <div className="text-center py-6 sm:py-8">
                <div className="w-6 h-6 sm:w-8 sm:h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                <p className="text-sm text-gray-600">Loading...</p>
              </div>
            )}

            {/* Members Tab */}
            {!isLoading && activeTab === 'members' && (
              <div className="space-y-2 sm:space-y-3">
                {members.length === 0 ? (
                  <p className="text-sm text-gray-600 text-center py-6 sm:py-8">No members yet</p>
                ) : (
                  members.map((member) => {
                    const joinedAt = new Date(member.joined_at || member.invited_at);
                    const now = new Date();
                    const hoursSinceJoined = (now.getTime() - joinedAt.getTime()) / (1000 * 60 * 60);
                    const isNewMember = hoursSinceJoined < 24;
                    const isCurrentUser = member.user_id === currentUserId;

                    return (
                      <div
                        key={member.id}
                        className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border rounded-lg hover:border-gray-300 transition-colors ${
                          isNewMember ? 'border-green-300 bg-green-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-green-600 font-semibold text-sm sm:text-base">
                              {member.user_name?.charAt(0).toUpperCase() || member.user_email?.charAt(0).toUpperCase() || '?'}
                            </span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm sm:text-base font-medium text-gray-900 truncate">
                                {member.user_name || 'Unnamed User'}
                                {isCurrentUser && <span className="text-gray-500 ml-1">(You)</span>}
                              </span>
                              {isNewMember && (
                                <span className="px-2 py-0.5 bg-green-600 text-white text-xs font-semibold rounded-full whitespace-nowrap">
                                  NEW
                                </span>
                              )}
                            </div>
                            <div className="text-xs sm:text-sm text-gray-600 truncate">{member.user_email || 'No email'}</div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                          {isOwner && !isCurrentUser && (
                            <select
                              value={member.role}
                              onChange={(e) => handleChangeRole(member.user_id, e.target.value as 'owner' | 'member')}
                              disabled={changingRoleFor === member.id}
                              className="px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                              <option value="member">Member</option>
                              <option value="owner">Owner</option>
                            </select>
                          )}
                          <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                            member.role === 'owner'
                              ? 'bg-purple-100 text-purple-700'
                              : 'bg-blue-100 text-blue-700'
                          }`}>
                            {member.role === 'owner' ? 'Owner' : 'Member'}
                          </span>
                          {isOwner && !isCurrentUser && member.role === 'owner' && (
                            <button
                              onClick={() => handleTransferOwnership(member.user_id)}
                              disabled={transferringOwnershipTo === member.id}
                              className="text-xs text-purple-600 hover:text-purple-700 hover:underline disabled:opacity-50"
                            >
                              {transferringOwnershipTo === member.id ? 'Transferring...' : 'Transfer Ownership'}
                            </button>
                          )}
                          {isOwner && member.role !== 'owner' && (
                            <button
                              onClick={() => handleRemoveMember(member.user_id, member.user_name || member.user_email || 'this user')}
                              className="text-red-600 hover:text-red-700 text-xs sm:text-sm font-medium whitespace-nowrap"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* Invitations Tab */}
            {!isLoading && activeTab === 'invitations' && (
              <div className="space-y-2 sm:space-y-3">
                {invitations.length === 0 ? (
                  <p className="text-sm text-gray-600 text-center py-6 sm:py-8">No pending invitations</p>
                ) : (
                  invitations.map((invitation) => (
                    <div
                      key={invitation.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 sm:p-4 border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm sm:text-base font-medium text-gray-900 truncate">{invitation.email}</div>
                        <div className="text-xs sm:text-sm text-gray-600">
                          Invited {new Date(invitation.created_at).toLocaleDateString()} • 
                          Expires {new Date(invitation.expires_at).toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        <span className={`px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
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
                            className="text-red-600 hover:text-red-700 text-xs sm:text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
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
          <div className="p-4 sm:p-6 border-t border-gray-200">
            <button
              onClick={onClose}
              className="w-full bg-gray-100 text-gray-700 py-2 sm:py-3 px-4 rounded-lg sm:rounded-xl text-sm sm:text-base font-semibold hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-[60]">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-red-600 mb-4">Delete Workspace</h3>
            <p className="text-sm text-gray-700 mb-4">
              This will permanently delete <strong>{currentOrganization?.name}</strong> and all associated data including:
            </p>
            <ul className="list-disc list-inside text-sm text-gray-600 mb-4 space-y-1">
              <li>All properties</li>
              <li>All tenants</li>
              <li>All rent payments</li>
              <li>All expenses</li>
              <li>All repairs and inspections</li>
              <li>All compliance certificates</li>
            </ul>
            <p className="text-sm font-medium text-red-600 mb-4">
              This action cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type the workspace name to confirm: <strong>{currentOrganization?.name}</strong>
              </label>
              <input
                type="text"
                value={deleteConfirmName}
                onChange={(e) => setDeleteConfirmName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder={currentOrganization?.name}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setDeleteConfirmName('');
                  setError('');
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteWorkspace}
                disabled={isDeleting || deleteConfirmName !== currentOrganization?.name}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 text-sm font-medium"
              >
                {isDeleting ? 'Deleting...' : 'Delete Workspace'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={showCreateWorkspace}
        onClose={() => setShowCreateWorkspace(false)}
        onSuccess={() => {
          // Workspace will be switched automatically
        }}
      />
    </>
  );
};
