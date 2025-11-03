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
import { Property, WorkflowInstance } from '../types';
import { 
  BuildingOffice2Icon,
  HomeIcon,
  MapIcon,
  ChevronUpIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

interface PropertiesTableProps {
  properties: Property[];
  workflowInstances: WorkflowInstance[];
  selectedProperty: Property | null;
  onPropertySelect: (property: Property) => void;
  onPropertiesUpdate: (updatedProperty: Property) => void;
  onAddProperty?: () => void;
}

const getPropertyIcon = (propertyType: string) => {
  switch (propertyType) {
    case 'commercial':
      return <BuildingOffice2Icon className="w-4 h-4 text-blue-600" />;
    case 'residential':
      return <HomeIcon className="w-4 h-4 text-green-600" />;
    case 'industrial':
      return <MapIcon className="w-4 h-4 text-amber-600" />;
    default:
      return <BuildingOffice2Icon className="w-4 h-4 text-gray-600" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'disposed':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'under_contract':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

const propertyTypes = [
  { value: '', label: 'All Types' },
  { value: 'residential', label: 'Residential' },
  { value: 'commercial', label: 'Commercial' }, 
  { value: 'industrial', label: 'Industrial' },
];

const statusTypes = [
  { value: '', label: 'All Status' },
  { value: 'active', label: 'Active' },
  { value: 'disposed', label: 'Disposed' },
  { value: 'under_contract', label: 'Under Contract' },
];

const propertyTypeLabels: Record<string, string> = {
  'residential': 'Residential',
  'commercial': 'Commercial',
  'industrial': 'Industrial',
};

export const PropertiesTable: React.FC<PropertiesTableProps> = ({
  properties,
  workflowInstances,
  selectedProperty,
  onPropertySelect,
  onPropertiesUpdate,
  onAddProperty,
}) => {
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'asset_register_id', desc: false }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');

  // Create a map for quick workflow lookup
  const workflowsByProperty = useMemo(() => {
    const map = new Map<string, WorkflowInstance[]>();
    if (workflowInstances && Array.isArray(workflowInstances)) {
      workflowInstances.forEach(workflow => {
        const existing = map.get(workflow.property_id) || [];
        map.set(workflow.property_id, [...existing, workflow]);
      });
    }
    return map;
  }, [workflowInstances]);

  const columns = useMemo<ColumnDef<Property>[]>(() => [
    {
      accessorKey: 'asset_register_id',
      header: 'ID',
      cell: info => (
        <span className="font-mono text-sm font-medium text-gray-900">
          {info.getValue() as string}
        </span>
      ),
      size: 80,
    },
    {
      accessorKey: 'name',
      header: 'Property',
      cell: info => {
        const property = info.row.original;
        const propertyData = (property as any).property_data || {};
        return (
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {getPropertyIcon(propertyData.property_type || '')}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-medium text-gray-900 truncate">
                {info.getValue() as string}
              </div>
              <div className="text-xs text-gray-500 truncate">
                {property.address}
              </div>
            </div>
          </div>
        );
      },
      size: 250,
    },
    {
      id: 'property_type',
      header: 'Type',
      cell: info => {
        const property = info.row.original;
        const propertyData = (property as any).property_data || {};
        return (
          <div>
            <div className="text-sm text-gray-900">
              {propertyTypeLabels[propertyData.property_type] || propertyData.property_type || '-'}
            </div>
            {propertyData.property_sub_type && (
              <div className="text-xs text-gray-500 capitalize">
                {propertyData.property_sub_type}
              </div>
            )}
          </div>
        );
      },
      filterFn: (row, columnId, filterValue) => {
        const propertyData = (row.original as any).property_data || {};
        return propertyData.property_type === filterValue;
      },
      size: 150,
    },
    {
      id: 'units',
      header: 'Units',
      cell: info => {
        const propertyData = (info.row.original as any).property_data || {};
        return (
          <span className="text-sm text-gray-900">
            {propertyData.units || 0}
          </span>
        );
      },
      size: 80,
    },
    {
      id: 'square_feet',
      header: 'Sq Ft',
      cell: info => {
        const propertyData = (info.row.original as any).property_data || {};
        return (
          <span className="text-sm text-gray-900">
            {propertyData.square_feet ? propertyData.square_feet.toLocaleString() : '-'}
          </span>
        );
      },
      size: 100,
    },
    {
      id: 'current_value',
      header: 'Value',
      cell: info => {
        const propertyData = (info.row.original as any).property_data || {};
        return (
          <span className="text-sm text-gray-900">
            {propertyData.current_value ? formatCurrency(propertyData.current_value) : '-'}
          </span>
        );
      },
      size: 120,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: info => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(info.getValue() as string)}`}>
          {info.getValue() as string}
        </span>
      ),
      filterFn: 'equals',
      size: 100,
    },
    {
      id: 'units',
      header: 'Units',
      cell: info => {
        const property = info.row.original;
        const propertyData = (property as any).property_data || {};
        const totalUnits = propertyData.units || 0;
        
        return (
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-900">
              {totalUnits}
            </span>
            <span className="text-xs text-gray-500">units</span>
          </div>
        );
      },
      size: 80,
    },
    {
      id: 'workflows',
      header: 'Workflows',
      cell: info => {
        const property = info.row.original;
        const propertyWorkflows = workflowsByProperty.get(property.id) || [];
        
        if (propertyWorkflows.length > 0) {
          return (
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-900">
                {propertyWorkflows.length}
              </span>
              <div className="flex -space-x-1">
                {propertyWorkflows.slice(0, 3).map((workflow, index) => (
                  <div
                    key={workflow.id}
                    className="w-6 h-6 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center"
                    title={workflow.name}
                  >
                    <span className="text-xs font-medium text-blue-600">
                      {workflow.completion_percentage}%
                    </span>
                  </div>
                ))}
                {propertyWorkflows.length > 3 && (
                  <div className="w-6 h-6 rounded-full bg-gray-100 border-2 border-white flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600">
                      +{propertyWorkflows.length - 3}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        }
        
        return <span className="text-sm text-gray-400">None</span>;
      },
      size: 120,
    },
  ], [workflowsByProperty]);

  const table = useReactTable({
    data: properties || [],
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
      <div className="px-3 py-2 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Properties</h3>
            <p className="text-sm text-gray-500">
              {table.getFilteredRowModel().rows.length} of {properties?.length || 0} properties
            </p>
          </div>
          
          {onAddProperty && (
            <button
              onClick={onAddProperty}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Add Property
            </button>
          )}
          
          {/* Filters */}
          <div className="flex items-center space-x-4">
            <input
              type="text"
              placeholder="Search properties..."
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <select
              value={(table.getColumn('property_type')?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn('property_type')?.setFilterValue(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {propertyTypes.map(type => (
                <option key={type.value} value={type.value}>{type.label}</option>
              ))}
            </select>
            <select
              value={(table.getColumn('status')?.getFilterValue() as string) ?? ''}
              onChange={(e) => table.getColumn('status')?.setFilterValue(e.target.value)}
              className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              {statusTypes.map(status => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
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
                    className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
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
                    <td
                      key={cell.id}
                      className="px-3 py-2 whitespace-nowrap"
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {table.getFilteredRowModel().rows.length === 0 && (
        <div className="px-3 py-6 text-center">
          <p className="text-sm text-gray-500">
            No properties found matching the current filters.
          </p>
        </div>
      )}
    </div>
  );
}; 