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
  BuildingOffice2Icon,
  MapIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

interface Unit {
  id: string;
  property_id: string;
  unit_number: string;
  unit_type: 'residential' | 'commercial' | 'industrial' | 'retail' | 'office' | 'warehouse' | 'parking' | 'storage' | 'other';
  floor_number?: number;
  unit_data: Record<string, any>;
  status: 'available' | 'occupied' | 'maintenance' | 'reserved' | 'unavailable';
  rent_amount?: number;
  currency?: string;
  lease_start_date?: string;
  lease_end_date?: string;
  created_at: string;
  updated_at: string;
}

interface UnitsTableProps {
  units: Unit[];
  selectedUnit: Unit | null;
  onUnitSelect: (unit: Unit) => void;
  onUnitsUpdate?: (updatedUnit: Unit) => void;
  onAddUnit?: () => void;
  propertyName?: string;
}

const getUnitTypeIcon = (unitType: string) => {
  switch (unitType) {
    case 'residential':
      return <HomeIcon className="w-4 h-4 text-green-600" />;
    case 'commercial':
    case 'office':
    case 'retail':
      return <BuildingOffice2Icon className="w-4 h-4 text-blue-600" />;
    case 'industrial':
    case 'warehouse':
      return <MapIcon className="w-4 h-4 text-amber-600" />;
    default:
      return <BuildingOffice2Icon className="w-4 h-4 text-gray-600" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'available':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'occupied':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'maintenance':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'reserved':
      return 'bg-purple-100 text-purple-800 border-purple-200';
    case 'unavailable':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const unitTypes = [
  { value: '', label: 'All Types' },
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' },
  { value: 'office', label: 'Office' },
  { value: 'retail', label: 'Retail' },
  { value: 'industrial', label: 'Industrial' },
  { value: 'warehouse', label: 'Warehouse' },
  { value: 'parking', label: 'Parking' },
  { value: 'storage', label: 'Storage' },
  { value: 'other', label: 'Other' },
];

const statusTypes = [
  { value: '', label: 'All Status' },
  { value: 'available', label: 'Available' },
  { value: 'occupied', label: 'Occupied' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'unavailable', label: 'Unavailable' },
];

const formatCurrency = (amount: number, currency: string = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const UnitsTable: React.FC<UnitsTableProps> = ({
  units,
  selectedUnit,
  onUnitSelect,
  onUnitsUpdate,
  onAddUnit,
  propertyName,
}) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'unit_number', desc: false }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  const columns = useMemo<ColumnDef<Unit>[]>(() => [
    {
      accessorKey: 'unit_number',
      header: 'Unit',
      cell: info => {
        const unit = info.row.original;
        return (
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {getUnitTypeIcon(unit.unit_type)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900">
                {info.getValue() as string}
              </div>
              <div className="text-xs text-gray-500">
                {unit.floor_number && `Floor ${unit.floor_number}`}
              </div>
            </div>
          </div>
        );
      },
      size: 120,
    },
    {
      id: 'unit_type',
      header: 'Type',
      cell: info => {
        const unit = info.row.original;
        return (
          <div className="text-sm text-gray-900 capitalize">
            {unit.unit_type.replace('_', ' ')}
          </div>
        );
      },
      filterFn: (row, columnId, filterValue) => {
        return row.original.unit_type === filterValue;
      },
      size: 100,
    },
    {
      id: 'area',
      header: 'Area',
      cell: info => {
        const unit = info.row.original;
        const area = unit.unit_data?.area_sqft;
        return (
          <div className="text-sm text-gray-900">
            {area ? `${area.toLocaleString()} sq ft` : '-'}
          </div>
        );
      },
      size: 100,
    },
    {
      id: 'details',
      header: 'Details',
      cell: info => {
        const unit = info.row.original;
        const data = unit.unit_data || {};
        return (
          <div className="text-sm text-gray-600">
            {data.bedrooms && <div>{data.bedrooms} bed</div>}
            {data.bathrooms && <div>{data.bathrooms} bath</div>}
            {data.type && <div>{data.type}</div>}
          </div>
        );
      },
      size: 100,
    },
    {
      id: 'rent',
      header: 'Rent',
      cell: info => {
        const unit = info.row.original;
        return (
          <div className="text-sm text-gray-900">
            {unit.rent_amount ? formatCurrency(unit.rent_amount, unit.currency) : '-'}
          </div>
        );
      },
      size: 100,
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
      id: 'lease_info',
      header: 'Lease',
      cell: info => {
        const unit = info.row.original;
        if (unit.lease_start_date && unit.lease_end_date) {
          return (
            <div className="text-sm text-gray-600">
              <div>{new Date(unit.lease_start_date).toLocaleDateString()}</div>
              <div className="text-xs">to {new Date(unit.lease_end_date).toLocaleDateString()}</div>
            </div>
          );
        }
        return <div className="text-sm text-gray-400">-</div>;
      },
      size: 120,
    },
  ], []);

  const table = useReactTable({
    data: units || [],
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
            <h3 className="text-lg font-medium text-gray-900">
              Units {propertyName && `- ${propertyName}`}
            </h3>
            <p className="text-sm text-gray-500">
              {table.getFilteredRowModel().rows.length} of {units?.length || 0} units
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Search */}
            <input
              type="text"
              placeholder="Search units..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            
            {/* Type Filter */}
            <select
              value={(table.getColumn('unit_type')?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn('unit_type')?.setFilterValue(e.target.value || undefined)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {unitTypes.map((type) => (
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

            {onAddUnit && (
              <button
                onClick={onAddUnit}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Add Unit
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
              const isSelected = selectedUnit?.id === row.original.id;
              return (
                <tr
                  key={row.id}
                  className={`cursor-pointer transition-colors hover:bg-blue-25 ${
                    isSelected
                      ? 'bg-blue-50 border-l-4 border-blue-500'
                      : 'border-l-4 border-transparent hover:border-l-4 hover:border-blue-200'
                  }`}
                  onClick={() => onUnitSelect(row.original)}
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
          <h3 className="text-lg font-medium text-gray-900 mb-2">No units found</h3>
          <p className="text-gray-500 mb-4">
            {globalFilter || columnFilters.length > 0
              ? 'Try adjusting your search or filters'
              : 'Get started by adding units to this property'
            }
          </p>
          {onAddUnit && (
            <button
              onClick={onAddUnit}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
            >
              Add Unit
            </button>
          )}
        </div>
      )}
    </div>
  );
};