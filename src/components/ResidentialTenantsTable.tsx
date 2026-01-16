import React, { useState, useMemo, useCallback } from 'react';
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  useReactTable,
  ColumnDef,
  SortingState,
  ColumnFiltersState,
} from '@tanstack/react-table';
import { 
  UserIcon,
  PhoneIcon,
  EnvelopeIcon,
  HomeIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CurrencyPoundIcon,
  CalendarIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { SimplifiedTenant } from '../utils/simplifiedDataTransforms';
import { SimpleTenantOnboardingService } from '../services/SimpleTenantOnboardingService';
import { EnhancedTenantOnboardingModal } from './EnhancedTenantOnboardingModal';
import { TenantDetailsModal } from './TenantDetailsModal';
import { useCurrency } from '../hooks/useCurrency';

interface ResidentialTenantsTableProps {
  tenants: SimplifiedTenant[];
  properties: any[]; // Add properties for the enhanced onboarding modal
  selectedTenant: SimplifiedTenant | null;
  onTenantSelect: (tenant: SimplifiedTenant) => void;
  onAddTenant: () => void;
  onDeleteTenants?: (tenants: SimplifiedTenant[]) => void;
  onTenantUpdate: (tenant: SimplifiedTenant) => void; // Add callback for tenant updates
}

const formatDate = (date: Date) => {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  }).format(date);
};

