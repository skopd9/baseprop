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
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Tenants</h3>
            <p className="text-sm text-gray-500">
              {table.getFilteredRowModel().rows.length} of {tenants?.length || 0} tenants
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
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

            <div className="flex space-x-3">
              <button
                onClick={onAddTenant}
                className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <UserIcon className="w-4 h-4 mr-2" />
                Add Tenant
              </button>
              

            </div>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto overflow-y-auto flex-1 min-h-0">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50 sticky top-0 z-10">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    style={{ width: header.getSize() }}
                    onClick={header.column.getCanSort() ? header.column.getToggleSortingHandler() : undefined}
                  >
                    <div className="flex items-center space-x-1">
                      <span>
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())
                        }
                      </span>
                      {header.column.getCanSort() && (
                        <div className="flex flex-col">
                          {header.column.getIsSorted() === 'asc' ? (
                            <ChevronUpIcon className="w-3 h-3 text-gray-600" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ChevronDownIcon className="w-3 h-3 text-gray-600" />
                          ) : (
                            <div className="w-3 h-3 opacity-0">
                              <ChevronUpIcon className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="divide-y divide-gray-100">
            {table.getRowModel().rows.map(row => {
              const isSelected = selectedTenant?.id === row.original.id;
              return (
                <tr
                  key={row.id}
                  className={`cursor-pointer transition-colors hover:bg-blue-25 ${
                    isSelected
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : 'border-l-4 border-transparent hover:border-l-4 hover:border-blue-200'
                  }`}
                  onClick={() => handleTenantRowClick(row.original)}
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-4 whitespace-nowrap text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
          {/* End of Table Indicator */}
          {table.getRowModel().rows.length > 0 && (
            <tfoot className="sticky bottom-0 bg-gray-50 z-10">
              <tr>
                <td colSpan={8} className="px-4 py-3 text-center text-xs text-gray-500 border-t border-gray-200">
                  End of table • {table.getRowModel().rows.length} {table.getRowModel().rows.length === 1 ? 'tenant' : 'tenants'} shown
                </td>
              </tr>
            </tfoot>
          )}
        </table>
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
        onStartOnboarding={(tenant) => {
          setSelectedTenantForOnboarding(tenant);
          setShowOnboardingModal(true);
        }}
      />
    </div>
  );
};