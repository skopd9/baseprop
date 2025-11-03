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
import { Property, WorkflowTemplate, WorkflowInstance } from '../types';
import { PropertyPanel } from './PropertyPanel';
import { 
  PlayIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  BuildingOffice2Icon,
  HomeIcon,
  MapIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';

interface TaskManagerProps {
  properties: Property[];
  workflowInstances: WorkflowInstance[];
  templates: WorkflowTemplate[];
  onPushToWorkflow: (property: Property, template: WorkflowTemplate, workflowName: string) => Promise<void>;
  onNavigateToProperty?: (property: Property) => void;
  onDataRefresh?: () => Promise<void>;
  mode?: 'asset' | 'tenant'; // New prop to distinguish between asset and tenant workflows
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

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
    case 'in_progress':
    case 'started':
      return <PlayIcon className="w-4 h-4 text-blue-500" />;
    default:
      return <ClockIcon className="w-4 h-4 text-gray-400" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'in_progress':
    case 'started':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    case 'not_started':
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

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const TaskManager: React.FC<TaskManagerProps> = ({
  properties,
  workflowInstances,
  templates,
  onPushToWorkflow,
  onNavigateToProperty,
  onDataRefresh,
  mode = 'asset' // Default to asset mode
}) => {
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [showAssetRegisterModal, setShowAssetRegisterModal] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'asset_register_id', desc: false }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [localWorkflowInstances, setLocalWorkflowInstances] = useState<WorkflowInstance[]>([]);

  // Update local workflow instances when prop changes
  React.useEffect(() => {
    setLocalWorkflowInstances(workflowInstances || []);
  }, [workflowInstances]);

  // Create workflow lookup map for all templates using local state
  const workflowsByProperty = useMemo(() => {
    const map = new Map<string, WorkflowInstance[]>();
    localWorkflowInstances.forEach(workflow => {
      if (workflow.property_id) {
        const existing = map.get(workflow.property_id) || [];
        map.set(workflow.property_id, [...existing, workflow]);
      }
    });
    return map;
  }, [localWorkflowInstances]);

  const columns = useMemo<ColumnDef<Property>[]>(() => [
    {
      accessorKey: 'asset_register_id',
      header: 'Asset Register ID',
      cell: info => (
        <span className="font-mono text-sm font-medium text-gray-900">
          {info.getValue() as string}
        </span>
      ),
      size: 180,
    },
    {
      accessorKey: 'name',
      header: 'Property',
      cell: info => {
        const property = info.row.original;
        return (
          <div className="flex items-center space-x-3">
            <div className="flex-shrink-0">
              {getPropertyIcon((property as any).property_data?.property_type || '')}
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
      size: 350,
    },
    {
      accessorKey: 'property_type',
      header: 'Type',
      cell: info => {
        const property = info.row.original;
        const propertyData = (property as any).property_data || {};
        const typeLabels: Record<string, string> = {
          'residential': 'Residential',
          'commercial': 'Commercial',
          'industrial': 'Industrial',
        };
        return (
          <div>
            <div className="text-sm text-gray-900">
              {typeLabels[propertyData.property_type] || propertyData.property_type || '-'}
            </div>
            {propertyData.property_sub_type && (
              <div className="text-xs text-gray-500 capitalize">
                {propertyData.property_sub_type}
              </div>
            )}
          </div>
        );
      },
      size: 220,
    },
    {
      accessorKey: 'current_value',
      header: 'Current Value',
      cell: info => (
        <span className="text-sm text-gray-900">
          {info.getValue() ? formatCurrency(info.getValue() as number) : '-'}
        </span>
      ),
      size: 160,
    },
    {
      id: 'group_valuations_status',
      header: 'Group Valuations Status',
      cell: info => {
        const property = info.row.original;
        const propertyWorkflows = workflowsByProperty.get(property.id) || [];
        
        if (propertyWorkflows.length > 0) {
          const latestWorkflow = propertyWorkflows[0]; // Most recent
          return (
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(latestWorkflow.status)}`}>
              {latestWorkflow.status?.replace('_', ' ') || 'Unknown'}
            </span>
          );
        }
        
        return (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor('not_started')}`}>
            Not Started
          </span>
        );
      },
      size: 250,
    },
  ], [workflowsByProperty]);

  const table = useReactTable({
    data: properties,
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



  const handleRowClick = (property: Property) => {
    setSelectedProperty(property);
  };

  const handleStartWorkflow = async (template: WorkflowTemplate) => {
    if (!selectedProperty || !template) {
      return;
    }

    setLoading(true);
    setError(null);
    try {
      console.log('Starting workflow for property:', selectedProperty.id, 'with template:', template.name);
      const workflowName = `${template.name} - ${selectedProperty.name}`;
      await onPushToWorkflow(selectedProperty, template, workflowName);
      
      console.log('Workflow created successfully, refreshing data...');
      // Refresh data from parent to get the newly created workflow
      if (onDataRefresh) {
        await onDataRefresh();
      }
      
      console.log('Data refreshed successfully');
      // Don't close the modal - let user see the updated status
      // The modal will stay open and show the new workflow status
      
    } catch (error) {
      console.error('Error starting workflow:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to start workflow';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header - Outside table like Asset Register */}
      <div className="p-4">
        <h1 className="text-xl font-bold text-gray-900">
          {mode === 'tenant' ? 'Tenant Task Manager' : 'Task Manager'}
        </h1>
        <p className="text-sm text-gray-500">
          {mode === 'tenant' ? 'Start and track tenant workflows' : 'Start and track workflows'}
        </p>
      </div>

      {/* Table Container */}
      <div className="flex-1 px-4 pb-4">
        <div className="bg-white rounded-lg shadow border border-gray-200">
          {/* Table Header */}
          <div className="px-3 py-2 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Properties</h3>
                <p className="text-sm text-gray-500">
                  {table.getFilteredRowModel().rows.length} of {properties.length} properties
                </p>
              </div>
              
              {/* Search */}
              <div className="flex items-center space-x-4">
                <input
                  type="text"
                  placeholder="Search properties..."
                  value={globalFilter}
                  onChange={(e) => setGlobalFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-md bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
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
                      onClick={() => handleRowClick(row.original)}
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

            {table.getFilteredRowModel().rows.length === 0 && (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-gray-500">
                  No properties found matching the current filters.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Property Sidebar Modal */}
      {selectedProperty && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedProperty(null);
            }
          }}
        >
          <div 
            className="w-1/3 min-w-[500px] h-full bg-white flex flex-col shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sidebar Header */}
            <div className="p-6 border-b border-gray-200 bg-white">
              <div className="flex items-start justify-between">
                <div className="flex-1 mr-4">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="font-mono text-sm font-bold text-gray-700 bg-gray-100 px-2 py-1 rounded">
                      {selectedProperty.asset_register_id}
                    </span>
                    {getPropertyIcon((selectedProperty as any).property_data?.property_type || '')}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedProperty.status)}`}>
                      {selectedProperty.status}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{selectedProperty.name}</h2>
                  <p className="text-gray-600 mb-2">{selectedProperty.address}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                      <span>{(selectedProperty as any).property_data?.property_type?.replace('_', ' ') || 'Unknown'}</span>
                                              {(selectedProperty as any).property_data?.property_sub_type && (
                          <>
                            <span>•</span>
                            <span className="capitalize">{(selectedProperty as any).property_data.property_sub_type}</span>
                          </>
                        )}
                    </div>
                    <button
                      onClick={() => setShowAssetRegisterModal(true)}
                      className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors"
                    >
                      <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-1.5" />
                      View Asset Register Record
                    </button>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedProperty(null)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Property Information */}
            <div className="flex-1 overflow-y-auto bg-white">
              <div className="p-6 space-y-6">
                
                {/* Basic Information */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-base font-semibold text-gray-900">Property Information</h3>
                  </div>
                  <div className="p-6 grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Property Type</label>
                      <p className="mt-1 text-sm text-gray-900 capitalize">
                        {(selectedProperty as any).property_data?.property_type?.replace('_', ' ') || 'Unknown'}
                      </p>
                    </div>
                    {(selectedProperty as any).property_data?.property_sub_type && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Sub Type</label>
                        <p className="mt-1 text-sm text-gray-900 capitalize">
                          {(selectedProperty as any).property_data.property_sub_type}
                        </p>
                      </div>
                    )}
                    {(selectedProperty as any).property_data?.units && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Units</label>
                        <p className="mt-1 text-sm text-gray-900">{(selectedProperty as any).property_data.units}</p>
                      </div>
                    )}
                    {(selectedProperty as any).property_data?.square_feet && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Square Feet</label>
                        <p className="mt-1 text-sm text-gray-900">{(selectedProperty as any).property_data.square_feet.toLocaleString()}</p>
                      </div>
                    )}
                    {(selectedProperty as any).property_data?.current_value && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Current Value</label>
                        <p className="mt-1 text-sm text-gray-900">{formatCurrency((selectedProperty as any).property_data.current_value)}</p>
                      </div>
                    )}
                    {(selectedProperty as any).property_data?.acquisition_price && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Acquisition Price</label>
                        <p className="mt-1 text-sm text-gray-900">{formatCurrency((selectedProperty as any).property_data.acquisition_price)}</p>
                      </div>
                    )}
                    {(selectedProperty as any).property_data?.acquisition_date && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Acquisition Date</label>
                        <p className="mt-1 text-sm text-gray-900">{formatDate((selectedProperty as any).property_data.acquisition_date)}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Available Workflows */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-base font-semibold text-gray-900">Available Workflows</h3>
                  </div>
                  <div className="p-6">
                    {error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex">
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Error starting workflow</h3>
                            <div className="mt-1 text-sm text-red-700">
                              {error}
                            </div>
                            {error.includes('CORS') && (
                              <div className="mt-2 text-xs text-red-600">
                                Make sure your development server is running on the correct port (5173).
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {templates.length > 0 ? (
                      <div className="space-y-4">
                        {templates.map(template => {
                          const propertyWorkflows = workflowInstances.filter(
                            workflow => workflow.property_id === selectedProperty.id && 
                                       workflow.template_id === template.id
                          );
                          
                          const hasActiveWorkflow = propertyWorkflows.length > 0;
                          
                          return (
                            <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900 mb-1">{template.name}</h4>
                                  <p className="text-sm text-gray-500 mb-2">{template.description}</p>
                                  {template.category && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                      {template.category.replace('_', ' ')}
                                    </span>
                                  )}
                                </div>
                                {!hasActiveWorkflow && (
                                  <button
                                    onClick={() => handleStartWorkflow(template)}
                                    disabled={loading}
                                    className="inline-flex items-center px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ml-4"
                                  >
                                    <PlusIcon className="w-4 h-4 mr-1" />
                                    {loading ? 'Starting...' : 'Start'}
                                  </button>
                                )}
                              </div>
                              
                              {hasActiveWorkflow && (
                                <div className="mt-3 space-y-2">
                                  {propertyWorkflows.map(workflow => (
                                    <div key={workflow.id} className="p-3 bg-gray-50 rounded-lg">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                          {getStatusIcon(workflow.status)}
                                          <div>
                                            <div className="font-medium text-gray-900">{workflow.name}</div>
                                            <div className="text-sm text-gray-500">
                                              {workflow.completion_percentage || 0}% complete • Created {formatDate(workflow.created_at)}
                                            </div>
                                          </div>
                                        </div>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(workflow.status)}`}>
                                          {workflow.status?.replace('_', ' ') || 'Unknown'}
                                        </span>
                                      </div>
                                      {workflow.started_at && (
                                        <div className="text-xs text-gray-500 mt-2">
                                          <span className="font-medium">Started:</span> {formatDate(workflow.started_at)}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center p-6 bg-gray-50 rounded-lg">
                        <ClockIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                        <p className="text-sm text-gray-500">No workflow templates available</p>
                        <p className="text-xs text-gray-400 mt-1">Run the property management setup script to add workflow templates</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Asset Register Modal */}
      {showAssetRegisterModal && selectedProperty && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-[60]"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAssetRegisterModal(false);
            }
          }}
        >
          <div 
            className="w-1/3 min-w-[500px] h-full bg-white flex flex-col shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <PropertyPanel
              property={selectedProperty}
              workflowInstance={null}
              onClose={() => setShowAssetRegisterModal(false)}
              onWorkflowUpdate={() => {}}
              onPropertyUpdate={(updatedProperty) => {
                // Update the selected property so the panel shows the latest data
                setSelectedProperty(updatedProperty);
                console.log('Property updated:', updatedProperty);
              }}
            />
          </div>
        </div>
      )}

    </div>
  );
}; 