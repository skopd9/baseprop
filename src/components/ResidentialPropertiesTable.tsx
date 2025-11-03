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
  HomeIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  CurrencyPoundIcon,
  TrashIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import { SimplifiedProperty, SimplifiedTenant, getOccupancyDisplay } from '../utils/simplifiedDataTransforms';

interface ResidentialPropertiesTableProps {
  properties: SimplifiedProperty[];
  tenants: SimplifiedTenant[];
  selectedProperty: SimplifiedProperty | null;
  onPropertySelect: (property: SimplifiedProperty) => void;
  onAddProperty: () => void;
  onDeleteProperty?: (property: SimplifiedProperty) => void;
  onMarkAsSold?: (property: SimplifiedProperty) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'occupied':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'vacant':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'under_management':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'sold':
      return 'bg-gray-100 text-gray-800 border-gray-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const propertyTypes = [
  { value: '', label: 'All Types' },
  { value: 'house', label: 'House' },
  { value: 'flat', label: 'Flat' },
  { value: 'hmo', label: 'HMO' },
];

const statusTypes = [
  { value: '', label: 'All Status' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'vacant', label: 'Vacant' },
  { value: 'maintenance', label: 'Under Maintenance' },
  { value: 'sold', label: 'Sold' },
];

export const ResidentialPropertiesTable: React.FC<ResidentialPropertiesTableProps> = ({
  properties,
  tenants,
  selectedProperty,
  onPropertySelect,
  onAddProperty,
  onDeleteProperty,
  onMarkAsSold,
}) => {
  // Safety checks: ensure arrays are valid
  const safeProperties = Array.isArray(properties) ? properties : [];
  const safeTenants = Array.isArray(tenants) ? tenants : [];
  
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'address', desc: false }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // Create a map for quick tenant lookup by property
  const tenantsByProperty = useMemo(() => {
    const map = new Map<string, SimplifiedTenant[]>();
    tenants.forEach(tenant => {
      const existing = map.get(tenant.propertyId) || [];
      map.set(tenant.propertyId, [...existing, tenant]);
    });
    return map;
  }, [tenants]);

  const columns = useMemo<ColumnDef<SimplifiedProperty>[]>(() => [
    {
      accessorKey: 'address',
      header: 'Address',
      cell: info => {
        const property = info.row.original;
        return (
          <div className="text-sm font-medium text-gray-900 truncate">
            {property.address}
          </div>
        );
      },
      size: 300,
    },
    {
      accessorKey: 'propertyType',
      header: 'Type',
      cell: info => (
        <div className="text-sm text-gray-900 capitalize">
          {info.getValue() as string}
        </div>
      ),
      filterFn: 'equals',
      size: 80,
    },
    {
      id: 'bedrooms_bathrooms',
      header: 'Bed/Bath',
      cell: info => {
        const property = info.row.original;
        
        if (property.propertyType === 'hmo' && property.unitDetails) {
          return (
            <div className="text-sm">
              <div className="text-gray-900 font-medium">
                {property.unitDetails.length} units
              </div>
              <div className="text-xs text-gray-500">
                {property.bedrooms} bed, {property.bathrooms} bath
              </div>
            </div>
          );
        }
        
        return (
          <div className="text-sm text-gray-900">
            {property.bedrooms} bed, {property.bathrooms} bath
          </div>
        );
      },
      size: 100,
    },
    {
      id: 'rent_info',
      header: 'Rent',
      cell: info => {
        const property = info.row.original;
        const propertyTenants = tenantsByProperty.get(property.id) || [];
        const actualRent = propertyTenants.reduce((sum, tenant) => sum + tenant.monthlyRent, 0);
        
        return (
          <div className="space-y-1">
            <div className="flex items-center space-x-1">
              <span className="text-xs text-gray-500">Target:</span>
              <span className="text-sm font-medium text-gray-900">
                {formatCurrency(property.targetRent)}
              </span>
            </div>
            {actualRent > 0 && (
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-500">Actual:</span>
                <span className={`text-sm font-medium ${actualRent >= property.targetRent ? 'text-green-600' : 'text-orange-600'}`}>
                  {formatCurrency(actualRent)}
                </span>
              </div>
            )}
            {property.propertyType === 'hmo' && property.unitDetails && (
              <div className="text-xs text-gray-500">
                {property.unitDetails.length} units: £{Math.round(property.targetRent / property.unitDetails.length)}/unit avg
              </div>
            )}
          </div>
        );
      },
      size: 140,
    },
    {
      id: 'financial_info',
      header: 'Financial',
      cell: info => {
        const property = info.row.original;
        return (
          <div className="space-y-1">
            {property.purchasePrice && (
              <div className="text-xs text-gray-500">
                Bought: {formatCurrency(property.purchasePrice)}
              </div>
            )}
            {property.salesPrice && (
              <div className="text-xs text-green-600">
                Sold: {formatCurrency(property.salesPrice)}
              </div>
            )}
            {!property.purchasePrice && !property.salesPrice && (
              <div className="text-xs text-gray-400">No data</div>
            )}
          </div>
        );
      },
      size: 120,
    },
    {
      accessorKey: 'status',
      header: 'Occupancy',
      cell: ({ row }) => {
        const property = row.original;
        const occupancyInfo = getOccupancyDisplay(property, safeTenants);
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(occupancyInfo.status)}`}>
            {occupancyInfo.label}
          </span>
        );
      },
      filterFn: 'equals',
      size: 140,
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const property = row.original;
        
        return (
          <div className="flex items-center space-x-1">
            {property.status !== 'sold' && onMarkAsSold && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMarkAsSold(property);
                }}
                className="p-1 rounded-md hover:bg-green-50 text-green-600 hover:text-green-700"
                title="Mark as Sold"
              >
                <CheckCircleIcon className="w-4 h-4" />
              </button>
            )}
            {onDeleteProperty && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteProperty(property);
                }}
                className="p-1 rounded-md hover:bg-red-50 text-red-600 hover:text-red-700"
                title="Delete Property"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            )}
          </div>
        );
      },
      size: 80,
    },
  ], [tenantsByProperty]);

  const table = useReactTable({
    data: safeProperties,
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
      <div className="px-4 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Properties</h3>
            <p className="text-sm text-gray-500">
              {table.getFilteredRowModel().rows.length} of {safeProperties.length} properties
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Search */}
            <input
              type="text"
              placeholder="Search properties..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            
            {/* Type Filter */}
            <select
              value={(table.getColumn('propertyType')?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn('propertyType')?.setFilterValue(e.target.value || undefined)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {propertyTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            
            {/* Status Filter */}
            <select
              value={(table.getColumn('status')?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn('status')?.setFilterValue(e.target.value || undefined)}
              className="px-3 py-2 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {statusTypes.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>

            <button
              onClick={onAddProperty}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <HomeIcon className="w-4 h-4 mr-2" />
              Add Property
            </button>
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
              const isSelected = selectedProperty?.id === row.original.id;
              return (
                <tr
                  key={row.id}
                  className={`cursor-pointer transition-colors hover:bg-blue-25 ${
                    isSelected
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : 'border-l-4 border-transparent hover:border-l-4 hover:border-blue-200'
                  }`}
                  onClick={() => onPropertySelect(row.original)}
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
            <HomeIcon className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No properties found</h3>
          <p className="text-gray-500 mb-4">
            {globalFilter || columnFilters.length > 0
              ? 'Try adjusting your search or filters'
              : 'Get started by adding your first property'
            }
          </p>
          <button
            onClick={onAddProperty}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
          >
            <HomeIcon className="w-4 h-4 mr-2" />
            Add Property
          </button>
        </div>
      )}
    </div>
  );
};