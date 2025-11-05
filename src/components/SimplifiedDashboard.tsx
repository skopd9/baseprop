import React, { useState } from 'react';
import { 
  HomeIcon,
  UserGroupIcon,
  CurrencyPoundIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { SimplifiedProperty, SimplifiedTenant, getOccupancyStatus } from '../utils/simplifiedDataTransforms';
import { ExpensesSummaryWidget } from './ExpensesSummaryWidget';
import { PropertyMap } from './PropertyMap';

interface SimplifiedDashboardProps {
  properties: SimplifiedProperty[];
  tenants: SimplifiedTenant[];
  onAddProperty?: () => void;
  onAddTenant?: () => void;
  onViewRent?: () => void;
  onViewInspections?: () => void;
  onViewExpenses?: () => void;
  onLoadDemoData?: () => void;
  isLoadingDemo?: boolean;
  selectedProperty?: SimplifiedProperty | null;
  onPropertySelect?: (property: SimplifiedProperty) => void;
}

export const SimplifiedDashboard: React.FC<SimplifiedDashboardProps> = ({
  properties,
  tenants,
  onAddProperty,
  onAddTenant,
  onViewRent,
  onViewInspections,
  onViewExpenses,
  onLoadDemoData,
  isLoadingDemo,
  selectedProperty,
  onPropertySelect
}) => {
  // State for collapsible categories
  const [expandedCategories, setExpandedCategories] = useState<{
    rent: boolean;
    leases: boolean;
    vacancies: boolean;
  }>({
    rent: false,
    leases: false,
    vacancies: false
  });

  const toggleCategory = (category: 'rent' | 'leases' | 'vacancies') => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  // Calculate statistics from actual data
  const stats = React.useMemo(() => {
    // Safety checks: ensure arrays are valid
    const propertiesArray = Array.isArray(properties) ? properties : [];
    const tenantsArray = Array.isArray(tenants) ? tenants : [];
    
    const totalProperties = propertiesArray.length;
    const totalTenants = tenantsArray.length;
    const occupiedProperties = propertiesArray.filter(p => getOccupancyStatus(p, tenantsArray) === 'occupied').length;
    const vacantProperties = propertiesArray.filter(p => getOccupancyStatus(p, tenantsArray) === 'vacant').length;
    const soldProperties = propertiesArray.filter(p => p.status === 'sold').length;
    
    const totalMonthlyRent = tenantsArray.reduce((sum, tenant) => sum + tenant.monthlyRent, 0);
    const overdueRent = tenantsArray.filter(t => t.rentStatus === 'overdue').length;
    
    const leasesExpiringIn3Months = tenantsArray.filter(tenant => {
      if (!tenant.leaseEnd) return false;
      const threeMonthsFromNow = new Date();
      threeMonthsFromNow.setMonth(threeMonthsFromNow.getMonth() + 3);
      return tenant.leaseEnd <= threeMonthsFromNow;
    }).length;

    const occupancyRate = totalProperties > 0 ? Math.round((occupiedProperties / totalProperties) * 100) : 0;

    return {
      totalProperties,
      totalTenants,
      occupiedProperties,
      vacantProperties,
      soldProperties,
      totalMonthlyRent,
      overdueRent,
      leasesExpiringIn3Months,
      occupancyRate
    };
  }, [properties, tenants]);

  // Calculate urgent items with safety checks, grouped by category
  const urgentItemsByCategory = React.useMemo(() => {
    const overdueRentItems = (Array.isArray(tenants) ? tenants : [])
      .filter(t => t.rentStatus === 'overdue')
      .map(t => ({
        type: 'rent' as const,
        message: `${t.name} - Rent overdue`,
        property: t.propertyAddress,
        priority: 'high' as const
      }));

    const expiringLeaseItems = (Array.isArray(tenants) ? tenants : [])
      .filter(t => {
        if (!t.leaseEnd) return false;
        const oneMonthFromNow = new Date();
        oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
        return t.leaseEnd <= oneMonthFromNow;
      })
      .map(t => ({
        type: 'lease' as const,
        message: `${t.name} - Lease expires soon`,
        property: t.propertyAddress,
        priority: 'medium' as const
      }));

    const vacancyItems = (Array.isArray(properties) ? properties : [])
      .filter(p => getOccupancyStatus(p, Array.isArray(tenants) ? tenants : []) === 'vacant' && p.status === 'under_management')
      .map(p => ({
        type: 'vacancy' as const,
        message: `${p.address} - Property vacant`,
        property: p.address,
        priority: 'high' as const
      }));

    return {
      rent: overdueRentItems,
      leases: expiringLeaseItems,
      vacancies: vacancyItems
    };
  }, [properties, tenants]);

  const urgentItems = [
    ...urgentItemsByCategory.rent,
    ...urgentItemsByCategory.leases,
    ...urgentItemsByCategory.vacancies
  ];

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Property Dashboard</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1 sm:mt-2">Welcome back! Here's what's happening with your properties.</p>
        </div>

        {/* Key Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Total Properties */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Properties</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalProperties}</p>
              </div>
              <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
                <HomeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm">
              <span className="text-green-600">{stats.occupancyRate}% occupied</span>
            </div>
          </div>

          {/* Total Tenants */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Tenants</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{stats.totalTenants}</p>
              </div>
              <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
                <UserGroupIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm">
              <span className="text-gray-600">Across {stats.occupiedProperties} properties</span>
            </div>
          </div>

          {/* Monthly Rent */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Monthly Rent</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{formatCurrency(stats.totalMonthlyRent)}</p>
              </div>
              <div className="p-2 sm:p-3 bg-purple-100 rounded-lg">
                <CurrencyPoundIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm">
              {stats.overdueRent > 0 ? (
                <span className="text-red-600">{stats.overdueRent} overdue payments</span>
              ) : (
                <span className="text-green-600">All payments current</span>
              )}
            </div>
          </div>

          {/* Urgent Items */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-600">Urgent Items</p>
                <p className="text-2xl sm:text-3xl font-bold text-gray-900">{urgentItems.length}</p>
              </div>
              <div className="p-2 sm:p-3 bg-orange-100 rounded-lg">
                <ExclamationTriangleIcon className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
              </div>
            </div>
            <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm">
              <span className="text-orange-600">Need attention</span>
            </div>
          </div>
        </div>


        {/* Map Section */}
        <div className="mb-6 sm:mb-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Property Locations</h2>
              <MapPinIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            </div>
            <PropertyMap
              properties={properties}
              selectedProperty={selectedProperty}
              onPropertySelect={onPropertySelect}
              height="400px"
            />
          </div>
        </div>

        {/* Three Column Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">          {/* Urgent Items List - Grouped by Category */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Items Needing Attention</h2>
              <div className="flex items-center space-x-2">
                <span className="text-xs sm:text-sm font-medium text-gray-600">{urgentItems.length}</span>
                <ExclamationTriangleIcon className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
              </div>
            </div>
            
            {urgentItems.length > 0 ? (
              <div className="space-y-3">
                {/* Overdue Rent Category */}
                {urgentItemsByCategory.rent.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleCategory('rent')}
                      className="w-full flex items-center justify-between p-3 bg-red-50 hover:bg-red-100 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <CurrencyPoundIcon className="w-4 h-4 text-red-600" />
                        <h3 className="text-sm font-semibold text-gray-900">Overdue Rent</h3>
                        <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full">
                          {urgentItemsByCategory.rent.length}
                        </span>
                      </div>
                      {expandedCategories.rent ? (
                        <ChevronUpIcon className="w-4 h-4 text-gray-600" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                    {expandedCategories.rent && (
                      <div className="p-2 space-y-2 bg-white">
                        {urgentItemsByCategory.rent.map((item, index) => (
                          <div key={`rent-${index}`} className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 bg-red-50 rounded-lg border-l-2 border-red-500">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-gray-900">{item.message}</p>
                              <p className="text-xs text-gray-500 truncate">{item.property}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Expiring Leases Category */}
                {urgentItemsByCategory.leases.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleCategory('leases')}
                      className="w-full flex items-center justify-between p-3 bg-yellow-50 hover:bg-yellow-100 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <ClockIcon className="w-4 h-4 text-yellow-600" />
                        <h3 className="text-sm font-semibold text-gray-900">Expiring Leases</h3>
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                          {urgentItemsByCategory.leases.length}
                        </span>
                      </div>
                      {expandedCategories.leases ? (
                        <ChevronUpIcon className="w-4 h-4 text-gray-600" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                    {expandedCategories.leases && (
                      <div className="p-2 space-y-2 bg-white">
                        {urgentItemsByCategory.leases.map((item, index) => (
                          <div key={`lease-${index}`} className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 bg-yellow-50 rounded-lg border-l-2 border-yellow-500">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-gray-900">{item.message}</p>
                              <p className="text-xs text-gray-500 truncate">{item.property}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Vacancies Category */}
                {urgentItemsByCategory.vacancies.length > 0 && (
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    <button
                      onClick={() => toggleCategory('vacancies')}
                      className="w-full flex items-center justify-between p-3 bg-orange-50 hover:bg-orange-100 transition-colors"
                    >
                      <div className="flex items-center space-x-2">
                        <HomeIcon className="w-4 h-4 text-orange-600" />
                        <h3 className="text-sm font-semibold text-gray-900">Vacant Properties</h3>
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                          {urgentItemsByCategory.vacancies.length}
                        </span>
                      </div>
                      {expandedCategories.vacancies ? (
                        <ChevronUpIcon className="w-4 h-4 text-gray-600" />
                      ) : (
                        <ChevronDownIcon className="w-4 h-4 text-gray-600" />
                      )}
                    </button>
                    {expandedCategories.vacancies && (
                      <div className="p-2 space-y-2 bg-white">
                        {urgentItemsByCategory.vacancies.map((item, index) => (
                          <div key={`vacancy-${index}`} className="flex items-start space-x-2 sm:space-x-3 p-2 sm:p-3 bg-orange-50 rounded-lg border-l-2 border-orange-500">
                            <div className="flex-1 min-w-0">
                              <p className="text-xs sm:text-sm font-medium text-gray-900">{item.message}</p>
                              <p className="text-xs text-gray-500 truncate">{item.property}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-6 sm:py-8">
                <CheckCircleIcon className="w-10 h-10 sm:w-12 sm:h-12 text-green-500 mx-auto mb-3 sm:mb-4" />
                <p className="text-xs sm:text-sm text-gray-500">All caught up! No urgent items.</p>
              </div>
            )}
          </div>

          {/* Property Status Overview */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Property Status</h2>
              <HomeIcon className="w-4 h-4 sm:w-5 sm:h-5 text-blue-500" />
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              {/* Occupied Properties */}
              <div className="flex items-center justify-between p-2 sm:p-3 bg-green-50 rounded-lg">
                <div className="flex items-center space-x-2 sm:space-x-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full flex-shrink-0"></div>
                  <span className="text-xs sm:text-sm font-medium text-gray-900">Occupied</span>
                </div>
                <span className="text-xs sm:text-sm font-bold text-green-700">{stats.occupiedProperties}</span>
              </div>

              {/* Vacant Properties */}
              {stats.vacantProperties > 0 && (
                <div className="flex items-center justify-between p-2 sm:p-3 bg-yellow-50 rounded-lg">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full flex-shrink-0"></div>
                    <span className="text-xs sm:text-sm font-medium text-gray-900">Vacant</span>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-yellow-700">{stats.vacantProperties}</span>
                </div>
              )}

              {/* Sold Properties */}
              {stats.soldProperties > 0 && (
                <div className="flex items-center justify-between p-2 sm:p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className="w-3 h-3 bg-gray-500 rounded-full flex-shrink-0"></div>
                    <span className="text-xs sm:text-sm font-medium text-gray-900">Sold</span>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-gray-700">{stats.soldProperties}</span>
                </div>
              )}

              {/* Lease Renewals */}
              {stats.leasesExpiringIn3Months > 0 && (
                <div className="flex items-center justify-between p-2 sm:p-3 bg-blue-50 rounded-lg">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <ClockIcon className="w-3 h-3 sm:w-4 sm:h-4 text-blue-500 flex-shrink-0" />
                    <span className="text-xs sm:text-sm font-medium text-gray-900">Leases Expiring Soon</span>
                  </div>
                  <span className="text-xs sm:text-sm font-bold text-blue-700">{stats.leasesExpiringIn3Months}</span>
                </div>
              )}
            </div>
          </div>

          {/* Expenses Summary */}
          <ExpensesSummaryWidget onViewExpenses={onViewExpenses} />
        </div>
      </div>
    </div>
  );
};