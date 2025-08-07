import React, { useState } from 'react';
import { useModule } from '../contexts/ModuleContext';
import { ModuleSelector } from './ModuleSelector';
import { ModuleHeader } from './ModuleHeader';
import { Sidebar } from './Sidebar';
import { Dashboard } from './Dashboard';
import { PropertiesTable } from './PropertiesTable';
import { PropertyPanel } from './PropertyPanel';
import { TaskManager } from './TaskManager';
import { WorkstreamsTab } from './WorkstreamsTab';
import { OnboardingWizard } from './OnboardingWizard';
import { NotificationBuilder } from './NotificationBuilder';
import { FloatingWorkflowConfigAgent } from './FloatingWorkflowConfigAgent';
import { FloatingReportingAgent } from './FloatingReportingAgent';
import { TemplateEditor } from './TemplateEditor';
import { Property, WorkflowTemplate, WorkflowInstance } from '../types';
import { supabase } from '../lib/supabase';

interface TurnkeyAppProps {
  properties: Property[];
  setProperties: React.Dispatch<React.SetStateAction<Property[]>>;
  templates: WorkflowTemplate[];
  setTemplates: React.Dispatch<React.SetStateAction<WorkflowTemplate[]>>;
  workflowInstances: WorkflowInstance[];
  setWorkflowInstances: React.Dispatch<React.SetStateAction<WorkflowInstance[]>>;
  selectedProperty: Property | null;
  setSelectedProperty: React.Dispatch<React.SetStateAction<Property | null>>;
  selectedView: string;
  setSelectedView: React.Dispatch<React.SetStateAction<string>>;
  selectedWorkflow: WorkflowInstance | null;
  setSelectedWorkflow: React.Dispatch<React.SetStateAction<WorkflowInstance | null>>;
  showOnboarding: boolean;
  setShowOnboarding: React.Dispatch<React.SetStateAction<boolean>>;
}

