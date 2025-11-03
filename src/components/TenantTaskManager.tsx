import React, { useState, useMemo, useEffect } from 'react';
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
import { WorkflowTemplate, WorkflowInstance, Tenant } from '../types';
import { 
  PlayIcon,
  ClockIcon,
  CheckCircleIcon,
  PlusIcon,
  XMarkIcon,
  ChevronUpIcon,
  ChevronDownIcon,
  UserIcon,
  ArrowTopRightOnSquareIcon,
} from '@heroicons/react/24/outline';
import { db } from '../lib/supabase';

interface TenantTaskManagerProps {
  templates: WorkflowTemplate[];
  onPushToWorkflow: (tenant: Tenant, template: WorkflowTemplate, workflowName: string) => Promise<void>;
  onNavigateToTenant?: (tenant: Tenant) => void;
  onDataRefresh?: () => Promise<void>;
}

const getTenantIcon = () => {
  return <UserIcon className="w-4 h-4 text-blue-600" />;
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
    case 'active':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'inactive':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'pending':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

export const TenantTaskManager: React.FC<TenantTaskManagerProps> = ({
  templates,
  onPushToWorkflow,
  onNavigateToTenant,
  onDataRefresh
}) => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [workflowInstances, setWorkflowInstances] = useState<WorkflowInstance[]>([]);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'name', desc: false }
  ]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load tenants and workflow instances
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Load tenants
      try {
        const tenantsData = await db.getTenants();
        setTenants(tenantsData || []);
      } catch (tenantError: any) {
        console.warn('Tenants table may not exist yet:', tenantError);
        if (tenantError?.message?.includes('relation "tenants" does not exist')) {
          setError('Tenants table not found. Please run the database setup script.');
        } else {
          setError('Failed to load tenants. Please check your database connection.');
        }
        setTenants([]);
      }

      // Load workflow instances
      try {
        const workflowInstancesData = await db.getWorkflowInstances();
        setWorkflowInstances(workflowInstancesData || []);
      } catch (workflowError) {
        console.warn('Error loading workflow instances:', workflowError);
        setWorkflowInstances([]);
      }
      
    } catch (error) {
      console.error('Error loading tenant data:', error);
      setError('Failed to load data. Please ensure the database is set up correctly.');
    } finally {
      setLoading(false);
    }
  };

  // Filter templates to only show tenant-focused ones
  const tenantTemplates = useMemo(() => {
    return templates.filter(template => 
      template.category === 'tenant' || 
      template.key?.includes('tenant') ||
      template.name?.toLowerCase().includes('tenant') ||
      template.name?.toLowerCase().includes('lease') ||
      template.name?.toLowerCase().includes('application')
    );
  }, [templates]);

  // Create a map for quick workflow lookup by tenant
  const workflowsByTenant = useMemo(() => {
    const map = new Map<string, WorkflowInstance[]>();
    workflowInstances.forEach(workflow => {
      if (workflow.tenant_id) {
        const existing = map.get(workflow.tenant_id) || [];
        map.set(workflow.tenant_id, [...existing, workflow]);
      }
    });
    return map;
  }, [workflowInstances]);

  const columns: ColumnDef<Tenant>[] = useMemo(() => [
    {
      id: 'tenant_info',
      header: 'Tenant',
      size: 300,
      cell: info => {
        const tenant = info.row.original;
        return (
          <div className="flex items-center space-x-3">
            {getTenantIcon()}
            <div>
              <div className="font-medium text-gray-900">{tenant.name}</div>
              {tenant.email && (
                <div className="text-sm text-gray-500">{tenant.email}</div>
              )}
            </div>
          </div>
        );
      }
    },
    {
      accessorKey: 'status',
      header: 'Status',
      size: 120,
      cell: info => (
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(info.getValue() as string)}`}>
          {info.getValue() as string}
        </span>
      )
    },
    {
      accessorKey: 'lease_start_date',
      header: 'Lease Start',
      size: 120,
      cell: info => {
        const date = info.getValue() as string;
        return date ? formatDate(date) : '-';
      }
    },
    {
      accessorKey: 'lease_end_date', 
      header: 'Lease End',
      size: 120,
      cell: info => {
        const date = info.getValue() as string;
        return date ? formatDate(date) : '-';
      }
    },
    {
      id: 'workflow_status',
      header: 'Workflow Status',
      size: 150,
      cell: info => {
        const tenant = info.row.original;
        const tenantWorkflows = workflowsByTenant.get(tenant.id) || [];
        
        if (tenantWorkflows.length > 0) {
          // Show the most recent workflow status
          const latestWorkflow = tenantWorkflows[0];
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
      }
    },
    {
      id: 'actions',
      header: 'Actions',
      size: 100,
      cell: info => {
        const tenant = info.row.original;
        return (
          <button
            onClick={() => setSelectedTenant(tenant)}
            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
          >
            View Details
          </button>
        );
      }
    }
  ], [workflowsByTenant]);

  const table = useReactTable({
    data: tenants,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    state: {
      sorting,
      columnFilters,
      globalFilter,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
  });

  const handleStartWorkflow = async (template: WorkflowTemplate) => {
    if (!selectedTenant || !template) return;
    
    try {
      setLoading(true);
      setError(null);
      
      const workflowName = `${template.name} - ${selectedTenant.name}`;
      
      await onPushToWorkflow(selectedTenant, template, workflowName);
      
      // Refresh data to show the new workflow
      await loadData();
      
    } catch (error) {
      console.error('Error starting workflow:', error);
      setError('Failed to start workflow');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4">
        <h1 className="text-xl font-bold text-gray-900">Tenant Task Manager</h1>
        <p className="text-sm text-gray-500">Start and track tenant workflows</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mx-4 mb-4 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error</h3>
              <div className="mt-2 text-sm text-red-700">{error}</div>
              {error?.includes('table not found') && (
                <div className="mt-2 text-xs text-red-600">
                  Run the setup_database.sql script in your Supabase SQL Editor to create the required tables.
                </div>
              )}
              <div className="mt-3">
                <button
                  onClick={loadData}
                  className="text-sm bg-red-100 text-red-800 px-3 py-1 rounded-md hover:bg-red-200"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="mx-4 mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-sm text-blue-700">Loading tenant data...</span>
          </div>
        </div>
      )}

      {/* Table Container */}
      <div className="flex-1 px-4 pb-4">
        <div className="bg-white rounded-lg shadow border border-gray-200">
          {/* Table Header */}
          <div className="px-3 py-2 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Tenants</h2>
                <p className="text-sm text-gray-500">{tenants.length} of {tenants.length} tenants</p>
              </div>
              <div className="flex items-center space-x-3">
                <input
                  type="text"
                  placeholder="Search tenants..."
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
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {{
                            asc: <ChevronUpIcon className="w-4 h-4" />,
                            desc: <ChevronDownIcon className="w-4 h-4" />,
                          }[header.column.getIsSorted() as string] ?? null}
                        </div>
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map(row => (
                    <tr 
                      key={row.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedTenant(row.original)}
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
                  ))
                ) : (
                  <tr>
                    <td colSpan={columns.length} className="px-3 py-8 text-center">
                      <div className="flex flex-col items-center">
                        <UserIcon className="h-12 w-12 text-gray-400 mb-3" />
                        <p className="text-sm text-gray-500 mb-2">No tenants found</p>
                        <p className="text-xs text-gray-400">
                          {error ? 'Please check your database setup' : 'Add tenants to get started'}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Tenant Details Sidebar */}
      {selectedTenant && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-end z-50"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedTenant(null);
            }
          }}
        >
          <div 
            className="w-1/3 min-w-[500px] h-full bg-white flex flex-col shadow-xl overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Sidebar Header */}
            <div className="p-4 border-b border-gray-200 bg-white">
              <div className="flex items-start justify-between">
                <div className="flex-1 mr-4">
                  <div className="flex items-center space-x-3 mb-2">
                    {getTenantIcon()}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedTenant.status)}`}>
                      {selectedTenant.status}
                    </span>
                  </div>
                  <h2 className="text-xl font-bold text-gray-900 mb-1">{selectedTenant.name}</h2>
                  {selectedTenant.email && (
                    <p className="text-sm text-gray-600">{selectedTenant.email}</p>
                  )}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => onNavigateToTenant?.(selectedTenant)}
                    className="inline-flex items-center px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors"
                  >
                    <ArrowTopRightOnSquareIcon className="w-4 h-4 mr-1.5" />
                    View in Tenant Register
                  </button>
                </div>
                <button
                  onClick={() => setSelectedTenant(null)}
                  className="p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Tenant Information */}
            <div className="flex-1 overflow-y-auto bg-white">
              <div className="p-4 space-y-4">
                
                {/* Basic Information */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-base font-semibold text-gray-900">Tenant Information</h3>
                  </div>
                  <div className="p-4 grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Name</label>
                      <div className="mt-1 text-sm text-gray-900">{selectedTenant.name}</div>
                    </div>
                    <div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Status</label>
                      <div className="mt-1">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(selectedTenant.status)}`}>
                          {selectedTenant.status}
                        </span>
                      </div>
                    </div>
                    {selectedTenant.email && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Email</label>
                        <div className="mt-1 text-sm text-gray-900">{selectedTenant.email}</div>
                      </div>
                    )}
                    {selectedTenant.phone && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</label>
                        <div className="mt-1 text-sm text-gray-900">{selectedTenant.phone}</div>
                      </div>
                    )}
                    {selectedTenant.lease_start_date && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Lease Start</label>
                        <div className="mt-1 text-sm text-gray-900">{formatDate(selectedTenant.lease_start_date)}</div>
                      </div>
                    )}
                    {selectedTenant.lease_end_date && (
                      <div>
                        <label className="text-xs font-medium text-gray-500 uppercase tracking-wider">Lease End</label>
                        <div className="mt-1 text-sm text-gray-900">{formatDate(selectedTenant.lease_end_date)}</div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Tenant Workflows */}
                <div className="bg-white border border-gray-200 rounded-lg">
                  <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
                    <h3 className="text-base font-semibold text-gray-900">Tenant Workflows</h3>
                  </div>
                  <div className="p-4">
                    {error && (
                      <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                        <div className="flex">
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-red-800">Error</h3>
                            <div className="mt-2 text-sm text-red-700">{error}</div>
                          </div>
                        </div>
                      </div>
                    )}

                    {tenantTemplates.length > 0 ? (
                      <div className="space-y-4">
                        {tenantTemplates.map(template => {
                          const tenantWorkflows = workflowsByTenant.get(selectedTenant.id)?.filter(
                            workflow => workflow.template_id === template.id
                          ) || [];
                          
                          const hasActiveWorkflow = tenantWorkflows.length > 0;
                          
                          return (
                            <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                              <div className="flex items-start justify-between mb-3">
                                <div className="flex-1">
                                  <h4 className="font-medium text-gray-900 mb-1">{template.name}</h4>
                                  <p className="text-sm text-gray-500 mb-2">{template.description}</p>
                                  {template.category && (
                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
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
                                  {tenantWorkflows.map(workflow => (
                                    <div key={workflow.id} className="p-3 bg-gray-50 rounded-lg">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-3">
                                          {getStatusIcon(workflow.status)}
                                          <div>
                                            <div className="font-medium text-gray-900">{workflow.name}</div>
                                            <div className="text-sm text-gray-500">
                                              Started {formatDate(workflow.created_at)}
                                            </div>
                                          </div>
                                        </div>
                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusColor(workflow.status)}`}>
                                          {workflow.status?.replace('_', ' ') || 'Unknown'}
                                        </span>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div className="text-center p-4 bg-gray-50 rounded-lg">
                        <ClockIcon className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                        <p className="text-sm text-gray-500 mb-4">No tenant workflow templates available</p>
                        <p className="text-xs text-gray-400">Run the property management setup script to add tenant workflow templates</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};