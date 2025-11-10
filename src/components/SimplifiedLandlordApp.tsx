import React, { useState, useEffect, useRef } from 'react';
import { 
  HomeIcon,
  UserGroupIcon,
  DocumentCheckIcon,
  WrenchScrewdriverIcon,
  ShieldCheckIcon,
  CurrencyPoundIcon,
  ReceiptPercentIcon,
  Bars3Icon,
  XMarkIcon,
  ArrowRightOnRectangleIcon,
  ChevronDownIcon,
  QuestionMarkCircleIcon,
  Cog6ToothIcon,
  UserIcon
} from '@heroicons/react/24/outline';
import { SimplifiedDashboard } from './SimplifiedDashboard';
import { ResidentialPropertiesTable } from './ResidentialPropertiesTable';
import { ResidentialTenantsTable } from './ResidentialTenantsTable';
import { WorkspaceSettings } from './WorkspaceSettings';
import { UserSettings } from './UserSettings';
import { CreateWorkspaceModal } from './CreateWorkspaceModal';
import { OnboardingWizard } from './OnboardingWizard';
import { GetStarted } from './GetStarted';
import { NotificationBell } from './NotificationBell';
import { useOrganization } from '../contexts/OrganizationContext';

import TenancyManagementModal from './TenancyManagementModal';
import { InspectionWorkflows } from './InspectionWorkflows';
import { RepairWorkflows } from './RepairWorkflows';
import { ComplianceWorkflows } from './ComplianceWorkflows';
import { RentTracking } from './RentTracking';
import { ExpenseTracker } from './ExpenseTracker';

import { SuccessMessage } from './SuccessMessage';
import { PropertyEditModal } from './PropertyEditModal';
import { SimplifiedAddPropertyModal } from './SimplifiedAddPropertyModal';
import { SimplifiedAddTenantModal } from './SimplifiedAddTenantModal';
import { PropertyDeleteConfirmationModal } from './PropertyDeleteConfirmationModal';
import { PropertySoldModal } from './PropertySoldModal';
import { TenantDeleteConfirmationModal } from './TenantDeleteConfirmationModal';

import { SimplifiedProperty, SimplifiedTenant } from '../utils/simplifiedDataTransforms';
import { SimplifiedPropertyService } from '../services/SimplifiedPropertyService';
import { SimplifiedTenantService } from '../services/SimplifiedTenantService';
import { OrganizationService } from '../services/OrganizationService';
import { DemoDataSeeder } from '../utils/demoDataSeeder';

type ViewType = 'dashboard' | 'properties' | 'tenants' | 'inspections' | 'repairs' | 'compliance' | 'rent' | 'expenses' | 'onboarding';

interface NavigationItem {
  id: ViewType;
  name: string;
  icon: React.ComponentType<any>;
  description: string;
}

const navigationItems: NavigationItem[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    icon: HomeIcon,
    description: 'Overview of your properties'
  },
  {
    id: 'properties',
    name: 'Properties',
    icon: HomeIcon,
    description: 'Manage your properties'
  },
  {
    id: 'tenants',
    name: 'Tenants',
    icon: UserGroupIcon,
    description: 'Manage your tenants'
  },
  {
    id: 'rent',
    name: 'Rent Tracking',
    icon: CurrencyPoundIcon,
    description: 'Track rent payments'
  },
  {
    id: 'expenses',
    name: 'Expenses',
    icon: ReceiptPercentIcon,
    description: 'Track property expenses'
  },
  {
    id: 'inspections',
    name: 'Inspections',
    icon: DocumentCheckIcon,
    description: 'Schedule inspections'
  },
  {
    id: 'repairs',
    name: 'Repairs',
    icon: WrenchScrewdriverIcon,
    description: 'Track maintenance'
  },
  {
    id: 'compliance',
    name: 'Compliance',
    icon: ShieldCheckIcon,
    description: 'Manage certificates'
  }
];

interface SimplifiedLandlordAppProps {
  onLogout: () => void;
  showOnboarding?: boolean;
  userId?: string;
  userEmail?: string;
  onOnboardingComplete?: () => void;
}