export const TurnkeyApp: React.FC<TurnkeyAppProps> = (props) => {
  const {
    currentModule,
    availableModules,
    switchModule,
    isLoading,
    error
  } = useModule();

  const [showModuleSelector, setShowModuleSelector] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Show module selector if no current module or user wants to switch
  if (!currentModule || showModuleSelector) {
    return (
      <ModuleSelector
        modules={availableModules}
        onSelect={(module) => {
          switchModule(module.id);
          setShowModuleSelector(false);
        }}
        isLoading={isLoading}
      />
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-red-50">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-red-800">Something went wrong</h2>
          <p className="text-red-600 mt-2">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // Render module-specific app
  const renderModuleContent = () => {
    switch (currentModule.name) {
      case 'valuations':
        return <ValuationsModule {...props} />;
      case 'lease_management':
        return <LeaseManagementModule {...props} />;
      case 'acquisition':
        return <AcquisitionModule {...props} />;
      case 'asset_management':
        return <AssetManagementModule {...props} />;
      default:
        return <ValuationsModule {...props} />; // Default fallback
    }
  };

  return (
    <div className={`min-h-screen bg-gray-50 theme-${currentModule.color_theme}`}>
      {/* Module Header */}
      <ModuleHeader
        currentModule={currentModule}
        availableModules={availableModules}
        onModuleSwitch={(module) => switchModule(module.id)}
        onShowModuleSelector={() => setShowModuleSelector(true)}
        onShowNotifications={() => setShowNotifications(true)}
      />

      {/* Main Content */}
      {renderModuleContent()}

      {/* Notification Builder */}
      <NotificationBuilder
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
      />


    </div>
  );
};

// Valuations Module (your current app)
const ValuationsModule: React.FC<TurnkeyAppProps> = ({
  properties,
  setProperties,
  templates,
  setTemplates,
  workflowInstances,
  setWorkflowInstances,
  selectedProperty,
  setSelectedProperty,
  selectedView,
  setSelectedView,
  selectedWorkflow,
  setSelectedWorkflow,
  showOnboarding,
  setShowOnboarding
}) => {
  const [isEditingTemplate, setIsEditingTemplate] = useState(false);
  const { currentModule, availableModules, switchModule } = useModule();
  
  const renderMainContent = () => {
    switch (selectedView) {
      case 'dashboard':
        return (
          <div className="relative">
            <Dashboard 
              properties={properties}
              workflowInstances={workflowInstances}
            />
            <FloatingReportingAgent
              properties={properties}
              workflowInstances={workflowInstances}
            />
          </div>
        );
      case 'property_register':
        return (
          <div className="h-full bg-white">
            <div className="p-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-6">Property Register</h1>
              <PropertiesTable 
                properties={properties}
                workflowInstances={workflowInstances}
                selectedProperty={selectedProperty}
                onPropertySelect={setSelectedProperty}
                onPropertiesUpdate={(updatedProperty) => {
                  setProperties(prev => 
                    prev.map(p => p.id === updatedProperty.id ? updatedProperty : p)
                  );
                }}
              />
            </div>
          </div>
        );
      case 'task_manager':
        return (
          <TaskManager 
            properties={properties}
            workflowInstances={workflowInstances}
            templates={templates}
            onPushToWorkflow={async (property, template, workflowName) => {
              // Create a new workflow instance
              const newWorkflow: WorkflowInstance = {
                id: crypto.randomUUID(),
                property_id: property.id,
                template_id: template.id,
                name: workflowName,
                status: 'active',
                current_stage: template.stages?.[0] || 'initial',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                completed_at: null,
                form_data: {},
                workstreams: template.workstreams || []
              };
              setWorkflowInstances(prev => [...prev, newWorkflow]);
            }}
            onNavigateToProperty={setSelectedProperty}
          />
        );
      case 'workstreams':
        return (
          <WorkstreamsTab 
            workflowInstance={selectedWorkflow}
            properties={properties}
          />
        );
      case 'workflow_templates':
        return (
          <div className="flex-1 p-6 overflow-auto bg-gray-50">
            <div className="mb-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Group Valuations - Workflow Template</h1>
                  <p className="text-sm text-gray-500">Data structure and configuration for the valuation workflow</p>
                </div>
                <button
                  onClick={() => setIsEditingTemplate(!isEditingTemplate)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    isEditingTemplate 
                      ? 'bg-gray-600 text-white hover:bg-gray-700' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {isEditingTemplate ? 'View Template' : 'Edit Template'}
                </button>
              </div>
            </div>
            
            {/* Show only Group Valuations template */}
            {templates
              .filter(template => template.key === 'valuations')
              .map((template) => (
                <div key={template.id} className="space-y-6">
                  {/* Template Overview */}
                  <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <div className="flex items-center justify-between mb-4">
                      <h2 className="text-xl font-semibold text-gray-900">{template.name}</h2>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                        {template.category}
                      </span>
                    </div>
                    <p className="text-gray-600 mb-4">{template.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium text-gray-700">Template Key:</span>
                        <div className="text-gray-900">{template.key}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Stages:</span>
                        <div className="text-gray-900">{template.stages?.length || 0}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Workstreams:</span>
                        <div className="text-gray-900">{template.workstreams?.length || 0}</div>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700">Total Fields:</span>
                        <div className="text-gray-900">
                          {template.workstreams?.reduce((total, ws) => total + (ws.fields?.length || 0), 0) || 0}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stages */}
                  {template.stages && (
                    <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Workflow Stages ({template.stages.length})</h3>
                      <div className="flex items-center space-x-4 overflow-x-auto">
                        {template.stages.map((stage, index) => (
                          <div key={index} className="flex items-center space-x-2 min-w-0">
                            <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0">
                              {index + 1}
                            </div>
                            <span className="text-sm text-gray-900 whitespace-nowrap">{stage}</span>
                            {index < template.stages.length - 1 && (
                              <div className="w-8 h-0.5 bg-gray-300 flex-shrink-0"></div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Workstreams Data Structure */}
                  {template.workstreams && (
                    <div className="bg-white p-4 rounded-lg shadow border border-gray-200">
                      <h3 className="text-lg font-semibold text-gray-900 mb-3">Workstreams Data Structure</h3>
                      
                      {isEditingTemplate ? (
                        <TemplateEditor 
                          template={template} 
                          onTemplateUpdate={(updatedTemplate) => {
                            const updatedTemplates = templates.map(t => 
                              t.key === 'valuations' ? updatedTemplate : t
                            );
                            setTemplates(updatedTemplates);
                          }} 
                        />
                      ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          {template.workstreams.map((workstream, index) => (
                            <div key={index} className="border border-gray-100 rounded-lg p-3 bg-gray-50">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                  <span className="w-6 h-6 bg-gray-600 text-white rounded-full flex items-center justify-center text-xs font-medium">
                                    {index + 1}
                                  </span>
                                  <h4 className="text-sm font-medium text-gray-900">{workstream.name}</h4>
                                </div>
                                <span className="text-xs text-gray-500 bg-white px-2 py-1 rounded">
                                  {workstream.fields?.length || 0} fields
                                </span>
                              </div>

                              {/* Compact Fields Grid */}
                              {workstream.fields && workstream.fields.length > 0 && (
                                <div className="grid grid-cols-2 gap-1">
                                  {workstream.fields.map((field, fieldIndex) => (
                                    <div key={fieldIndex} className="bg-white p-2 rounded text-xs">
                                      <div className="flex items-center justify-between">
                                        <div className="flex items-center space-x-1">
                                          <span className="font-medium text-gray-900 truncate">{field.label}</span>
                                          {field.type === 'formula' && (
                                            <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                                              ƒ
                                            </span>
                                          )}
                                        </div>
                                        <span className="text-gray-500 ml-1">{field.type}</span>
                                      </div>
                                      {field.type === 'formula' && field.formula && (
                                        <div className="text-purple-600 font-mono text-xs mt-1 truncate" title={field.formula}>
                                          = {field.formula}
                                        </div>
                                      )}
                                      
                                      {/* Show field references for formulas */}
                                      {field.type === 'formula' && field.formula && (
                                        <div className="text-xs text-gray-400 mt-1">
                                          References: {field.formula.match(/[a-zA-Z_][a-zA-Z0-9_]*/g)?.filter(ref => 
                                            ref !== 'field' && ref !== 'IF' && ref !== 'ABS' && ref !== 'SUM' && ref !== 'AVG'
                                          ).join(', ') || 'none'}
                                        </div>
                                      )}
                                      {field.options && field.options.length > 0 && (
                                        <div className="text-gray-500 text-xs mt-1 truncate" title={field.options.join(', ')}>
                                          {field.options.slice(0, 2).join(', ')}
                                          {field.options.length > 2 && '...'}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}


                </div>
              ))}
              
              {/* Floating Workflow Config Agent - only on workflow templates */}
              <FloatingWorkflowConfigAgent
                templates={templates}
                onTemplateUpdate={async (updatedTemplate) => {
                  // Update local state
                  setTemplates(prev => 
                    prev.map(t => t.id === updatedTemplate.id ? updatedTemplate : t)
                  );
                  
                  // Update database
                  try {
                    const { error } = await supabase
                      .from('workflow_templates')
                      .update({
                        name: updatedTemplate.name,
                        description: updatedTemplate.description,
                        stages: updatedTemplate.stages,
                        workstreams: updatedTemplate.workstreams,
                        updated_at: new Date().toISOString()
                      })
                      .eq('id', updatedTemplate.id);
                    
                    if (error) {
                      console.error('Error updating template in database:', error);
                    } else {
                      console.log('✅ Template updated successfully in database');
                    }
                  } catch (error) {
                    console.error('Error updating template:', error);
                  }
                }}
              />
          </div>
        );
      case 'template_detail':
        return (
          <div className="flex-1 p-6 overflow-auto bg-gray-50">
            <div className="mb-6">
              <button 
                onClick={() => setSelectedView('workflow_templates')}
                className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1"
              >
                <span>←</span>
                <span>Back to Templates</span>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">{selectedWorkflow?.name || 'Template Details'}</h1>
              <p className="text-sm text-gray-500">{selectedWorkflow?.description}</p>
            </div>
            
            {selectedWorkflow ? (
              <div className="space-y-6">
                {/* Template Overview */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Template Overview</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Key:</span>
                      <div className="text-gray-900">{selectedWorkflow.key}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Category:</span>
                      <div className="text-gray-900">{selectedWorkflow.category}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Stages:</span>
                      <div className="text-gray-900">{selectedWorkflow.stages?.length || 0}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Workstreams:</span>
                      <div className="text-gray-900">{selectedWorkflow.workstreams?.length || 0}</div>
                    </div>
                  </div>
                </div>

                {/* Stages */}
                {selectedWorkflow.stages && (
                  <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Stages</h2>
                    <div className="flex items-center space-x-4">
                      {selectedWorkflow.stages.map((stage, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                            {index + 1}
                          </div>
                          <span className="text-sm font-medium text-gray-900">{stage}</span>
                          {index < selectedWorkflow.stages!.length - 1 && (
                            <div className="w-8 h-0.5 bg-gray-300"></div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Workstreams */}
                {selectedWorkflow.workstreams && (
                  <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Workstreams</h2>
                    <div className="space-y-4">
                      {selectedWorkflow.workstreams.map((workstream, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium text-gray-900">{workstream.name}</h3>
                            <span className="text-xs text-gray-500">#{index + 1}</span>
                          </div>
                          {workstream.fields && workstream.fields.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              {workstream.fields.map((field, fieldIndex) => (
                                <div key={fieldIndex} className="flex items-center space-x-2 text-gray-600">
                                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                                  <span>{field.label}</span>
                                  <span className="text-xs text-gray-400">({field.type})</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No template data available</p>
                <p className="text-sm text-gray-400 mt-2">Debug: selectedWorkflow is {selectedWorkflow ? 'defined' : 'null'}</p>
              </div>
            )}
          </div>
        );
      case 'workstream_detail':
        return (
          <div className="flex-1 p-6 overflow-auto bg-gray-50">
            <div className="mb-6">
              <button
                onClick={() => setSelectedView('workstreams')}
                className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1"
              >
                <span>←</span>
                <span>Back to Workstreams</span>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedWorkflow?.name || 'Workflow'} - Workstream Detail
              </h1>
              <p className="text-sm text-gray-500">
                Manage individual workstream tasks and progress
              </p>
            </div>
            
            {selectedWorkflow ? (
              <div className="space-y-6">
                {/* Workflow Overview */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Workflow Overview</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Status:</span>
                      <div className="text-gray-900 capitalize">{selectedWorkflow.status}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Current Stage:</span>
                      <div className="text-gray-900">{selectedWorkflow.current_stage}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Created:</span>
                      <div className="text-gray-900">
                        {new Date(selectedWorkflow.created_at).toLocaleDateString()}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Workstreams:</span>
                      <div className="text-gray-900">{selectedWorkflow.workstreams?.length || 0}</div>
                    </div>
                  </div>
                </div>

                {/* Group Valuation Template Structure */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Group Valuation Template Structure</h2>
                  <div className="space-y-4">
                    {templates
                      .filter(template => template.key === 'valuations')
                      .map((template) => (
                        <div key={template.id} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-medium text-gray-900">{template.name}</h3>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {template.category}
                            </span>
                          </div>
                          
                          <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                          
                          {template.stages && (
                            <div className="mb-4">
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Stages ({template.stages.length})</h4>
                              <div className="flex items-center space-x-4">
                                {template.stages.map((stage, index) => (
                                  <div key={index} className="flex items-center space-x-2">
                                    <div className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-medium">
                                      {index + 1}
                                    </div>
                                    <span className="text-sm text-gray-900">{stage}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {template.workstreams && (
                            <div>
                              <h4 className="text-sm font-medium text-gray-700 mb-2">Workstreams ({template.workstreams.length})</h4>
                              <div className="space-y-2">
                                {template.workstreams.map((workstream, index) => (
                                  <div key={index} className="flex items-center space-x-2 text-sm text-gray-600">
                                    <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                                    <span className="font-medium">{workstream.name}</span>
                                    <span className="text-xs text-gray-400">({workstream.fields?.length || 0} fields)</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                </div>

                {/* Workstreams List */}
                {selectedWorkflow.workstreams && (
                  <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">Workstreams</h2>
                    <div className="space-y-4">
                      {selectedWorkflow.workstreams.map((workstream, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="font-medium text-gray-900">{workstream.name}</h3>
                            <div className="flex items-center space-x-2">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                workstream.status === 'completed' ? 'bg-green-100 text-green-800' :
                                workstream.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                                workstream.status === 'started' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {workstream.status || 'not_started'}
                              </span>
                              <span className="text-xs text-gray-500">#{index + 1}</span>
                            </div>
                          </div>
                          {workstream.description && (
                            <p className="text-sm text-gray-600 mb-3">{workstream.description}</p>
                          )}
                          {workstream.fields && workstream.fields.length > 0 && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              {workstream.fields.map((field, fieldIndex) => (
                                <div key={fieldIndex} className="flex items-center space-x-2 text-gray-600">
                                  <div className="w-1.5 h-1.5 bg-gray-300 rounded-full"></div>
                                  <span>{field.label}</span>
                                  <span className="text-xs text-gray-400">({field.type})</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {/* Enter Data Button */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <button
                    onClick={() => {
                      const property = properties.find(p => p.id === selectedWorkflow?.property_id);
                      if (property) {
                        setSelectedProperty(property);
                        setSelectedView('workstream_form');
                      }
                    }}
                    className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
                  >
                    Enter Workstream Data
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No workflow data available</p>
                <p className="text-sm text-gray-400 mt-2">Debug: selectedWorkflow is {selectedWorkflow ? 'defined' : 'null'}</p>
              </div>
            )}
          </div>
        );
      case 'workstream_form':
        return (
          <div className="flex-1 p-6 overflow-auto bg-gray-50">
            <div className="mb-6">
              <button
                onClick={() => setSelectedView('workstream_detail')}
                className="mb-4 text-sm text-gray-600 hover:text-gray-900 flex items-center space-x-1"
              >
                <span>←</span>
                <span>Back to Workstream Detail</span>
              </button>
              <h1 className="text-2xl font-bold text-gray-900">
                {selectedProperty?.name} - Workstream Data Entry
              </h1>
              <p className="text-sm text-gray-500">
                Enter data for the current workstream
              </p>
            </div>
            
            {selectedProperty && selectedWorkflow ? (
              <div className="space-y-6">
                {/* Property Info */}
                <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Property Information</h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Name:</span>
                      <div className="text-gray-900">{selectedProperty.name}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Address:</span>
                      <div className="text-gray-900">{selectedProperty.address}</div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Type:</span>
                      <div className="text-gray-900 capitalize">
                        {selectedProperty.property_type?.replace('_', ' ')}
                      </div>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Current Value:</span>
                      <div className="text-gray-900">
                        ${selectedProperty.current_value?.toLocaleString() || 'N/A'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Workstream Forms */}
                {selectedWorkflow.workstreams && (
                  <div className="space-y-6">
                    {selectedWorkflow.workstreams.map((workstream, index) => (
                      <div key={index} className="bg-white p-6 rounded-lg shadow border border-gray-200">
                        <div className="flex items-center justify-between mb-4">
                          <h2 className="text-lg font-semibold text-gray-900">{workstream.name}</h2>
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            workstream.status === 'completed' ? 'bg-green-100 text-green-800' :
                            workstream.status === 'in_progress' ? 'bg-blue-100 text-blue-800' :
                            workstream.status === 'started' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {workstream.status || 'not_started'}
                          </span>
                        </div>
                        
                        {workstream.description && (
                          <p className="text-sm text-gray-600 mb-4">{workstream.description}</p>
                        )}

                        {workstream.fields && workstream.fields.length > 0 && (
                          <div className="space-y-4">
                            {workstream.fields.map((field, fieldIndex) => (
                              <div key={fieldIndex} className="space-y-2">
                                <label className="block text-sm font-medium text-gray-700">
                                  {field.label}
                                </label>
                                {field.type === 'text' && (
                                  <input
                                    type="text"
                                    className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                    placeholder={`Enter ${field.label.toLowerCase()}`}
                                    value={workstream.form_data?.[field.id] || ''}
                                    onChange={(e) => {
                                      // Update the workstream form data
                                      const updatedWorkstreams = selectedWorkflow.workstreams?.map((ws, wsIndex) => 
                                        wsIndex === index 
                                          ? { ...ws, form_data: { ...ws.form_data, [field.id]: e.target.value } }
                                          : ws
                                      );
                                      const updatedWorkflow = {
                                        ...selectedWorkflow,
                                        workstreams: updatedWorkstreams
                                      };
                                      setSelectedWorkflow(updatedWorkflow);
                                      
                                      // Update the workflow instances in the main state
                                      setWorkflowInstances(prev => 
                                        prev.map(wi => 
                                          wi.id === selectedWorkflow.id ? updatedWorkflow : wi
                                        )
                                      );
                                    }}
                                  />
                                )}
                                                                 {field.type === 'number' && (
                                   <input
                                     type="number"
                                     className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                     placeholder={`Enter ${field.label.toLowerCase()}`}
                                     value={workstream.form_data?.[field.id] || ''}
                                     onChange={(e) => {
                                       const updatedWorkstreams = selectedWorkflow.workstreams?.map((ws, wsIndex) => 
                                         wsIndex === index 
                                           ? { ...ws, form_data: { ...ws.form_data, [field.id]: e.target.value } }
                                           : ws
                                       );
                                       const updatedWorkflow = {
                                         ...selectedWorkflow,
                                         workstreams: updatedWorkstreams
                                       };
                                       setSelectedWorkflow(updatedWorkflow);
                                       
                                       // Update the workflow instances in the main state
                                       setWorkflowInstances(prev => 
                                         prev.map(wi => 
                                           wi.id === selectedWorkflow.id ? updatedWorkflow : wi
                                         )
                                       );
                                     }}
                                   />
                                 )}
                                                                 {field.type === 'textarea' && (
                                   <textarea
                                     rows={3}
                                     className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                     placeholder={`Enter ${field.label.toLowerCase()}`}
                                     value={workstream.form_data?.[field.id] || ''}
                                     onChange={(e) => {
                                       const updatedWorkstreams = selectedWorkflow.workstreams?.map((ws, wsIndex) => 
                                         wsIndex === index 
                                           ? { ...ws, form_data: { ...ws.form_data, [field.id]: e.target.value } }
                                           : ws
                                       );
                                       const updatedWorkflow = {
                                         ...selectedWorkflow,
                                         workstreams: updatedWorkstreams
                                       };
                                       setSelectedWorkflow(updatedWorkflow);
                                       
                                       // Update the workflow instances in the main state
                                       setWorkflowInstances(prev => 
                                         prev.map(wi => 
                                           wi.id === selectedWorkflow.id ? updatedWorkflow : wi
                                         )
                                       );
                                     }}
                                   />
                                 )}
                                                                 {field.type === 'select' && field.options && (
                                   <select
                                     className="mt-1 block w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                                     value={workstream.form_data?.[field.id] || ''}
                                     onChange={(e) => {
                                       const updatedWorkstreams = selectedWorkflow.workstreams?.map((ws, wsIndex) => 
                                         wsIndex === index 
                                           ? { ...ws, form_data: { ...ws.form_data, [field.id]: e.target.value } }
                                           : ws
                                       );
                                       const updatedWorkflow = {
                                         ...selectedWorkflow,
                                         workstreams: updatedWorkstreams
                                       };
                                       setSelectedWorkflow(updatedWorkflow);
                                       
                                       // Update the workflow instances in the main state
                                       setWorkflowInstances(prev => 
                                         prev.map(wi => 
                                           wi.id === selectedWorkflow.id ? updatedWorkflow : wi
                                         )
                                       );
                                     }}
                                   >
                                     <option value="">Select {field.label.toLowerCase()}</option>
                                     {field.options.map((option, optionIndex) => (
                                       <option key={optionIndex} value={option}>
                                         {option}
                                       </option>
                                     ))}
                                   </select>
                                 )}
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="mt-6 flex items-center justify-between">
                          <div className="text-sm text-gray-500">
                            {workstream.assignee_id && (
                              <span>Assigned to: {workstream.assignee_id}</span>
                            )}
                          </div>
                          <div className="flex space-x-3">
                            {workstream.status === 'pending' && workstream.can_start && (
                              <button
                                onClick={() => {
                                  const updatedWorkstreams = selectedWorkflow.workstreams?.map((ws, wsIndex) => 
                                    wsIndex === index 
                                      ? { ...ws, status: 'started', started_at: new Date().toISOString() }
                                      : ws
                                  );
                                  const updatedWorkflow = {
                                    ...selectedWorkflow,
                                    workstreams: updatedWorkstreams
                                  };
                                  setSelectedWorkflow(updatedWorkflow);
                                  
                                  // Update the workflow instances in the main state
                                  setWorkflowInstances(prev => 
                                    prev.map(wi => 
                                      wi.id === selectedWorkflow.id ? updatedWorkflow : wi
                                    )
                                  );
                                }}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
                              >
                                Start Workstream
                              </button>
                            )}
                            {workstream.status === 'started' && (
                              <button
                                onClick={() => {
                                  const updatedWorkstreams = selectedWorkflow.workstreams?.map((ws, wsIndex) => 
                                    wsIndex === index 
                                      ? { ...ws, status: 'in_progress' }
                                      : ws
                                  );
                                  const updatedWorkflow = {
                                    ...selectedWorkflow,
                                    workstreams: updatedWorkstreams
                                  };
                                  setSelectedWorkflow(updatedWorkflow);
                                  
                                  // Update the workflow instances in the main state
                                  setWorkflowInstances(prev => 
                                    prev.map(wi => 
                                      wi.id === selectedWorkflow.id ? updatedWorkflow : wi
                                    )
                                  );
                                }}
                                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                              >
                                Mark In Progress
                              </button>
                            )}
                            {workstream.status === 'in_progress' && (
                              <button
                                onClick={() => {
                                  const updatedWorkstreams = selectedWorkflow.workstreams?.map((ws, wsIndex) => 
                                    wsIndex === index 
                                      ? { ...ws, status: 'completed', completed_at: new Date().toISOString() }
                                      : ws
                                  );
                                  const updatedWorkflow = {
                                    ...selectedWorkflow,
                                    workstreams: updatedWorkstreams
                                  };
                                  setSelectedWorkflow(updatedWorkflow);
                                  
                                  // Update the workflow instances in the main state
                                  setWorkflowInstances(prev => 
                                    prev.map(wi => 
                                      wi.id === selectedWorkflow.id ? updatedWorkflow : wi
                                    )
                                  );
                                }}
                                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700 transition-colors"
                              >
                                Complete Workstream
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500">No property or workflow data available</p>
              </div>
            )}
          </div>
        );
      default:
        return (
          <Dashboard 
            properties={properties}
            workflowInstances={workflowInstances}
          />
        );
    }
  };

  return (
    <div className="flex h-screen bg-gray-100">
      {/* Sidebar */}
              <Sidebar
          templates={templates}
          workflowInstances={workflowInstances}
          selectedView={selectedView}
          onViewSelect={(view, data) => {
            console.log('🔍 onViewSelect called:', { view, data });
            setSelectedView(view);
            // If it's a template detail view, set the selected workflow to the template data
            if (view === 'template_detail' && data) {
              console.log('📋 Setting template data:', data);
              setSelectedWorkflow(data);
            }
            // If it's a workstream detail view, set the selected workflow to the workflow data
            if (view === 'workstream_detail' && data) {
              console.log('📋 Setting workstream data:', data);
              setSelectedWorkflow(data.workflow);
            }
            // Close property panel when navigating to different pages
            setSelectedProperty(null);
          }}
          currentModule={currentModule}
          availableModules={availableModules}
          onModuleSwitch={(module) => switchModule(module.id)}
        />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {renderMainContent()}
      </div>

      {/* Property Panel */}
      {selectedProperty && (
        <PropertyPanel
          property={selectedProperty}
          workflowInstance={null}
          onClose={() => setSelectedProperty(null)}
          onWorkflowUpdate={() => {}}
          onPropertyUpdate={(updatedProperty) => {
            setProperties(prev => 
              prev.map(p => p.id === updatedProperty.id ? updatedProperty : p)
            );
          }}
        />
      )}

      {/* Onboarding Wizard */}
      {showOnboarding && (
        <OnboardingWizard
          onComplete={() => setShowOnboarding(false)}
          onSkip={() => setShowOnboarding(false)}
          properties={properties}
          setProperties={setProperties}
        />
      )}


    </div>
  );
};

// Placeholder modules for other workflows
const LeaseManagementModule: React.FC<TurnkeyAppProps> = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">🏢 Lease Management</h2>
          <p className="text-gray-600 mb-8">Complete lease lifecycle management system coming soon!</p>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="p-4 bg-green-100 rounded-lg">
              <h3 className="font-semibold text-green-800">Tenant Screening</h3>
              <p className="text-sm text-green-600">Background checks & application review</p>
            </div>
            <div className="p-4 bg-green-100 rounded-lg">
              <h3 className="font-semibold text-green-800">Rent Collection</h3>
              <p className="text-sm text-green-600">Automated payment processing</p>
            </div>
            <div className="p-4 bg-green-100 rounded-lg">
              <h3 className="font-semibold text-green-800">Lease Renewals</h3>
              <p className="text-sm text-green-600">Renewal negotiation workflows</p>
            </div>
            <div className="p-4 bg-green-100 rounded-lg">
              <h3 className="font-semibold text-green-800">Maintenance</h3>
              <p className="text-sm text-green-600">Tenant request management</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AcquisitionModule: React.FC<TurnkeyAppProps> = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">🏗️ Property Acquisition</h2>
          <p className="text-gray-600 mb-8">Due diligence and acquisition workflows coming soon!</p>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="p-4 bg-purple-100 rounded-lg">
              <h3 className="font-semibold text-purple-800">Property Sourcing</h3>
              <p className="text-sm text-purple-600">Deal pipeline management</p>
            </div>
            <div className="p-4 bg-purple-100 rounded-lg">
              <h3 className="font-semibold text-purple-800">Due Diligence</h3>
              <p className="text-sm text-purple-600">Comprehensive property analysis</p>
            </div>
            <div className="p-4 bg-purple-100 rounded-lg">
              <h3 className="font-semibold text-purple-800">Financing</h3>
              <p className="text-sm text-purple-600">Loan and investment workflows</p>
            </div>
            <div className="p-4 bg-purple-100 rounded-lg">
              <h3 className="font-semibold text-purple-800">Closing</h3>
              <p className="text-sm text-purple-600">Transaction completion</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const AssetManagementModule: React.FC<TurnkeyAppProps> = () => {
  return (
    <div className="flex h-screen bg-gray-100">
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">🔧 Asset Management</h2>
          <p className="text-gray-600 mb-8">Property management and optimization workflows coming soon!</p>
          <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
            <div className="p-4 bg-orange-100 rounded-lg">
              <h3 className="font-semibold text-orange-800">Maintenance</h3>
              <p className="text-sm text-orange-600">Preventive & corrective maintenance</p>
            </div>
            <div className="p-4 bg-orange-100 rounded-lg">
              <h3 className="font-semibold text-orange-800">CapEx Projects</h3>
              <p className="text-sm text-orange-600">Capital improvement workflows</p>
            </div>
            <div className="p-4 bg-orange-100 rounded-lg">
              <h3 className="font-semibold text-orange-800">Vendor Management</h3>
              <p className="text-sm text-orange-600">Contractor & service provider workflows</p>
            </div>
            <div className="p-4 bg-orange-100 rounded-lg">
              <h3 className="font-semibold text-orange-800">Performance</h3>
              <p className="text-sm text-orange-600">Property optimization analysis</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};