const onboardingStatusTypes = [
  { value: '', label: 'All Onboarding' },
  { value: 'not_started', label: 'Not Started' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
];

export const ResidentialTenantsTable: React.FC<ResidentialTenantsTableProps> = ({
  tenants,
  properties,
  selectedTenant,
  onTenantSelect,
  onAddTenant,
  onDeleteTenants,
  onTenantUpdate,
}) => {
  const { formatCurrency } = useCurrency();
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'name', desc: false }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set());
  const [selectedTenantForOnboarding, setSelectedTenantForOnboarding] = useState<SimplifiedTenant | null>(null);
  const [showOnboardingModal, setShowOnboardingModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTenantForDetails, setSelectedTenantForDetails] = useState<SimplifiedTenant | null>(null);

  const handleOnboardingAction = (e: React.MouseEvent, tenant: SimplifiedTenant) => {
    e.stopPropagation(); // Prevent row click
    setSelectedTenantForOnboarding(tenant);
    setShowOnboardingModal(true);
  };

  const handleOnboardingComplete = (updatedTenant: SimplifiedTenant) => {
    onTenantUpdate(updatedTenant);
    setShowOnboardingModal(false);
    setSelectedTenantForOnboarding(null);
  };

  const handleViewDetails = (e: React.MouseEvent, tenant: SimplifiedTenant) => {
    e.stopPropagation(); // Prevent row click
    setSelectedTenantForDetails(tenant);
    setShowDetailsModal(true);
  };

  const handleTenantRowClick = (tenant: SimplifiedTenant) => {
    onTenantSelect(tenant);
    setSelectedTenantForDetails(tenant);
    setShowDetailsModal(true);
  };

  // Checkbox handlers
  const toggleRowSelection = useCallback((tenantId: string) => {
    setSelectedRows(prev => {
      const newSelected = new Set(prev);
      if (newSelected.has(tenantId)) {
        newSelected.delete(tenantId);
      } else {
        newSelected.add(tenantId);
      }
      return newSelected;
    });
  }, []);

  const toggleAllRows = useCallback(() => {
    const safeTenants = tenants || [];
    if (selectedRows.size === safeTenants.length && safeTenants.length > 0) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(safeTenants.map(t => t.id)));
    }
  }, [selectedRows.size, tenants]);

  const handleBulkDelete = useCallback(() => {
    const safeTenants = tenants || [];
    if (onDeleteTenants && selectedRows.size > 0) {
      const tenantsToDelete = safeTenants.filter(t => selectedRows.has(t.id));
      onDeleteTenants(tenantsToDelete);
      setSelectedRows(new Set());
    }
  }, [onDeleteTenants, selectedRows, tenants]);

  const handleTenantHeaderClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    const firstTenant = tenants && tenants.length > 0 ? tenants[0] : null;
    if (firstTenant) {
      setSelectedTenantForDetails(firstTenant);
      setShowDetailsModal(true);
    }
  }, [tenants]);

  const columns = useMemo<ColumnDef<SimplifiedTenant>[]>(() => [
    {
      id: 'select',
      header: ({ table }) => {
        const safeTenants = tenants || [];
        return (
          <input
            type="checkbox"
            checked={selectedRows.size === safeTenants.length && safeTenants.length > 0}
            onChange={toggleAllRows}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        );
      },
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={selectedRows.has(row.original.id)}
            onChange={(e) => {
              e.stopPropagation();
              toggleRowSelection(row.original.id);
            }}
            onClick={(e) => e.stopPropagation()}
            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
          />
        </div>
      ),
      size: 50,
    },
    {
      accessorKey: 'name',
      enableSorting: false,
      header: () => (
        <span 
          className="hover:text-blue-600 transition-colors cursor-pointer"
          onClick={handleTenantHeaderClick}
        >
          Tenant
        </span>
      ),
      cell: info => {
        const tenant = info.row.original;
        return (
          <div className="flex items-center space-x-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <UserIcon className="w-4 h-4 text-blue-600" />
              </div>
            </div>
            <div className="min-w-0 flex-1">
              <div 
                className="text-sm font-medium text-gray-900 truncate cursor-pointer hover:text-blue-600 transition-colors"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedTenantForDetails(tenant);
                  setShowDetailsModal(true);
                }}
              >
                {tenant.name}
              </div>
              <div className="text-xs text-gray-500">
                {tenant.unitNumber ? `Unit: ${tenant.unitNumber}` : 'Whole property'}
              </div>
            </div>
          </div>
        );
      },
      size: 200,
    },
    {
      id: 'contact',
      header: 'Contact',
      cell: info => {
        const tenant = info.row.original;
        return (
          <div className="space-y-1">
            {tenant.phone && (
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <PhoneIcon className="w-3 h-3" />
                <span>{tenant.phone}</span>
              </div>
            )}
            {tenant.email && (
              <div className="flex items-center space-x-2 text-xs text-gray-600">
                <EnvelopeIcon className="w-3 h-3" />
                <span className="truncate">{tenant.email}</span>
              </div>
            )}
          </div>
        );
      },
      size: 180,
    },
    {
      id: 'property',
      header: 'Property',
      cell: info => {
        const tenant = info.row.original;
        return (
          <div className="flex items-center space-x-2">
            <HomeIcon className="w-4 h-4 text-gray-400" />
            <div className="min-w-0 flex-1">
              <div className="text-sm text-gray-900 truncate">
                {tenant.propertyAddress}
              </div>
            </div>
          </div>
        );
      },
      size: 250,
    },
    {
      id: 'lease_dates',
      header: 'Lease Period',
      cell: info => {
        const tenant = info.row.original;
        if (!tenant.leaseStart || !tenant.leaseEnd) {
          return (
            <span className="text-xs text-gray-400 italic">Not set</span>
          );
        }
        const isExpiringSoon = tenant.leaseEnd <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 3 months
        
        return (
          <div className="space-y-1">
            <div className="flex items-center space-x-1 text-xs text-gray-600">
              <CalendarIcon className="w-3 h-3" />
              <span>{formatDate(tenant.leaseStart)} - {formatDate(tenant.leaseEnd)}</span>
            </div>
            {isExpiringSoon && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                Expires soon
              </span>
            )}
          </div>
        );
      },
      size: 160,
    },
    {
      accessorKey: 'monthlyRent',
      header: 'Monthly Rent',
      cell: info => (
        <div className="flex items-center space-x-1">
          <CurrencyPoundIcon className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-900">
            {formatCurrency(info.getValue() as number)}
          </span>
        </div>
      ),
      size: 120,
    },
    {
      id: 'onboardingStatus',
      header: 'Onboarding',
      cell: info => {
        const tenant = info.row.original;
        const onboardingStatus = {
          status: tenant.onboardingStatus || 'not_started',
          progress: tenant.onboardingProgress || 0
        };
        const statusLabels = {
          'not_started': 'Not Started',
          'in_progress': 'In Progress',
          'completed': 'Completed'
        };
        
        const statusColors = {
          'not_started': 'bg-gray-100 text-gray-800 border-gray-200',
          'in_progress': 'bg-blue-100 text-blue-800 border-blue-200',
          'completed': 'bg-green-100 text-green-800 border-green-200'
        };
        
        return (
          <div className="space-y-1">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[onboardingStatus.status]}`}>
              {statusLabels[onboardingStatus.status]}
            </span>
            {onboardingStatus.progress > 0 && (
              <div className="w-16 bg-gray-200 rounded-full h-1">
                <div 
                  className="bg-blue-600 h-1 rounded-full" 
                  style={{ width: `${onboardingStatus.progress}%` }}
                />
              </div>
            )}
          </div>
        );
      },
      filterFn: (row, columnId, filterValue) => {
        const tenant = row.original;
        const status = tenant.onboardingStatus || 'not_started';
        return filterValue === '' || status === filterValue;
      },
      size: 120,
    },
    {
      id: 'deposit',
      header: 'Deposit',
      cell: info => {
        const tenant = info.row.original;
        return (
          <div className="text-sm text-gray-900">
            {formatCurrency(tenant.depositAmount)}
          </div>
        );
      },
      size: 100,
    },
  ], [selectedRows, tenants, toggleAllRows, toggleRowSelection, handleTenantHeaderClick]);

  const table = useReactTable({
    data: tenants || [],
    columns,
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    globalFilterFn: 'includesString',
  });

  return (
    <div className="bg-white rounded-lg shadow border border-gray-200 flex flex-col" style={{ height: 'calc(100vh - 180px)' }}>
      {/* Header */}
      <div className="px-4 py-4 border-b border-gray-200 flex-shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Tenants</h3>
            <p className="text-sm text-gray-500">
              {table.getFilteredRowModel().rows.length} of {tenants?.length || 0} tenants
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            {/* Bulk Delete Button */}
            {selectedRows.size > 0 && onDeleteTenants && (
              <button
                onClick={handleBulkDelete}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
              >
                <TrashIcon className="w-4 h-4 mr-2" />
                Delete ({selectedRows.size})
              </button>
            )}

            {/* Search */}
            <input
              type="text"
              placeholder="Search tenants..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />

            {/* Onboarding Status Filter */}
            <select
              value={(table.getColumn('onboardingStatus')?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn('onboardingStatus')?.setFilterValue(e.target.value || undefined)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {onboardingStatusTypes.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <button
              onClick={onAddTenant}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 whitespace-nowrap"
            >
              <UserIcon className="w-4 h-4 mr-2" />
              Add Tenant
            </button>
          </div>
        </div>
      </div>

      {/* Card Grid */}
      <div className="flex-1 overflow-y-auto p-4 bg-gray-50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {table.getRowModel().rows.map(row => {
            const tenant = row.original;
            const isSelected = selectedTenant?.id === tenant.id;
            const isChecked = selectedRows.has(tenant.id);
            
            // Onboarding Status Logic
            const onboardingStatus = {
              status: tenant.onboardingStatus || 'not_started',
              progress: tenant.onboardingProgress || 0
            };
            const statusLabels: Record<string, string> = {
              'not_started': 'Not Started',
              'in_progress': 'In Progress',
              'completed': 'Completed'
            };
            const statusColors: Record<string, string> = {
              'not_started': 'bg-gray-100 text-gray-800 border-gray-200',
              'in_progress': 'bg-blue-100 text-blue-800 border-blue-200',
              'completed': 'bg-green-100 text-green-800 border-green-200'
            };

            // Lease Logic
            const isExpiringSoon = tenant.leaseEnd && tenant.leaseEnd <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

            return (
              <div 
                key={row.id}
                className={`bg-white rounded-lg shadow-sm border transition-all duration-200 hover:shadow-md flex flex-col
                  ${isSelected ? 'ring-2 ring-blue-500 border-transparent' : 'border-gray-200'}
                  ${isChecked ? 'bg-blue-50' : ''}
                `}
                onClick={() => handleTenantRowClick(tenant)}
              >
                {/* Card Header */}
                <div className="p-4 border-b border-gray-100 flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={(e) => {
                          e.stopPropagation();
                          toggleRowSelection(tenant.id);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                      />
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <UserIcon className="w-3 h-3" />
                        <span className="truncate">{tenant.unitNumber ? `Unit: ${tenant.unitNumber}` : 'Whole property'}</span>
                      </div>
                    </div>
                    <h4 className="text-base font-semibold text-gray-900 truncate" title={tenant.name}>
                      {tenant.name}
                    </h4>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border whitespace-nowrap ${statusColors[onboardingStatus.status]}`}>
                      {statusLabels[onboardingStatus.status]}
                    </span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 space-y-4">
                  {/* Property */}
                  <div className="flex items-start gap-2">
                    <HomeIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <p className="text-sm text-gray-600 line-clamp-2" title={tenant.propertyAddress}>
                      {tenant.propertyAddress}
                    </p>
                  </div>

                  {/* Contact */}
                  <div className="space-y-1">
                    {tenant.phone && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <PhoneIcon className="w-4 h-4 text-gray-400" />
                        <span>{tenant.phone}</span>
                      </div>
                    )}
                    {tenant.email && (
                      <div className="flex items-center gap-2 text-sm text-gray-600">
                        <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                        <span className="truncate" title={tenant.email}>{tenant.email}</span>
                      </div>
                    )}
                  </div>

                  {/* Financials & Dates */}
                  <div className="pt-2 border-t border-gray-50 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <CurrencyPoundIcon className="w-3 h-3" /> Monthly Rent
                      </p>
                      <p className="text-sm font-medium text-gray-900">{formatCurrency(tenant.monthlyRent)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" /> Lease End
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900">
                          {tenant.leaseEnd ? formatDate(tenant.leaseEnd) : 'Not set'}
                        </p>
                        {isExpiringSoon && (
                          <span className="w-2 h-2 rounded-full bg-yellow-400" title="Expires soon" />
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {/* Onboarding Progress Bar */}
                  {onboardingStatus.progress > 0 && (
                    <div className="pt-2">
                      <div className="flex justify-between text-xs text-gray-500 mb-1">
                        <span>Onboarding Progress</span>
                        <span>{onboardingStatus.progress}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className="bg-blue-600 h-1.5 rounded-full transition-all duration-500" 
                          style={{ width: `${onboardingStatus.progress}%` }}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="px-4 py-3 bg-gray-50 rounded-b-lg border-t border-gray-100 flex justify-between items-center">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOnboardingAction(e, tenant);
                    }}
                    className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    Manage Onboarding
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleViewDetails(e, tenant);
                    }}
                    className="text-sm font-medium text-gray-700 hover:text-gray-900 bg-white border border-gray-300 hover:bg-gray-50 rounded px-3 py-1.5 transition-colors shadow-sm"
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Empty State */}
      {table.getRowModel().rows.length === 0 && (
        <div className="text-center py-12">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <UserIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No tenants found</h3>
          <p className="text-gray-500 mb-4">
            {globalFilter || columnFilters.length > 0
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first tenant'
            }
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <button
              onClick={onAddTenant}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50"
            >
              <UserIcon className="w-4 h-4 mr-2" />
              Add Tenant
            </button>
            

          </div>
        </div>
      )}
      {/* Onboarding Management Modal */}
      {showOnboardingModal && selectedTenantForOnboarding && (
        <EnhancedTenantOnboardingModal
          isOpen={showOnboardingModal}
          onClose={() => {
            setShowOnboardingModal(false);
            setSelectedTenantForOnboarding(null);
          }}
          tenant={selectedTenantForOnboarding}
          property={properties.find(p => p.id === selectedTenantForOnboarding.propertyId) || properties[0]}
          onComplete={handleOnboardingComplete}
        />
      )}

      {/* Tenant Details Modal */}
      <TenantDetailsModal
        isOpen={showDetailsModal}
        onClose={() => {
          setShowDetailsModal(false);
          setSelectedTenantForDetails(null);
        }}
        tenant={selectedTenantForDetails}
        onTenantUpdate={(updatedTenant) => {
          onTenantUpdate(updatedTenant);
          // Update the selected tenant in the modal so it shows fresh data
          setSelectedTenantForDetails(updatedTenant);
        }}
      />
    </div>
  );
};