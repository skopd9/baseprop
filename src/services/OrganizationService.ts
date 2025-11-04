import { supabase } from '../lib/supabase';
import { EmailNotificationService } from './EmailNotificationService';

export interface Organization {
  id: string;
  name: string;
  created_by: string;
  settings: Record<string, any>;
  created_at: string;
  updated_at: string;
}

export interface OrganizationMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'owner' | 'member';
  invited_by: string | null;
  invited_at: string;
  joined_at: string | null;
  status: 'pending' | 'active';
  user_email?: string;
  user_name?: string;
}

export interface OrganizationInvitation {
  id: string;
  organization_id: string;
  email: string;
  role: 'owner' | 'member';
  invited_by: string;
  token: string;
  expires_at: string;
  status: 'pending' | 'accepted' | 'expired';
  created_at: string;
  organization_name?: string;
}

export class OrganizationService {
  /**
   * Create a new organization
   */
  static async createOrganization(name: string, userId: string, settings?: Record<string, any>): Promise<Organization> {
    try {
      // Create organization
      const { data: org, error: orgError } = await supabase
        .from('organizations')
        .insert({
          name,
          created_by: userId,
          settings: settings || {}
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Add creator as owner
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

      return org;
    } catch (error) {
      console.error('Error creating organization:', error);
      throw error;
    }
  }

  /**
   * Get all organizations for a user
   */
  static async getUserOrganizations(userId: string): Promise<Array<Organization & { role: string; joined_at: string }>> {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          role,
          joined_at,
          organizations (
            id,
            name,
            created_by,
            settings,
            created_at,
            updated_at
          )
        `)
        .eq('user_id', userId)
        .eq('status', 'active');

      if (error) {
        console.error('Error getting user organizations (Supabase error):', {
          message: error.message,
          details: error.details,
          hint: error.hint,
          code: error.code
        });
        throw new Error(`Failed to fetch organizations: ${error.message}`);
      }

      // Map the data to the expected format
      const organizations = (data || [])
        .filter(item => item.organizations) // Filter out any null organizations
        .map(item => ({
          ...item.organizations,
          role: item.role,
          joined_at: item.joined_at
        })) as any;

      return organizations;
    } catch (error) {
      // Ensure proper error message
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Error getting user organizations:', errorMessage);
      throw new Error(errorMessage);
    }
  }

  /**
   * Get organization by ID
   */
  static async getOrganization(orgId: string): Promise<Organization | null> {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('*')
        .eq('id', orgId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting organization:', error);
      return null;
    }
  }

  /**
   * Get all members of an organization
   */
  static async getOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select(`
          *,
          user_profiles (
            full_name,
            email
          )
        `)
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .order('joined_at', { ascending: false });

      if (error) throw error;

      // Map the data with user info from user_profiles
      const membersWithEmails = (data || []).map((member) => {
        return {
          ...member,
          user_email: (member as any).user_profiles?.email,
          user_name: (member as any).user_profiles?.full_name
        };
      });

      return membersWithEmails;
    } catch (error) {
      console.error('Error getting organization members:', error);
      return [];
    }
  }

  /**
   * Invite a user to an organization
   */
  static async inviteUser(
    orgId: string,
    email: string,
    role: 'owner' | 'member',
    invitedBy: string
  ): Promise<OrganizationInvitation> {
    try {
      // Check if there's already a pending invitation for this email
      const { data: existingInvites } = await supabase
        .from('organization_invitations')
        .select('id, status')
        .eq('organization_id', orgId)
        .eq('email', email)
        .eq('status', 'pending');

      if (existingInvites && existingInvites.length > 0) {
        throw new Error('An invitation has already been sent to this email');
      }

      // Get organization details
      const { data: orgData } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', orgId)
        .single();

      // Get inviter details
      const { data: inviterData } = await supabase
        .from('user_profiles')
        .select('full_name, email')
        .eq('id', invitedBy)
        .single();

      const organizationName = orgData?.name || 'Unknown Organization';
      const inviterName = inviterData?.full_name || inviterData?.email || 'Team Admin';

      // Create invitation
      const { data, error } = await supabase
        .from('organization_invitations')
        .insert({
          organization_id: orgId,
          email,
          role,
          invited_by: invitedBy
        })
        .select()
        .single();

      if (error) throw error;

      // Send invitation email
      console.log('📧 Sending organization invitation email...');
      try {
        const emailResult = await EmailNotificationService.sendOrganizationInvitationEmail(
          email,
          organizationName,
          inviterName,
          role,
          data.token,
          '7 days'
        );

        if (emailResult.success) {
          console.log('✅ Invitation email sent successfully!');
        } else {
          console.warn('⚠️ Invitation created but email failed to send:', emailResult.error);
          // Don't throw error - invitation is still created
        }
      } catch (emailError) {
        console.error('❌ Error sending invitation email:', emailError);
        // Don't throw error - invitation is still created, user can copy link manually
      }
      
      return data;
    } catch (error) {
      console.error('Error inviting user:', error);
      throw error;
    }
  }

  /**
   * Get pending invitations for an organization
   */
  static async getOrganizationInvitations(orgId: string): Promise<OrganizationInvitation[]> {
    try {
      const { data, error } = await supabase
        .from('organization_invitations')
        .select('*')
        .eq('organization_id', orgId)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error getting organization invitations:', error);
      return [];
    }
  }

  /**
   * Get invitation by token
   */
  static async getInvitationByToken(token: string): Promise<OrganizationInvitation | null> {
    try {
      const { data, error } = await supabase
        .from('organization_invitations')
        .select(`
          *,
          organizations (
            name
          )
        `)
        .eq('token', token)
        .eq('status', 'pending')
        .gt('expires_at', new Date().toISOString())
        .single();

      if (error) throw error;
      
      return {
        ...data,
        organization_name: (data as any).organizations?.name
      };
    } catch (error) {
      console.error('Error getting invitation:', error);
      return null;
    }
  }

  /**
   * Accept an invitation
   */
  static async acceptInvitation(token: string, userId: string, fullName?: string): Promise<void> {
    try {
      // Get invitation
      const invitation = await this.getInvitationByToken(token);
      if (!invitation) {
        throw new Error('Invalid or expired invitation');
      }

      // Verify email matches
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email !== invitation.email) {
        throw new Error('Email does not match invitation');
      }

      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', invitation.organization_id)
        .eq('user_id', userId)
        .single();

      if (existingMember) {
        // User is already a member, just mark invitation as accepted
        await supabase
          .from('organization_invitations')
          .update({
            status: 'accepted',
            updated_at: new Date().toISOString()
          })
          .eq('token', token);
        
        return; // Already a member, nothing more to do
      }

      // Ensure user profile exists (for new users accepting invitations)
      // Use provided name or extract a default from email
      const defaultName = user?.email ? user.email.split('@')[0] : 'User';
      const userName = fullName && fullName.trim() ? fullName.trim() : defaultName;
      
      const { error: profileError } = await supabase
        .from('user_profiles')
        .upsert({
          id: userId,
          email: user?.email,
          full_name: userName,
          has_completed_onboarding: true, // Mark as completed since they're joining existing org
          onboarding_data: {
            joined_via_invitation: true,
            invitation_accepted_at: new Date().toISOString()
          }
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        });

      if (profileError) {
        console.error('Error creating user profile:', profileError);
        // Don't throw - profile creation is not critical for invitation acceptance
      }

      // Add user to organization
      const { error: memberError } = await supabase
        .from('organization_members')
        .insert({
          organization_id: invitation.organization_id,
          user_id: userId,
          role: invitation.role,
          invited_by: invitation.invited_by,
          status: 'active',
          joined_at: new Date().toISOString()
        });

      if (memberError) throw memberError;

      // Mark invitation as accepted
      const { error: inviteError } = await supabase
        .from('organization_invitations')
        .update({
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('token', token);

      if (inviteError) throw inviteError;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      throw error;
    }
  }

  /**
   * Cancel a pending invitation and clean up orphaned user accounts
   */
  static async cancelInvitation(invitationId: string): Promise<void> {
    try {
      // First, get the invitation details to know the email
      const { data: invitation, error: fetchError } = await supabase
        .from('organization_invitations')
        .select('email')
        .eq('id', invitationId)
        .eq('status', 'pending')
        .single();

      if (fetchError) throw fetchError;
      if (!invitation) {
        throw new Error('Invitation not found or already processed');
      }

      const invitedEmail = invitation.email;

      // Delete the invitation
      const { error: deleteError } = await supabase
        .from('organization_invitations')
        .delete()
        .eq('id', invitationId)
        .eq('status', 'pending');

      if (deleteError) throw deleteError;

      // Clean up orphaned user account if one exists
      // Use database function to safely delete users with no organization memberships
      try {
        const { data: wasDeleted, error: cleanupError } = await supabase
          .rpc('delete_orphaned_user', { user_email: invitedEmail });

        if (cleanupError) {
          console.error('Error during orphaned user cleanup:', cleanupError);
          // Don't throw - invitation is already canceled, this is just best-effort cleanup
        } else if (wasDeleted) {
          console.log(`✓ Successfully cleaned up orphaned user account for: ${invitedEmail}`);
        } else {
          console.log(`No orphaned user cleanup needed for: ${invitedEmail}`);
        }
      } catch (cleanupError) {
        console.error('Unexpected error during user cleanup:', cleanupError);
        // Don't throw - invitation is already canceled
      }
    } catch (error) {
      console.error('Error canceling invitation:', error);
      throw error;
    }
  }

  /**
   * Remove a member from an organization
   */
  static async removeOrganizationMember(orgId: string, userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('organization_members')
        .delete()
        .eq('organization_id', orgId)
        .eq('user_id', userId);

      if (error) throw error;
    } catch (error) {
      console.error('Error removing organization member:', error);
      throw error;
    }
  }

  /**
   * Check if user is an owner of the organization
   */
  static async isOrganizationOwner(orgId: string, userId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', orgId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error) return false;
      return data?.role === 'owner';
    } catch (error) {
      return false;
    }
  }

  /**
   * Update organization settings
   */
  static async updateOrganization(orgId: string, updates: Partial<Organization>): Promise<void> {
    try {
      const { error } = await supabase
        .from('organizations')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', orgId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating organization:', error);
      throw error;
    }
  }

  /**
   * Get user's role in an organization
   */
  static async getUserRole(orgId: string, userId: string): Promise<'owner' | 'member' | null> {
    try {
      const { data, error } = await supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', orgId)
        .eq('user_id', userId)
        .eq('status', 'active')
        .single();

      if (error) return null;
      return data?.role || null;
    } catch (error) {
      return null;
    }
  }
}

