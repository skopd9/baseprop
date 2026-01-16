import React, { useState, useMemo } from 'react';
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
  BuildingOffice2Icon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';
import { TenantRegisterModal } from './TenantRegisterModal';

interface Tenant {
  id: string;
  tenant_type: 'individual' | 'company' | 'organization';
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  tenant_data: Record<string, any>;
  status: 'active' | 'inactive' | 'blacklisted' | 'prospective';
  created_at: string;
  updated_at: string;
}

interface TenantsTableProps {
  tenants: Tenant[];
  selectedTenant: Tenant | null;
  onTenantSelect: (tenant: Tenant) => void;
  onTenantsUpdate?: (updatedTenant: Tenant) => void;
  onAddTenant?: () => void;
}

const getTenantIcon = (tenantType: string) => {
  switch (tenantType) {
    case 'individual':
      return <UserIcon className="w-4 h-4 text-blue-600" />;
    case 'company':
      return <BuildingOffice2Icon className="w-4 h-4 text-green-600" />;
    case 'organization':
      return <BuildingOffice2Icon className="w-4 h-4 text-purple-600" />;
    default:
      return <UserIcon className="w-4 h-4 text-gray-600" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'inactive':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    case 'blacklisted':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'prospective':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const tenantTypes = [
  { value: '', label: 'All Types' },
  { value: 'individual', label: 'Individual' },
  { value: 'company', label: 'Company' },
  { value: 'organization', label: 'Organization' },
];

const statusTypes = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'prospective', label: 'Prospective' },
  { value: 'blacklisted', label: 'Blacklisted' },
];

const tenantTypeLabels: Record<string, string> = {
  'individual': 'Individual',
  'company': 'Company',
  'organization': 'Organization',
};

export const TenantsTable: React.FC<TenantsTableProps> = ({
  tenants,
  selectedTenant,
  onTenantSelect,
  onTenantsUpdate,
  onAddTenant,
}) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'name', desc: false }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showTenantModal, setShowTenantModal] = useState(false);
  const [modalTenantId, setModalTenantId] = useState<string | null>(null);

  const columns = useMemo<ColumnDef<Tenant>[]>(() => [
    {
      accessorKey: 'name',
      header: 'Tenant',
      cell: info => {
        const tenant = info.row.original;
        return (
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {getTenantIcon(tenant.tenant_type)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900 truncate">
                {info.getValue() as string}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {tenant.contact_person && `Contact: ${tenant.contact_person}`}
                {tenant.email && ` • ${tenant.email}`}
              </div>
            </div>
          </div>
        );
      },
      size: 250,
    },
    {
      id: 'tenant_type',
      header: 'Type',
      cell: info => {
        const tenant = info.row.original;
        return (
          <div>
            <div className="text-sm text-gray-900">
              {tenantTypeLabels[tenant.tenant_type] || tenant.tenant_type}
            </div>
            {tenant.tenant_data?.industry && (
              <div className="text-xs text-gray-500">
                {tenant.tenant_data.industry}
              </div>
            )}
          </div>
        );
      },
      filterFn: (row, columnId, filterValue) => {
        return row.original.tenant_type === filterValue;
      },
      size: 120,
    },
    {
      id: 'contact_info',
      header: 'Contact',
      cell: info => {
        const tenant = info.row.original;
        return (
          <div className="text-sm">
            {tenant.phone && (
              <div className="text-gray-900">{tenant.phone}</div>
            )}
            {tenant.email && (
              <div className="text-gray-500 truncate">{tenant.email}</div>
            )}
          </div>
        );
      },
      size: 150,
    },
    {
      id: 'additional_info',
      header: 'Details',
      cell: info => {
        const tenant = info.row.original;
        const data = tenant.tenant_data || {};
        return (
          <div className="text-sm text-gray-600">
            {data.occupation && <div>Occupation: {data.occupation}</div>}
            {data.employees && <div>Employees: {data.employees}</div>}
            {data.company_registration && <div>Reg: {data.company_registration}</div>}
          </div>
        );
      },
      size: 150,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: info => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(info.getValue() as string)}`}>
          {(info.getValue() as string).charAt(0).toUpperCase() + (info.getValue() as string).slice(1)}
        </span>
      ),
      filterFn: 'equals',
      size: 100,
    },
    {
      id: 'created_at',
      header: 'Added',
      cell: info => {
        const tenant = info.row.original;
        return (
          <div className="text-sm text-gray-900">
            {new Date(tenant.created_at).toLocaleDateString()}
          </div>
        );
      },
      size: 100,
    },
  ], []);

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
    <div className="bg-white rounded-lg shadow border border-gray-200">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Tenants</h3>
            <p className="text-sm text-gray-500">
              {table.getFilteredRowModel().rows.length} of {tenants?.length || 0} tenants
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Search */}
            <input
              type="text"
              placeholder="Search tenants..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            
            {/* Type Filter */}
            <select
              value={(table.getColumn('tenant_type')?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn('tenant_type')?.setFilterValue(e.target.value || undefined)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {tenantTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            
            {/* Status Filter */}
            <select
              value={(table.getColumn('status')?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn('status')?.setFilterValue(e.target.value || undefined)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {statusTypes.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            {onAddTenant && (
              <button
                onClick={onAddTenant}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Tenant
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                    style={{ width: header.getSize() }}
                    onClick={header.column.getToggleSortingHandler()}
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
                  onClick={() => {
                    onTenantSelect(row.original);
                    setModalTenantId(row.original.id);
                    setShowTenantModal(true);
                  }}
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
          {onAddTenant && (
            <button
              onClick={onAddTenant}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Add Tenant
            </button>
          )}
        </div>
      )}

      {/* Tenant Register Modal */}
      {showTenantModal && modalTenantId && (
        <TenantRegisterModal
          tenantId={modalTenantId}
          onClose={() => {
            setShowTenantModal(false);
            setModalTenantId(null);
          }}
          onTenantUpdate={(updatedTenant) => {
            if (onTenantsUpdate) {
              onTenantsUpdate(updatedTenant);
            }
          }}
        />
      )}
    </div>
  );
};