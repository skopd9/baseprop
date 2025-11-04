import React from 'react';
import { 
  ChartBarIcon,
  CurrencyDollarIcon,
  HomeIcon,
  ArrowTrendingUpIcon,
  MapPinIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';
import { Property, WorkflowInstance } from '../types';
import { SimpleMap } from './SimpleMap';

interface DashboardProps {
  properties: Property[];
  workflowInstances: WorkflowInstance[];
}

export const Dashboard: React.FC<DashboardProps> = ({ properties, workflowInstances }) => {

  // Calculate KPIs
  const totalProperties = properties.length;
  const totalValue = properties.reduce((sum, p) => sum + (p.current_value || 0), 0);
  const totalAcquisitionCost = properties.reduce((sum, p) => sum + (p.acquisition_price || 0), 0);
  const totalAppreciation = totalValue - totalAcquisitionCost;
  const averageAppreciation = totalAcquisitionCost > 0 ? ((totalValue - totalAcquisitionCost) / totalAcquisitionCost) * 100 : 0;
  
  const activeWorkflows = workflowInstances.filter(w => w.status === 'active').length;
  const completedThisMonth = workflowInstances.filter(w => {
    if (w.completed_at) {
      const completedDate = new Date(w.completed_at);
      const now = new Date();
      return completedDate.getMonth() === now.getMonth() && 
             completedDate.getFullYear() === now.getFullYear();
    }
    return false;
  }).length;

  // Removed old Mapbox code - now using SimpleMap component

  // Marker color function moved to SimpleMap component

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatPercentage = (percentage: number) => {
    return `${percentage >= 0 ? '+' : ''}${percentage.toFixed(1)}%`;
  };

  // Debug: Log KPI calculations
  console.log('🏢 Dashboard KPIs:', {
    properties: totalProperties,
    portfolioValue: totalValue,
    appreciation: totalAppreciation,
    appreciationPercent: averageAppreciation
  });

  return (
    <div className="flex-1 overflow-auto bg-gray-50">
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Portfolio Dashboard</h1>
          <p className="text-xs sm:text-sm text-gray-500">Overview of your real estate portfolio performance</p>
        </div>

        {/* KPI Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        {/* Total Properties */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total Properties</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{totalProperties}</p>
            </div>
            <div className="p-2 sm:p-3 bg-blue-100 rounded-lg">
              <HomeIcon className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm">
            <span className="text-green-600">Active portfolio</span>
          </div>
        </div>

        {/* Total Portfolio Value */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Portfolio Value</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{formatCurrency(totalValue)}</p>
            </div>
            <div className="p-2 sm:p-3 bg-green-100 rounded-lg">
              <CurrencyDollarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-green-600" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm">
            <span className="text-gray-600">Current market value</span>
          </div>
        </div>

        {/* Total Appreciation */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Total Appreciation</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{formatCurrency(totalAppreciation)}</p>
            </div>
            <div className="p-2 sm:p-3 bg-purple-100 rounded-lg">
              <ArrowTrendingUpIcon className="w-5 h-5 sm:w-6 sm:h-6 text-purple-600" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm">
            <span className={`${averageAppreciation >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(averageAppreciation)} since acquisition
            </span>
          </div>
        </div>

        {/* Active Workflows */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm font-medium text-gray-600">Active Workflows</p>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900">{activeWorkflows}</p>
            </div>
            <div className="p-2 sm:p-3 bg-orange-100 rounded-lg">
              <ChartBarIcon className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
            </div>
          </div>
          <div className="mt-3 sm:mt-4 flex items-center text-xs sm:text-sm">
            <span className="text-blue-600">{completedThisMonth} completed this month</span>
          </div>
        </div>
      </div>

        {/* Map and Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Property Map */}
          <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Property Locations</h2>
              <MapPinIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            </div>
            
            {/* Simple Map */}
            <SimpleMap height="300px" properties={properties} />
          </div>

          {/* Recent Activity */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 sm:mb-6">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900">Recent Activity</h2>
              <CalendarIcon className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            </div>
            
            <div className="space-y-3 sm:space-y-4">
              {workflowInstances.slice(0, 5).map((workflow) => (
                <div key={workflow.id} className="flex items-start space-x-2 sm:space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-1.5 sm:mt-2 flex-shrink-0 ${
                    workflow.status === 'completed' ? 'bg-green-500' :
                    workflow.status === 'active' ? 'bg-blue-500' :
                    workflow.status === 'paused' ? 'bg-yellow-500' : 'bg-gray-500'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-900 truncate">
                      {workflow.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      Status: {workflow.status}
                    </p>
                    <p className="text-xs text-gray-400">
                      {new Date(workflow.started_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              ))}
            
              {workflowInstances.length === 0 && (
                <div className="text-center py-6 sm:py-8">
                  <ChartBarIcon className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-3 sm:mb-4" />
                  <p className="text-xs sm:text-sm text-gray-500">No recent activity</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};