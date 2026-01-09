import React, { useState, useMemo } from 'react';
import { 
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  InformationCircleIcon,
  MapPinIcon
} from '@heroicons/react/24/outline';
import { SimplifiedProperty, SimplifiedTenant, getOccupancyStatus } from '../utils/simplifiedDataTransforms';
import { PropertyMap } from './PropertyMap';
import { useCurrency } from '../hooks/useCurrency';

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

// Mini Calendar Component
const MiniCalendar: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const dayNames = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  
  const firstDayOfMonth = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();
  
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
  const todayDate = today.getDate();
  
  const prevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
  const nextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
  
  // Generate calendar days
  const calendarDays: { day: number; isCurrentMonth: boolean; isToday: boolean }[] = [];
  
  // Previous month days
  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    calendarDays.push({ day: daysInPrevMonth - i, isCurrentMonth: false, isToday: false });
  }
  
  // Current month days
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push({ 
      day: i, 
      isCurrentMonth: true, 
      isToday: isCurrentMonth && i === todayDate 
    });
  }
  
  // Next month days to fill the grid
  const remainingDays = 42 - calendarDays.length;
  for (let i = 1; i <= remainingDays; i++) {
    calendarDays.push({ day: i, isCurrentMonth: false, isToday: false });
  }
  
  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <button 
          onClick={prevMonth}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <ChevronLeftIcon className="w-4 h-4 text-gray-600" />
        </button>
        <span className="text-sm font-medium text-gray-900">
          {monthNames[month]} {year}
        </span>
        <button 
          onClick={nextMonth}
          className="p-1 hover:bg-gray-100 rounded transition-colors"
        >
          <ChevronRightIcon className="w-4 h-4 text-gray-600" />
        </button>
      </div>
      
      <div className="grid grid-cols-7 gap-1">
        {dayNames.map(day => (
          <div key={day} className="text-center text-xs font-medium text-gray-500 py-1">
            {day}
          </div>
        ))}
        {calendarDays.map((item, index) => (
          <div
            key={index}
            className={`text-center text-xs py-1.5 rounded ${
              item.isToday 
                ? 'bg-blue-600 text-white font-semibold' 
                : item.isCurrentMonth 
                  ? 'text-gray-900 hover:bg-gray-50' 
                  : 'text-gray-400'
            }`}
          >
            {item.day}
          </div>
        ))}
      </div>
    </div>
  );
};