export const SimplifiedLandlordApp: React.FC<SimplifiedLandlordAppProps> = ({ 
  onLogout,
  showOnboarding = false,
  userId = '',
  userEmail = '',
  onOnboardingComplete
}) => {
  const { currentOrganization, userOrganizations, currentUserRole, switchOrganization, refreshOrganizations, error: orgError, isLoading: orgLoading } = useOrganization();
  // Start on onboarding tab if user needs to complete onboarding
  const [currentView, setCurrentView] = useState<ViewType>(showOnboarding ? 'onboarding' : 'dashboard');
  const [properties, setProperties] = useState<SimplifiedProperty[]>([]);
  const [tenants, setTenants] = useState<SimplifiedTenant[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<SimplifiedProperty | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<SimplifiedTenant | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showOrgSettings, setShowOrgSettings] = useState(false);
  const [showUserSettings, setShowUserSettings] = useState(false);
  const [showCreateWorkspace, setShowCreateWorkspace] = useState(false);
  const [workspaceSelectorOpen, setWorkspaceSelectorOpen] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const workspaceSelectorRef = useRef<HTMLDivElement>(null);

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [showPropertyEditModal, setShowPropertyEditModal] = useState(false);
  const [showAddPropertyModal, setShowAddPropertyModal] = useState(false);
  const [showAddTenantModal, setShowAddTenantModal] = useState(false);
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [showSoldModal, setShowSoldModal] = useState(false);
  const [propertyToDelete, setPropertyToDelete] = useState<SimplifiedProperty | null>(null);
  const [propertyToMarkSold, setPropertyToMarkSold] = useState<SimplifiedProperty | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isMarkingSold, setIsMarkingSold] = useState(false);
  const [showTenantDeleteModal, setShowTenantDeleteModal] = useState(false);
  const [tenantToDelete, setTenantToDelete] = useState<SimplifiedTenant | null>(null);
  const [isDeletingTenant, setIsDeletingTenant] = useState(false);
  const [showTenancyWizard, setShowTenancyWizard] = useState(false);
  const [tenantForManagement, setTenantForManagement] = useState<SimplifiedTenant | null>(null);
  
  // Demo data loading state
  const [isLoadingDemo, setIsLoadingDemo] = useState(false);

  // Leave workspace state
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  // Load data from database on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const orgId = currentOrganization?.id;
        const [propertiesData, tenantsData] = await Promise.all([
          SimplifiedPropertyService.getSimplifiedProperties(orgId),
          SimplifiedTenantService.getSimplifiedTenants(orgId),
        ]);

        // Load data from database (no mock data seeding)
        setProperties(propertiesData);
        setTenants(tenantsData);
      } catch (error) {
        console.error('Error loading simplified data:', error);
        // Start with empty arrays on error
        setProperties([]);
        setTenants([]);
      }
    };

    if (currentOrganization) {
      loadData();
    }
  }, [currentOrganization]);

  // Close user menu and workspace selector when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // Close user menu if clicking outside
      if (userMenuOpen && userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false);
      }
      // Close workspace selector if clicking outside
      if (workspaceSelectorOpen) {
        const target = event.target as Node;
        const workspaceButton = document.querySelector('[data-workspace-selector]');
        const workspaceDropdown = document.querySelector('[data-workspace-dropdown]');
        if (workspaceButton && !workspaceButton.contains(target) && 
            workspaceDropdown && !workspaceDropdown.contains(target)) {
          setWorkspaceSelectorOpen(false);
        }
      }
    };

    if (userMenuOpen || workspaceSelectorOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [userMenuOpen, workspaceSelectorOpen]);




  // Close property edit modal when view changes
  useEffect(() => {
    if (showPropertyEditModal && currentView !== 'properties') {
      setShowPropertyEditModal(false);
      setSelectedProperty(null);
    }
  }, [currentView, showPropertyEditModal]);



  const handlePropertySelect = (property: SimplifiedProperty) => {
    setSelectedProperty(property);
    setShowPropertyEditModal(true);
  };

  const handlePropertySave = async (updatedProperty: SimplifiedProperty) => {
    try {
      // Check if this is a new property (no id or empty id)
      const isNewProperty = !updatedProperty.id || updatedProperty.id === '';
      
      if (isNewProperty) {
        // Create new property
        const savedProperty = await SimplifiedPropertyService.createSimplifiedProperty(
          updatedProperty,
          currentOrganization?.id
        );
        
        if (savedProperty) {
          setProperties(prev => [savedProperty, ...prev]);
          setSelectedProperty(savedProperty);
          setSuccessMessage('Property added successfully!');
        } else {
          setSuccessMessage('Failed to add property. Please try again.');
        }
      } else {
        // Update existing property
        const savedProperty = await SimplifiedPropertyService.updateSimplifiedProperty(
          updatedProperty.id,
          updatedProperty
        );

        if (savedProperty) {
          setProperties(prev => 
            prev.map(p => p.id === updatedProperty.id ? savedProperty : p)
          );
          setSelectedProperty(savedProperty);
          setSuccessMessage('Property updated successfully!');
        } else {
          setSuccessMessage('Failed to update property. Please try again.');
        }
      }
    } catch (error) {
      console.error('Error saving property:', error);
      setSuccessMessage(`Failed to ${!updatedProperty.id ? 'add' : 'update'} property. Please try again.`);
    }
  };

  const handleAddProperty = () => {
    // Create an empty property object to trigger wizard mode
    const newProperty: SimplifiedProperty = {
      id: '', // Empty ID triggers wizard mode
      propertyReference: 0,
      countryCode: currentOrganization?.country_code || 'UK',
      address: '',
      propertyType: 'house',
      bedrooms: 2,
      bathrooms: 1,
      targetRent: 1200,
      tenantCount: 0,
      status: 'under_management',
      units: 1,
      rooms: []
    };
    setSelectedProperty(newProperty);
    setShowPropertyEditModal(true);
  };

  const handlePropertyAdded = (newProperty: SimplifiedProperty) => {
    setProperties(prev => [newProperty, ...prev]);
    setSuccessMessage('Property added successfully!');
  };

  const handleDeleteProperty = (property: SimplifiedProperty) => {
    setPropertyToDelete(property);
    setShowDeleteConfirmModal(true);
  };

  const handleDeleteProperties = async (propertiesToDelete: SimplifiedProperty[]) => {
    if (propertiesToDelete.length === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${propertiesToDelete.length} propert${propertiesToDelete.length === 1 ? 'y' : 'ies'}? This will also delete all associated tenants.`;
    if (!window.confirm(confirmMessage)) return;
    
    setIsDeleting(true);
    try {
      let successCount = 0;
      const errors: string[] = [];
      
      for (const property of propertiesToDelete) {
        const result = await SimplifiedPropertyService.deletePropertyWithTenants(property.id);
        if (result.success) {
          successCount++;
        } else {
          errors.push(`Failed to delete ${property.address}`);
        }
      }
      
      // Remove successfully deleted properties from local state
      setProperties(prev => prev.filter(p => !propertiesToDelete.some(toDelete => toDelete.id === p.id)));
      
      // Refresh tenants
      const updatedTenants = await SimplifiedTenantService.getAllTenants();
      setTenants(updatedTenants);
      
      if (selectedProperty && propertiesToDelete.some(p => p.id === selectedProperty.id)) {
        setSelectedProperty(null);
      }
      
      if (successCount === propertiesToDelete.length) {
        setSuccessMessage(`Successfully deleted ${successCount} propert${successCount === 1 ? 'y' : 'ies'}`);
      } else {
        setSuccessMessage(`Deleted ${successCount} of ${propertiesToDelete.length} properties. ${errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Error deleting properties:', error);
      setSuccessMessage('Failed to delete properties. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!propertyToDelete) return;
    
    setIsDeleting(true);
    try {
      const result = await SimplifiedPropertyService.deletePropertyWithTenants(propertyToDelete.id);
      
      if (result.success) {
        // Remove property from local state
        setProperties(prev => prev.filter(p => p.id !== propertyToDelete.id));
        
        // Remove associated tenants from local state
        setTenants(prev => prev.filter(t => t.propertyId !== propertyToDelete.id));
        
        setSuccessMessage(
          `Property deleted successfully. ${result.tenantsDeleted} tenant${result.tenantsDeleted !== 1 ? 's' : ''} were also removed.`
        );
      } else {
        setSuccessMessage(`Failed to delete property: ${result.error}`);
      }
    } catch (error) {
      console.error('Error deleting property:', error);
      setSuccessMessage('Failed to delete property. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirmModal(false);
      setPropertyToDelete(null);
    }
  };

  const handleMarkAsSold = (property: SimplifiedProperty) => {
    setPropertyToMarkSold(property);
    setShowSoldModal(true);
  };

  const handleConfirmSold = async (salesPrice: number) => {
    if (!propertyToMarkSold) return;
    
    setIsMarkingSold(true);
    try {
      const updatedProperty = await SimplifiedPropertyService.markPropertyAsSold(
        propertyToMarkSold.id, 
        salesPrice
      );
      
      if (updatedProperty) {
        // Update property in local state
        setProperties(prev => 
          prev.map(p => p.id === propertyToMarkSold.id ? updatedProperty : p)
        );
        
        const profit = propertyToMarkSold.purchasePrice 
          ? salesPrice - propertyToMarkSold.purchasePrice 
          : null;
        
        const profitMessage = profit !== null 
          ? ` (${profit >= 0 ? 'Profit' : 'Loss'}: £${Math.abs(profit).toLocaleString()})`
          : '';
        
        setSuccessMessage(`Property marked as sold for £${salesPrice.toLocaleString()}${profitMessage}`);
      } else {
        setSuccessMessage('Failed to mark property as sold. Please try again.');
      }
    } catch (error) {
      console.error('Error marking property as sold:', error);
      setSuccessMessage('Failed to mark property as sold. Please try again.');
    } finally {
      setIsMarkingSold(false);
      setShowSoldModal(false);
      setPropertyToMarkSold(null);
    }
  };

  const handleAddTenant = () => {
    setShowAddTenantModal(true);
  };

  const handleTenantAdded = (newTenant: SimplifiedTenant) => {
    setTenants(prev => [newTenant, ...prev]);
    
    // Update property tenant count in local state
    setProperties(prev => prev.map(property => {
      if (property.id === newTenant.propertyId) {
        return {
          ...property,
          tenantCount: property.tenantCount + 1,
          status: 'occupied' as const
        };
      }
      return property;
    }));
    
    setSuccessMessage('Tenant added successfully!');
    
    // Only navigate to tenants view if NOT in the onboarding wizard
    // During onboarding, we want to stay in the wizard
    if (currentView !== 'onboarding') {
      setCurrentView('tenants');
    }
  };

  const handleDeleteTenant = (tenant: SimplifiedTenant) => {
    setTenantToDelete(tenant);
    setShowTenantDeleteModal(true);
  };

  const handleDeleteTenants = async (tenantsToDelete: SimplifiedTenant[]) => {
    if (tenantsToDelete.length === 0) return;
    
    const confirmMessage = `Are you sure you want to delete ${tenantsToDelete.length} tenant${tenantsToDelete.length === 1 ? '' : 's'}?`;
    if (!window.confirm(confirmMessage)) return;
    
    setIsDeleting(true);
    try {
      let successCount = 0;
      const errors: string[] = [];
      
      for (const tenant of tenantsToDelete) {
        const success = await SimplifiedTenantService.deleteSimplifiedTenant(tenant.id);
        if (success) {
          successCount++;
        } else {
          errors.push(`Failed to delete ${tenant.name}`);
        }
      }
      
      // Remove successfully deleted tenants from local state
      setTenants(prev => prev.filter(t => !tenantsToDelete.some(toDelete => toDelete.id === t.id)));
      
      // Update property statuses if needed
      const affectedPropertyIds = [...new Set(tenantsToDelete.map(t => t.propertyId))];
      setProperties(prev => prev.map(property => {
        if (affectedPropertyIds.includes(property.id)) {
          const remainingTenants = tenants.filter(
            t => t.propertyId === property.id && !tenantsToDelete.some(toDelete => toDelete.id === t.id)
          );
          if (remainingTenants.length === 0) {
            return { ...property, status: 'vacant' as const };
          }
        }
        return property;
      }));
      
      if (selectedTenant && tenantsToDelete.some(t => t.id === selectedTenant.id)) {
        setSelectedTenant(null);
      }
      
      if (successCount === tenantsToDelete.length) {
        setSuccessMessage(`Successfully deleted ${successCount} tenant${successCount === 1 ? '' : 's'}`);
      } else {
        setSuccessMessage(`Deleted ${successCount} of ${tenantsToDelete.length} tenants. ${errors.join(', ')}`);
      }
    } catch (error) {
      console.error('Error deleting tenants:', error);
      setSuccessMessage('Failed to delete tenants. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleTenantUpdate = async (updatedTenant: SimplifiedTenant) => {
    try {
      // Update tenant in database
      const success = await SimplifiedTenantService.updateTenantOnboarding(updatedTenant.id, updatedTenant);
      
      if (success) {
        // Update tenant in local state
        setTenants(prev => prev.map(tenant => 
          tenant.id === updatedTenant.id ? updatedTenant : tenant
        ));
        
        setSuccessMessage(`${updatedTenant.name}'s onboarding has been updated successfully!`);
      } else {
        console.error('Failed to update tenant onboarding');
      }
    } catch (error) {
      console.error('Error updating tenant:', error);
    }
  };

  const confirmDeleteTenant = async () => {
    if (!tenantToDelete) return;

    setIsDeletingTenant(true);
    try {
      const success = await SimplifiedTenantService.deleteSimplifiedTenant(tenantToDelete.id);
      
      if (success) {
        // Remove tenant from state
        setTenants(prev => prev.filter(t => t.id !== tenantToDelete.id));
        
        // Update property tenant count in local state
        setProperties(prev => prev.map(property => {
          if (property.id === tenantToDelete.propertyId) {
            const newTenantCount = Math.max(0, property.tenantCount - 1);
            return {
              ...property,
              tenantCount: newTenantCount,
              status: newTenantCount === 0 ? 'vacant' as const : property.status
            };
          }
          return property;
        }));
        
        // Show success message
        setSuccessMessage(`Tenant ${tenantToDelete.name} has been deleted successfully!`);
        setTimeout(() => setSuccessMessage(null), 5000);
        
        // Close modal and reset state
        setShowTenantDeleteModal(false);
        setTenantToDelete(null);
        
        // Clear selection if deleted tenant was selected
        if (selectedTenant?.id === tenantToDelete.id) {
          setSelectedTenant(null);
        }
      } else {
        alert('Failed to delete tenant. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting tenant:', error);
      alert('An error occurred while deleting the tenant. Please try again.');
    } finally {
      setIsDeletingTenant(false);
    }
  };

  const handleClosePropertyModal = () => {
    setShowPropertyEditModal(false);
    // Keep selectedProperty for table highlighting but close modal
  };



  const renderCurrentView = () => {
    // If user needs to complete initial onboarding wizard, show it regardless of currentView
    if (showOnboarding) {
      return (
        <div className="p-6 bg-gray-50 min-h-screen flex items-center justify-center">
          <OnboardingWizard
            userId={userId}
            userEmail={userEmail}
            onComplete={() => {
              if (onOnboardingComplete) {
                onOnboardingComplete();
              }
            }}
          />
        </div>
      );
    }

    switch (currentView) {
      case 'onboarding':
        return (
          <GetStarted
            properties={properties}
            tenants={tenants}
            onAddProperty={handlePropertyAdded}
            onAddTenant={handleTenantAdded}
            onViewRent={() => setCurrentView('rent')}
            onViewInspections={() => setCurrentView('inspections')}
            onLoadDemoData={loadDemoData}
            isLoadingDemo={isLoadingDemo}
            onComplete={() => {
              setSuccessMessage('Onboarding completed! Welcome to your dashboard.');
              setCurrentView('dashboard');
            }}
          />
        );
      
      case 'dashboard':
        return (
          <SimplifiedDashboard
            properties={properties}
            tenants={tenants}
            onAddProperty={handleAddProperty}
            onAddTenant={handleAddTenant}
            onViewRent={() => setCurrentView('rent')}
            onViewInspections={() => setCurrentView('inspections')}
            onViewExpenses={() => setCurrentView('expenses')}
            onLoadDemoData={loadDemoData}
            isLoadingDemo={isLoadingDemo}
            selectedProperty={selectedProperty}
            onPropertySelect={handlePropertySelect}
          />
        );
      case 'properties':
        return (
          <div className="p-4 sm:p-6 bg-white">
            <div className="overflow-x-auto">
              <ResidentialPropertiesTable
                properties={properties}
                tenants={tenants}
                selectedProperty={selectedProperty}
                onPropertySelect={handlePropertySelect}
                onAddProperty={handleAddProperty}
                onDeleteProperties={handleDeleteProperties}
              />
            </div>
          </div>
        );
      case 'tenants':
        return (
          <div className="p-4 sm:p-6 bg-white">
            <div className="overflow-x-auto">
              <ResidentialTenantsTable
                tenants={tenants}
                properties={properties}
                selectedTenant={selectedTenant}
                onTenantSelect={setSelectedTenant}
                onAddTenant={handleAddTenant}
                onDeleteTenants={handleDeleteTenants}
                onTenantUpdate={handleTenantUpdate}
              />
            </div>
          </div>
        );

      case 'rent':
        return (
          <div className="p-4 sm:p-6">
            <RentTracking
              properties={properties}
              tenants={tenants}
            />
          </div>
        );
      case 'expenses':
        return (
          <div className="p-4 sm:p-6">
            <ExpenseTracker
              properties={properties}
            />
          </div>
        );
      case 'inspections':
        return (
          <div className="p-4 sm:p-6">
            <InspectionWorkflows
              properties={properties}
              tenants={tenants}
            />
          </div>
        );
      case 'repairs':
        return (
          <div className="p-4 sm:p-6">
            <RepairWorkflows
              properties={properties}
              tenants={tenants}
            />
          </div>
        );
      case 'compliance':
        return (
          <div className="p-4 sm:p-6">
            <ComplianceWorkflows
              properties={properties}
              countryCode={currentOrganization?.settings?.country || 'UK'}
            />
          </div>
        );

      default:
        return (
          <SimplifiedDashboard
            properties={properties}
            tenants={tenants}
            selectedProperty={selectedProperty}
            onPropertySelect={handlePropertySelect}
            onViewExpenses={() => setCurrentView('expenses')}
          />
        );
    }
  };

  const currentNavItem = navigationItems.find(item => item.id === currentView);

  const loadDemoData = async () => {
    setIsLoadingDemo(true);
    try {
      const { properties: demoProperties, tenants: demoTenants } = await DemoDataSeeder.seedDemoData();
      setProperties(demoProperties);
      setTenants(demoTenants);
      setSuccessMessage('Demo data loaded! Explore the features with sample properties and tenants.');
    } catch (error) {
      console.error('Error loading demo data:', error);
      setSuccessMessage('Failed to load demo data. Please try again.');
    } finally {
      setIsLoadingDemo(false);
    }
  };

  const handleLeaveWorkspace = () => {
    setShowLeaveConfirm(true);
  };

  const confirmLeaveWorkspace = async () => {
    if (!currentOrganization || !userId) return;
    
    setIsLeaving(true);
    try {
      await OrganizationService.leaveOrganization(currentOrganization.id, userId);
      
      // Switch to another workspace
      const remainingOrgs = userOrganizations.filter(o => o.id !== currentOrganization.id);
      if (remainingOrgs.length > 0) {
        await switchOrganization(remainingOrgs[0].id);
      }
      
      setShowLeaveConfirm(false);
      await refreshOrganizations();
      setSuccessMessage(`You have left ${currentOrganization.name}`);
    } catch (err: any) {
      console.error('Error leaving workspace:', err);
      alert(err.message || 'Failed to leave workspace');
    } finally {
      setIsLeaving(false);
    }
  };

  return (
    <div className="flex h-screen bg-white relative">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div 
            className="fixed inset-0 bg-gray-600 bg-opacity-75" 
            onClick={() => {
              setSidebarOpen(false);
              // Close property edit modal when closing mobile sidebar
              if (showPropertyEditModal) {
                setShowPropertyEditModal(false);
                setSelectedProperty(null);
              }
            }} 
          />
        </div>
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white transform ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 flex flex-col border-r border-gray-200`}>
        <div className="flex items-center justify-between h-12 px-6 border-b border-gray-200 flex-shrink-0">
          <h1 className="text-lg font-bold text-gray-900">Base Prop</h1>
          <button
            onClick={() => {
              setSidebarOpen(false);
              // Close property edit modal when closing mobile sidebar
              if (showPropertyEditModal) {
                setShowPropertyEditModal(false);
                setSelectedProperty(null);
              }
            }}
            className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <nav className="mt-6 px-3 flex-1 overflow-y-auto">
          <div className="space-y-1">
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    // Close property edit modal when clicking any menu item
                    if (showPropertyEditModal) {
                      setShowPropertyEditModal(false);
                      setSelectedProperty(null);
                    }
                    setCurrentView(item.id);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-blue-100 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className={`mr-3 h-5 w-5 ${isActive ? 'text-blue-700' : 'text-gray-400'}`} />
                  <div className="text-left">
                    <div className="font-medium">{item.name}</div>
                    <div className="text-xs text-gray-500">{item.description}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Get Started - positioned above user profile section */}
        <div className="mt-auto px-3 pt-3 pb-3 border-t border-gray-200 bg-white">
          <button
            onClick={() => {
              if (showPropertyEditModal) {
                setShowPropertyEditModal(false);
                setSelectedProperty(null);
              }
              setCurrentView('onboarding');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              currentView === 'onboarding'
                ? 'bg-green-100 text-green-700 border-r-2 border-green-700'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <QuestionMarkCircleIcon className={`mr-3 h-5 w-5 ${currentView === 'onboarding' ? 'text-green-700' : 'text-gray-400'}`} />
            <div className="text-left">
              <div className="font-medium">Onboarding Wizard</div>
              <div className="text-xs text-gray-500">Portfolio setup</div>
            </div>
          </button>
        </div>

        {/* User Profile Section at Bottom */}
        <div className="mt-auto p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between" ref={userMenuRef}>
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center space-x-3 flex-1 min-w-0 hover:opacity-80 transition-opacity cursor-pointer"
            >
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-semibold shadow-sm">
                {currentOrganization?.name.charAt(0).toUpperCase() || 'W'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {orgLoading ? 'Loading...' : currentOrganization?.name || (orgError ? 'Error loading' : 'No workspace')}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {orgError ? (
                    <span className="text-red-600" title={orgError}>Error loading workspaces</span>
                  ) : (
                    `${userOrganizations.length} ${userOrganizations.length === 1 ? 'workspace' : 'workspaces'}`
                  )}
                </p>
              </div>
            </button>
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <ChevronDownIcon className={`w-5 h-5 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Dropdown Menu */}
              {userMenuOpen && (
                <div className="absolute bottom-full right-0 mb-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                  <button
                    onClick={() => {
                      setShowUserSettings(true);
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <UserIcon className="w-4 h-4 mr-2 text-gray-500" />
                    User Settings
                  </button>
                  <button
                    onClick={() => {
                      setShowOrgSettings(true);
                      setUserMenuOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    <Cog6ToothIcon className="w-4 h-4 mr-2 text-gray-500" />
                    Workspace Settings
                  </button>
                  {/* Leave Workspace (for members only, not owners) */}
                  {currentOrganization && userOrganizations.length > 1 && currentUserRole === 'member' && (
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        handleLeaveWorkspace();
                      }}
                      className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                      </svg>
                      Leave Workspace
                    </button>
                  )}
                  <div className="border-t border-gray-100 my-1"></div>
                  <button
                    onClick={onLogout}
                    className="w-full flex items-center px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <ArrowRightOnRectangleIcon className="w-4 h-4 mr-2" />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className={`flex-1 flex flex-col overflow-hidden ${userEmail ? 'pt-0' : ''}`}>
        {/* Top bar */}
        <div className="bg-white border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between h-12 px-4 sm:px-6">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-1 rounded-md text-gray-400 hover:text-gray-600 lg:hidden"
            >
              <Bars3Icon className="w-4 h-4" />
            </button>
            <div className="flex-1" /> {/* Spacer */}
            
            {/* Right side: Notification Bell + Workspace Switcher */}
            <div className="flex items-center gap-2 ml-auto">
              {/* Notification Bell */}
              {userEmail && (
                <NotificationBell
                  userEmail={userEmail}
                  onInvitationAccepted={() => {
                    // Refresh organizations to show the newly joined workspace
                    if (refreshOrganizations) {
                      refreshOrganizations();
                    }
                  }}
                />
              )}
              
              {/* Workspace Switcher */}
              <div className="relative">
              <button
                data-workspace-selector
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setWorkspaceSelectorOpen(!workspaceSelectorOpen);
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-sm border border-gray-300 rounded-lg bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                  {currentOrganization?.name.charAt(0).toUpperCase() || 'W'}
                </div>
                <span className="hidden sm:block text-gray-700 font-medium max-w-[120px] truncate">
                  {currentOrganization?.name || 'No workspace'}
                </span>
                <ChevronDownIcon className={`w-3.5 h-3.5 text-gray-500 transition-transform ${workspaceSelectorOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {/* Workspace Dropdown - Top Right */}
              {workspaceSelectorOpen && (
              <div 
                data-workspace-dropdown
                className="absolute right-0 top-full mt-2 w-64 bg-white rounded-lg shadow-xl border border-gray-200 py-2 z-50"
                onClick={(e) => e.stopPropagation()}
              >
                  {/* Create New Workspace */}
                  <button
                    onClick={() => {
                      setShowCreateWorkspace(true);
                      setWorkspaceSelectorOpen(false);
                    }}
                    className="w-full flex items-center px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors border-b border-gray-100"
                  >
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create New Workspace
                  </button>
                  
                  {/* Workspace List */}
                  {userOrganizations.length > 0 ? (
                    <div className="max-h-64 overflow-y-auto">
                      {userOrganizations.map((org) => (
                        <button
                          key={org.id}
                          onClick={() => {
                            switchOrganization(org.id);
                            setWorkspaceSelectorOpen(false);
                          }}
                          className={`w-full flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors ${
                            currentOrganization?.id === org.id ? 'bg-blue-50 text-blue-700' : ''
                          }`}
                        >
                          {currentOrganization?.id === org.id && (
                            <svg className="w-4 h-4 mr-2 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                            </svg>
                          )}
                          <span className="truncate flex-1 text-left">{org.name}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="px-4 py-2 text-sm text-gray-500 text-center">
                      No workspaces yet
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>
          </div>
        </div>

        {/* Workspace Error Banner */}
        {orgError && (
          <div className="bg-red-50 border-l-4 border-red-500 px-6 py-4">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-red-800">
                  Error Loading Workspaces
                </h3>
                <div className="mt-2 text-sm text-red-700">
                  <p>{orgError}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main content area */}
        <main className="flex-1 overflow-auto">
          {renderCurrentView()}
        </main>
      </div>



      {/* Property Edit Modal */}
      <PropertyEditModal
        property={selectedProperty}
        isOpen={showPropertyEditModal}
        onClose={handleClosePropertyModal}
        onSave={handlePropertySave}
      />

      {/* Add Property Modal */}
      <SimplifiedAddPropertyModal
        isOpen={showAddPropertyModal}
        onClose={() => setShowAddPropertyModal(false)}
        onPropertyAdded={handlePropertyAdded}
      />

      {/* Add Tenant Modal */}
      <SimplifiedAddTenantModal
        isOpen={showAddTenantModal}
        onClose={() => setShowAddTenantModal(false)}
        onTenantAdded={handleTenantAdded}
        properties={properties}
        existingTenants={tenants}
      />

      {/* Delete Property Confirmation Modal */}
      <PropertyDeleteConfirmationModal
        isOpen={showDeleteConfirmModal}
        onClose={() => {
          setShowDeleteConfirmModal(false);
          setPropertyToDelete(null);
        }}
        onConfirm={handleConfirmDelete}
        propertyAddress={propertyToDelete?.address || ''}
        tenantCount={tenants.filter(t => t.propertyId === propertyToDelete?.id).length}
        isDeleting={isDeleting}
      />

      {/* Mark Property as Sold Modal */}
      <PropertySoldModal
        isOpen={showSoldModal}
        onClose={() => {
          setShowSoldModal(false);
          setPropertyToMarkSold(null);
        }}
        onConfirm={handleConfirmSold}
        propertyAddress={propertyToMarkSold?.address || ''}
        purchasePrice={propertyToMarkSold?.purchasePrice}
        isSubmitting={isMarkingSold}
      />

      {/* Delete Tenant Confirmation Modal */}
      <TenantDeleteConfirmationModal
        isOpen={showTenantDeleteModal}
        onClose={() => {
          setShowTenantDeleteModal(false);
          setTenantToDelete(null);
        }}
        onConfirm={confirmDeleteTenant}
        tenant={tenantToDelete}
        isDeleting={isDeletingTenant}
      />

      {/* Tenancy Management Modal */}
      <TenancyManagementModal
        isOpen={showTenancyWizard}
        onClose={() => {
          setShowTenancyWizard(false);
          setTenantForManagement(null);
        }}
        tenant={tenantForManagement}
        properties={properties}
        onTenancyCreated={handleTenantAdded}
      />

      {/* Success Messages */}
      <SuccessMessage
        isVisible={!!successMessage}
        message={successMessage || ''}
        onClose={() => setSuccessMessage(null)}
      />

      {/* Workspace Settings Modal */}
      <WorkspaceSettings
        isOpen={showOrgSettings}
        onClose={() => setShowOrgSettings(false)}
      />

      {/* Create Workspace Modal */}
      <CreateWorkspaceModal
        isOpen={showCreateWorkspace}
        onClose={() => setShowCreateWorkspace(false)}
        onSuccess={() => {
          // Workspace will be switched automatically by the modal
        }}
      />

      {/* User Settings Modal */}
      <UserSettings
        isOpen={showUserSettings}
        onClose={() => setShowUserSettings(false)}
      />

      {/* Leave Workspace Confirmation Modal */}
      {showLeaveConfirm && currentOrganization && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg w-full max-w-md p-6">
            <h3 className="text-lg font-bold text-red-600 mb-4">Leave Workspace</h3>
            <p className="text-sm text-gray-700 mb-4">
              Are you sure you want to leave <strong>{currentOrganization.name}</strong>?
            </p>
            <p className="text-xs text-gray-600 mb-6">
              You will lose access to all properties, tenants, and data in this workspace. 
              You can be re-invited by an owner if needed.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveConfirm(false)}
                disabled={isLeaving}
                className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-semibold hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmLeaveWorkspace}
                disabled={isLeaving}
                className="flex-1 bg-red-600 text-white py-2 px-4 rounded-lg font-semibold hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {isLeaving ? 'Leaving...' : 'Leave Workspace'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};