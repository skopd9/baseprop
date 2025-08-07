import React from 'react';
import { WorkflowTemplate, WorkflowInstance, Module, UserModuleAccess } from '../types';
import { 
  BuildingOffice2Icon,
  ClipboardDocumentListIcon,
  DocumentTextIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ChartBarSquareIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

interface SidebarProps {
  templates: WorkflowTemplate[];
  workflowInstances: WorkflowInstance[];
  selectedView: string;
  onViewSelect: (view: string, data?: any) => void;
  currentModule?: Module | null;
  availableModules?: (Module & { user_module_access: UserModuleAccess })[];
  onModuleSwitch?: (module: Module) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  templates,
  workflowInstances,
  selectedView,
  onViewSelect,
  currentModule,
  availableModules,
  onModuleSwitch,
}) => {
  const [expandedWorkflows, setExpandedWorkflows] = React.useState<string[]>([]);
  const [showProjectSelector, setShowProjectSelector] = React.useState(false);

  const toggleWorkflowExpansion = (workflowId: string) => {
    setExpandedWorkflows(prev => 
      prev.includes(workflowId) 
        ? prev.filter(id => id !== workflowId)
        : [...prev, workflowId]
    );
  };

  const menuItems = [
    {
      id: 'dashboard',
      name: 'Dashboard',
      icon: ChartBarSquareIcon,
      type: 'simple'
    },
    {
      id: 'property_register',
      name: 'Property Register',
      icon: BuildingOffice2Icon,
      type: 'simple'
    },
    {
      id: 'task_manager', 
      name: 'Task Manager',
      icon: ClipboardDocumentListIcon,
      type: 'simple'
    },
    {
      id: 'workflow_templates',
      name: 'Workflow Templates',
      icon: DocumentTextIcon,
      type: 'simple'
    }
  ];

  const activeWorkflows = workflowInstances.filter(wi => 
    wi.status !== 'completed' && wi.status !== 'cancelled'
  );

  return (
    <div className="w-64 bg-white border-r border-gray-200 flex flex-col">
      {/* Project Selector */}
      <div className="p-4 border-b border-gray-200">
        <div className="relative">
          <button
            onClick={() => setShowProjectSelector(!showProjectSelector)}
            className="w-full text-left flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-r from-blue-600 to-purple-600 flex items-center justify-center text-white font-medium text-sm">
                {currentModule?.icon || '📊'}
              </div>
              <div>
                <p className="font-medium text-gray-900 text-sm">Select Project</p>
                <p className="text-xs text-gray-500">
                  {currentModule?.display_name || 'Choose workspace'}
                </p>
              </div>
            </div>
            <ChevronDownIcon 
              className={`w-4 h-4 text-gray-400 transition-transform ${
                showProjectSelector ? 'transform rotate-180' : ''
              }`} 
            />
          </button>

          {/* Dropdown */}
          {showProjectSelector && availableModules && availableModules.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-10">
              {availableModules.map((module) => (
                <button
                  key={module.id}
                  onClick={() => {
                    if (onModuleSwitch) {
                      onModuleSwitch(module);
                    }
                    setShowProjectSelector(false);
                  }}
                  className="w-full text-left flex items-center space-x-3 p-3 hover:bg-gray-50 transition-colors"
                >
                  <div className={`w-6 h-6 rounded flex items-center justify-center text-white text-xs bg-${module.color_theme}-600`}>
                    {module.icon}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{module.display_name}</p>
                  </div>
                </button>
              ))}
              
              {/* Add New Project */}
              <div className="border-t border-gray-200 mt-1 pt-1">
                <button
                  onClick={() => {
                    // Handle add new project
                    setShowProjectSelector(false);
                    // TODO: Show create project modal
                  }}
                  className="w-full text-left flex items-center space-x-3 p-3 hover:bg-blue-50 transition-colors text-blue-600 hover:text-blue-700"
                >
                  <div className="w-6 h-6 rounded flex items-center justify-center bg-blue-100 text-blue-600">
                    <PlusIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <p className="font-medium text-sm">Add New Project</p>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {/* Main Navigation */}
        <div className="p-4">
          <div className="space-y-1">
            {menuItems.map((item) => (
              <div key={item.id}>
                <button
                  onClick={() => onViewSelect(item.id)}
                  className={`w-full text-left px-3 py-2 rounded transition-colors flex items-center justify-between ${
                    selectedView === item.id
                      ? 'bg-indigo-100 text-indigo-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <item.icon className="w-5 h-5" />
                    <span className="font-medium">{item.name}</span>
                  </div>
                  {item.type === 'expandable' && (
                    <ChevronRightIcon className="w-4 h-4" />
                  )}
                </button>
                

              </div>
            ))}
          </div>
        </div>

        {/* Active Workflows */}
        {activeWorkflows.length > 0 && (
          <div className="border-t border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-500 mb-2">ACTIVE WORKFLOWS</h3>
            <div className="space-y-1">
              {activeWorkflows.map((workflow) => (
                <div key={workflow.id}>
                  <button
                    onClick={() => toggleWorkflowExpansion(workflow.id)}
                    className={`w-full text-left px-3 py-2 rounded transition-colors flex items-center justify-between ${
                      selectedView === `workflow_${workflow.id}`
                        ? 'bg-green-100 text-green-700'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                      <span className="text-sm font-medium truncate">{workflow.name}</span>
                    </div>
                    {expandedWorkflows.includes(workflow.id) ? (
                      <ChevronDownIcon className="w-4 h-4" />
                    ) : (
                      <ChevronRightIcon className="w-4 h-4" />
                    )}
                  </button>
                  
                  {/* Workstream submenu */}
                  {expandedWorkflows.includes(workflow.id) && workflow.workstreams && (
                    <div className="ml-6 mt-1 space-y-1">
                      {workflow.workstreams.map((workstream, index) => (
                        <button
                          key={workstream.id || workstream.template_workstream_key || index}
                          onClick={() => onViewSelect('workstream_detail', { workflow, workstream })}
                          className="w-full text-left px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-50 rounded flex items-center space-x-2"
                        >
                          <div className={`w-1.5 h-1.5 rounded-full ${
                            workstream.status === 'completed' ? 'bg-green-500' :
                            workstream.status === 'in_progress' ? 'bg-blue-500' :
                            workstream.status === 'started' ? 'bg-yellow-500' : 'bg-gray-300'
                          }`}></div>
                          <span className="truncate">{workstream.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}; 