export const SimplifiedDashboard: React.FC<SimplifiedDashboardProps> = ({
  properties,
  tenants,
  selectedProperty,
  onPropertySelect,
}) => {
  const { formatCurrency } = useCurrency();

  // Calculate statistics from actual data
  const stats = useMemo(() => {
    const propertiesArray = Array.isArray(properties) ? properties : [];
    const tenantsArray = Array.isArray(tenants) ? tenants : [];
    
    const totalProperties = propertiesArray.length;
    const occupiedProperties = propertiesArray.filter(p => getOccupancyStatus(p, tenantsArray) === 'occupied').length;
    const vacantProperties = propertiesArray.filter(p => getOccupancyStatus(p, tenantsArray) === 'vacant' && p.status !== 'sold').length;
    const underManagement = propertiesArray.filter(p => p.status === 'under_management' || p.status === 'occupied').length;
    const soldProperties = propertiesArray.filter(p => p.status === 'sold').length;
    
    // Rent status calculations
    const paidOnTime = tenantsArray.filter(t => t.rentStatus === 'paid').length;
    const dueSoon = tenantsArray.filter(t => t.rentStatus === 'due').length;
    const overdue = tenantsArray.filter(t => t.rentStatus === 'overdue').length;
    const totalRentStatuses = paidOnTime + dueSoon + overdue;
    const paidPercentage = totalRentStatuses > 0 ? Math.round((paidOnTime / totalRentStatuses) * 100) : 100;

    return {
      totalProperties,
      occupiedProperties,
      vacantProperties,
      underManagement,
      soldProperties,
      paidOnTime,
      dueSoon,
      overdue,
      totalRentStatuses,
      paidPercentage
    };
  }, [properties, tenants]);

  // Calculate urgent items
  const urgentItems = useMemo(() => {
    const tenantsArray = Array.isArray(tenants) ? tenants : [];
    const propertiesArray = Array.isArray(properties) ? properties : [];
    
    const overdueRent = tenantsArray
      .filter(t => t.rentStatus === 'overdue')
      .map(t => ({ type: 'rent', message: `${t.name} - Rent overdue`, property: t.propertyAddress }));
    
    const expiringLeases = tenantsArray
      .filter(t => {
        if (!t.leaseEnd) return false;
        const oneMonthFromNow = new Date();
        oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);
        return t.leaseEnd <= oneMonthFromNow;
      })
      .map(t => ({ type: 'lease', message: `${t.name} - Lease expires soon`, property: t.propertyAddress }));
    
    const vacancies = propertiesArray
      .filter(p => getOccupancyStatus(p, tenantsArray) === 'vacant' && p.status === 'under_management')
      .map(p => ({ type: 'vacancy', message: `${p.address} - Property vacant`, property: p.address }));
    
    return [...overdueRent, ...expiringLeases, ...vacancies];
  }, [properties, tenants]);

  // Calculate property type breakdown for progress bars
  const propertyBreakdown = useMemo(() => {
    const propertiesArray = Array.isArray(properties) ? properties : [];
    const total = propertiesArray.length;
    
    const types = {
      house: propertiesArray.filter(p => p.propertyType === 'house').length,
      apartment: propertiesArray.filter(p => p.propertyType === 'apartment' || p.propertyType === 'flat').length,
      hmo: propertiesArray.filter(p => p.propertyType === 'hmo').length,
      commercial: propertiesArray.filter(p => p.propertyType === 'commercial').length,
    };
    
    return { total, types };
  }, [properties]);

  // Recent activity mock (could be expanded with real data)
  const recentActivity = useMemo(() => {
    const tenantsArray = Array.isArray(tenants) ? tenants : [];
    return tenantsArray
      .filter(t => t.rentStatus === 'paid')
      .slice(0, 5)
      .map(t => ({
        action: 'Rent payment received',
        detail: t.name,
        amount: formatCurrency(t.monthlyRent),
        date: 'Recently'
      }));
  }, [tenants, formatCurrency]);

  return (
    <div className="bg-gray-50 min-h-screen">
      <div className="pt-4 px-4 sm:px-6 pb-6 max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Property Overview</h1>
          <p className="text-sm text-gray-600 mt-1">
            Monitor property status, rent collection, and portfolio performance
          </p>
        </div>

        {/* Top Stats Row - 5 cards with green left border */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
          {/* Total Properties */}
          <div className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-emerald-500 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total Properties</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalProperties}</p>
          </div>

          {/* Vacant */}
          <div className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-emerald-500 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Vacant</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.vacantProperties}</p>
          </div>

          {/* Under Management */}
          <div className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-emerald-500 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Under Management</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.underManagement}</p>
          </div>

          {/* Occupied */}
          <div className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-emerald-500 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Occupied</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.occupiedProperties}</p>
          </div>

          {/* Sold */}
          <div className="bg-white rounded-lg border border-gray-200 border-l-4 border-l-emerald-500 p-4">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Sold</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{stats.soldProperties}</p>
          </div>
        </div>

        {/* Property Map Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-gray-900">Property Locations</h2>
              <p className="text-xs text-gray-500">View all properties on the map</p>
            </div>
            <MapPinIcon className="w-5 h-5 text-gray-400" />
          </div>
          <PropertyMap
            properties={properties}
            selectedProperty={selectedProperty}
            onPropertySelect={onPropertySelect}
            height="300px"
          />
        </div>

        {/* Middle Row - 3 cards */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {/* Items Needing Attention */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-gray-900">Items Needing Attention</h2>
              <p className="text-xs text-gray-500">Properties and tenants requiring action</p>
            </div>
            
            {urgentItems.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mb-3">
                  <CheckCircleIcon className="w-10 h-10 text-green-500" />
                </div>
                <p className="text-base font-medium text-gray-900">No Items Pending</p>
                <p className="text-xs text-gray-500 text-center mt-1 max-w-[200px]">
                  All properties and tenants are in good standing.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[200px] overflow-y-auto">
                {urgentItems.slice(0, 5).map((item, index) => (
                  <div 
                    key={index} 
                    className={`flex items-start gap-3 p-3 rounded-lg ${
                      item.type === 'rent' ? 'bg-red-50' : 
                      item.type === 'lease' ? 'bg-yellow-50' : 'bg-orange-50'
                    }`}
                  >
                    <ExclamationTriangleIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                      item.type === 'rent' ? 'text-red-500' : 
                      item.type === 'lease' ? 'text-yellow-500' : 'text-orange-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{item.message}</p>
                      <p className="text-xs text-gray-500 truncate">{item.property}</p>
                    </div>
                  </div>
                ))}
                {urgentItems.length > 5 && (
                  <p className="text-xs text-gray-500 text-center pt-2">
                    +{urgentItems.length - 5} more items
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Rent Status Summary */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-gray-900">Rent Status Summary</h2>
              <p className="text-xs text-gray-500">Overview of rent collection status</p>
            </div>
            
            {/* Metrics Row */}
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-600">{stats.paidOnTime}</p>
                <p className="text-xs text-green-700 font-medium">Paid</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-yellow-600">{stats.dueSoon}</p>
                <p className="text-xs text-yellow-700 font-medium">Due Soon</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-600">{stats.overdue}</p>
                <p className="text-xs text-red-700 font-medium">Overdue</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-green-500 rounded-full transition-all duration-500"
                  style={{ width: `${stats.paidPercentage}%` }}
                />
              </div>
              <div className="flex justify-between mt-2 text-xs text-gray-500">
                <span>{stats.paidPercentage}% collected</span>
                <span>{stats.totalRentStatuses} total tenants</span>
              </div>
            </div>
          </div>

          {/* Calendar */}
          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="mb-2">
              <h2 className="text-base font-semibold text-gray-900">Calendar</h2>
            </div>
            <MiniCalendar />
          </div>
        </div>

        {/* Bottom Row - 2 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
          {/* Property Progress - Takes 3 columns */}
          <div className="lg:col-span-3 bg-white rounded-lg border border-gray-200 p-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-gray-900">Portfolio Breakdown</h2>
              <p className="text-xs text-gray-500">Property types and status overview</p>
            </div>
            
            <div className="space-y-4">
              {/* By Status */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Occupied Properties</span>
                    <InformationCircleIcon className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {stats.totalProperties > 0 ? Math.round((stats.occupiedProperties / stats.totalProperties) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-green-500 rounded-full transition-all duration-500"
                    style={{ width: `${stats.totalProperties > 0 ? (stats.occupiedProperties / stats.totalProperties) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{stats.occupiedProperties} of {stats.totalProperties} properties</p>
              </div>

              {/* Houses */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Houses</span>
                    <InformationCircleIcon className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {propertyBreakdown.total > 0 ? Math.round((propertyBreakdown.types.house / propertyBreakdown.total) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                    style={{ width: `${propertyBreakdown.total > 0 ? (propertyBreakdown.types.house / propertyBreakdown.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{propertyBreakdown.types.house} properties</p>
              </div>

              {/* Apartments/Flats */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-700">Apartments / Flats</span>
                    <InformationCircleIcon className="w-4 h-4 text-gray-400" />
                  </div>
                  <span className="text-sm font-semibold text-gray-900">
                    {propertyBreakdown.total > 0 ? Math.round((propertyBreakdown.types.apartment / propertyBreakdown.total) * 100) : 0}%
                  </span>
                </div>
                <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-purple-500 rounded-full transition-all duration-500"
                    style={{ width: `${propertyBreakdown.total > 0 ? (propertyBreakdown.types.apartment / propertyBreakdown.total) * 100 : 0}%` }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">{propertyBreakdown.types.apartment} properties</p>
              </div>

              {/* HMO */}
              {propertyBreakdown.types.hmo > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-700">HMO</span>
                      <InformationCircleIcon className="w-4 h-4 text-gray-400" />
                    </div>
                    <span className="text-sm font-semibold text-gray-900">
                      {propertyBreakdown.total > 0 ? Math.round((propertyBreakdown.types.hmo / propertyBreakdown.total) * 100) : 0}%
                    </span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-orange-500 rounded-full transition-all duration-500"
                      style={{ width: `${propertyBreakdown.total > 0 ? (propertyBreakdown.types.hmo / propertyBreakdown.total) * 100 : 0}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{propertyBreakdown.types.hmo} properties</p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity - Takes 2 columns */}
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 p-5">
            <div className="mb-4">
              <h2 className="text-base font-semibold text-gray-900">Recent Activity</h2>
              <p className="text-xs text-gray-500">Latest payments and updates</p>
            </div>
            
            {recentActivity.length > 0 ? (
              <div className="space-y-3">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-center gap-3 py-2 border-b border-gray-100 last:border-0">
                    <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                      <CheckCircleIcon className="w-4 h-4 text-green-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{activity.action}</p>
                      <p className="text-xs text-gray-500 truncate">{activity.detail}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-sm font-semibold text-green-600">{activity.amount}</p>
                      <p className="text-xs text-gray-400">{activity.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <ClockIcon className="w-12 h-12 text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No recent activity</p>
                <p className="text-xs text-gray-400 mt-1">Activity will appear here as you add properties and tenants</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
