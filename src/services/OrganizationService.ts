import { supabase } from '../lib/supabase';

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

      if (error) throw error;

      return (data || []).map(item => ({
        ...item.organizations,
        role: item.role,
        joined_at: item.joined_at
      })) as any;
    } catch (error) {
      console.error('Error getting user organizations:', error);
      throw error;
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
          user_profiles!user_id (
            full_name
          )
        `)
        .eq('organization_id', orgId)
        .eq('status', 'active')
        .order('joined_at', { ascending: false });

      if (error) throw error;

      // Fetch user emails from auth.users (requires service role or custom function)
      const membersWithEmails = await Promise.all((data || []).map(async (member) => {
        try {
          // Get user email from auth metadata if available
          const { data: userData } = await supabase.auth.admin.getUserById(member.user_id);
          return {
            ...member,
            user_email: userData?.user?.email,
            user_name: (member as any).user_profiles?.full_name
          };
        } catch {
          return {
            ...member,
            user_name: (member as any).user_profiles?.full_name
          };
        }
      }));

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
      // Check if user is already a member
      const { data: existingMember } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', orgId)
        .eq('user_id', (await supabase.auth.getUser()).data.user?.id)
        .single();

      if (existingMember) {
        throw new Error('User is already a member of this organization');
      }

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

      // TODO: Send invitation email with token
      // This should be handled by a Supabase Edge Function or backend service
      
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
  static async acceptInvitation(token: string, userId: string): Promise<void> {
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

