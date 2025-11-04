import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { OrganizationService, Organization, OrganizationInvitation } from '../services/OrganizationService';
import { supabase } from '../lib/supabase';

interface OrganizationContextType {
  currentOrganization: Organization | null;
  userOrganizations: Array<Organization & { role: string }>;
  currentUserRole: 'owner' | 'member' | null;
  isLoading: boolean;
  error: string | null;
  switchOrganization: (orgId: string) => Promise<void>;
  inviteUser: (email: string, role: 'owner' | 'member') => Promise<void>;
  getInvitations: () => Promise<OrganizationInvitation[]>;
  refreshOrganizations: () => Promise<void>;
  createOrganization: (name: string, settings?: Record<string, any>) => Promise<Organization>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export const useOrganization = () => {
  const context = useContext(OrganizationContext);
  if (!context) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
};

interface OrganizationProviderProps {
  children: ReactNode;
  userId: string | null;
}

export const OrganizationProvider: React.FC<OrganizationProviderProps> = ({ children, userId }) => {
  const [currentOrganization, setCurrentOrganization] = useState<Organization | null>(null);
  const [userOrganizations, setUserOrganizations] = useState<Array<Organization & { role: string }>>([]);
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'member' | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load organizations when userId changes
  useEffect(() => {
    if (userId) {
      loadOrganizations();
    } else {
      setUserOrganizations([]);
      setCurrentOrganization(null);
      setCurrentUserRole(null);
      setIsLoading(false);
    }
  }, [userId]);

  // Load user's organizations
  const loadOrganizations = async () => {
    if (!userId) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const orgs = await OrganizationService.getUserOrganizations(userId);
      setUserOrganizations(orgs);

      // Set current organization
      if (orgs.length > 0) {
        // Try to restore from localStorage
        const savedOrgId = localStorage.getItem('currentOrganizationId');
        const savedOrg = orgs.find(o => o.id === savedOrgId);
        
        if (savedOrg) {
          setCurrentOrganization(savedOrg);
          setCurrentUserRole(savedOrg.role as 'owner' | 'member');
        } else {
          // Default to first organization
          setCurrentOrganization(orgs[0]);
          setCurrentUserRole(orgs[0].role as 'owner' | 'member');
          localStorage.setItem('currentOrganizationId', orgs[0].id);
        }
      } else {
        setCurrentOrganization(null);
        setCurrentUserRole(null);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load organizations';
      console.error('Error loading organizations:', errorMessage);
      setError(errorMessage);
      // Don't throw - allow the app to continue with no organizations
      setUserOrganizations([]);
      setCurrentOrganization(null);
      setCurrentUserRole(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Switch to a different organization
  const switchOrganization = async (orgId: string) => {
    const org = userOrganizations.find(o => o.id === orgId);
    if (!org) {
      throw new Error('Organization not found');
    }

    setCurrentOrganization(org);
    setCurrentUserRole(org.role as 'owner' | 'member');
    localStorage.setItem('currentOrganizationId', orgId);
  };

  // Invite a user to current organization
  const inviteUser = async (email: string, role: 'owner' | 'member') => {
    if (!currentOrganization || !userId) {
      throw new Error('No organization selected');
    }

    if (currentUserRole !== 'owner') {
      throw new Error('Only owners can invite users');
    }

    try {
      await OrganizationService.inviteUser(
        currentOrganization.id,
        email,
        role,
        userId
      );
    } catch (err) {
      console.error('Error inviting user:', err);
      throw err;
    }
  };

  // Get pending invitations for current organization
  const getInvitations = async (): Promise<OrganizationInvitation[]> => {
    if (!currentOrganization) {
      return [];
    }

    try {
      return await OrganizationService.getOrganizationInvitations(currentOrganization.id);
    } catch (err) {
      console.error('Error getting invitations:', err);
      return [];
    }
  };

  // Refresh organizations list
  const refreshOrganizations = async () => {
    await loadOrganizations();
  };

  // Create a new organization
  const createOrganization = async (name: string, settings?: Record<string, any>): Promise<Organization> => {
    if (!userId) {
      throw new Error('User not authenticated');
    }

    try {
      const org = await OrganizationService.createOrganization(name, userId, settings);
      
      // Refresh organizations list
      await loadOrganizations();
      
      return org;
    } catch (err) {
      console.error('Error creating organization:', err);
      throw err;
    }
  };

  const value: OrganizationContextType = {
    currentOrganization,
    userOrganizations,
    currentUserRole,
    isLoading,
    error,
    switchOrganization,
    inviteUser,
    getInvitations,
    refreshOrganizations,
    createOrganization
  };

  return (
    <OrganizationContext.Provider value={value}>
      {children}
    </OrganizationContext.Provider>
  );
};

