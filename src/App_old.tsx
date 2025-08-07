import React, { useState, useEffect } from 'react';
import { ModuleProvider } from './contexts/ModuleContext';
import { Property, WorkflowTemplate, WorkflowInstance } from './types';
import { mockProperties } from './lib/mockData';
import { supabase } from './lib/supabase';
import { WorkflowEngine } from './lib/workflowEngine';
import { TurnkeyApp } from './components/TurnkeyApp';

function App() {
  // Core state for the application
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [properties, setProperties] = useState<Property[]>(mockProperties);
  const [workflowInstances, setWorkflowInstances] = useState<WorkflowInstance[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedView, setSelectedView] = useState('dashboard');
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowInstance | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Check if user has completed onboarding when logged in
  useEffect(() => {
    if (isLoggedIn) {
      const hasCompletedOnboarding = localStorage.getItem('turnkey_onboarding_completed');
      if (!hasCompletedOnboarding) {
        setShowOnboarding(true);
      }
      loadData();
    }
  }, [isLoggedIn]);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setShowOnboarding(false);
  };

  const handleOnboardingComplete = () => {
    localStorage.setItem('turnkey_onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  const handleOnboardingSkip = () => {
    localStorage.setItem('turnkey_onboarding_completed', 'true');
    setShowOnboarding(false);
  };

  // Get workflow instance for selected property
  const selectedWorkflowInstance = selectedProperty 
    ? workflowInstances.find(wi => wi.property_id === selectedProperty.id) || null
    : null;

  const handleWorkflowUpdate = async (updates: any) => {
    console.log('Workflow update:', updates);
    
    try {
      if (updates.action === 'start_workstream') {
        await WorkflowEngine.activateWorkstream(updates.target);
      } else if (updates.action === 'complete_workstream') {
        await WorkflowEngine.completeWorkstream(updates.target);
      }
      
      // Reload data to reflect changes
      loadData();
    } catch (error) {
      console.error('Error updating workflow:', error);
    }
  };

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property);
  };

  const handleClosePropertyPanel = () => {
    setSelectedProperty(null);
  };

  const handlePropertyUpdate = (updatedProperty: Property) => {
    // Update the property in the properties array
    setProperties(prevProperties => 
      prevProperties.map(prop => 
        prop.id === updatedProperty.id ? updatedProperty : prop
      )
    );
    
    // Update the selected property if it's the one being updated
    if (selectedProperty && selectedProperty.id === updatedProperty.id) {
      setSelectedProperty(updatedProperty);
    }
  };

  const handleNavigateToProperty = (property: Property) => {
    setSelectedView('asset_register');
    setSelectedProperty(property);
  };

  const handleViewSelect = (view: string, data?: any) => {
    setSelectedView(view);
    setSelectedData(data);
    setSelectedProperty(null); // Close property panel when switching views
  };

  const handlePushToWorkflow = async (property: Property, template: WorkflowTemplate, workflowName: string) => {
    console.log('handlePushToWorkflow called with:', { property: property.id, template: template.key, workflowName });
    
    try {
      // Create workflow instance first
      console.log('Creating workflow instance...');
      const { data: instanceData, error: instanceError } = await supabase
        .from('workflow_instances')
        .insert([
          {
            user_id: mockUserId,
            template_id: template.id,
            property_id: property.id,
            name: workflowName,
            status: 'not_started',
            completion_percentage: 0,
          }
        ])
        .select('id')
        .single();
      
      if (instanceError || !instanceData) {
        console.error('Failed to create workflow instance:', instanceError);
        throw new Error(`Failed to create workflow instance: ${instanceError?.message || 'Unknown error'}`);
      }

      console.log('Workflow instance created:', instanceData.id);

      // Create workstreams from template
      if (template.workstreams) {
        console.log('Creating workstreams...');
        const workstreamsToInsert = template.workstreams.map((ws, index) => ({
          workflow_instance_id: instanceData.id,
          template_workstream_key: ws.key,
          name: ws.name,
          description: ws.name,
          order_index: index + 1,
          fields: ws.fields || [],
          form_data: {},
          status: 'pending',
          can_start: index === 0, // First workstream can start immediately
        }));

        const { error: workstreamsError } = await supabase
          .from('workstreams')
          .insert(workstreamsToInsert);

        if (workstreamsError) {
          console.error('Failed to create workstreams:', workstreamsError);
          throw new Error(`Failed to create workstreams: ${workstreamsError.message}`);
        }

        console.log('Workstreams created successfully');
      }

      // Start the workflow (activate first workstream)
      console.log('Starting workflow...');
      await WorkflowEngine.startWorkflow(instanceData.id);
      console.log('Workflow started successfully');
      
      console.log('Created workflow instance:', instanceData.id);
      // Reload data to show the new workflow instance
      console.log('Reloading data...');
      await loadData();
      console.log('Data reloaded successfully');
      
    } catch (error) {
      console.error('Error creating workflow:', error);
      
      // Add more specific error messages for common issues
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch')) {
          throw new Error('CORS error: Unable to connect to database. Make sure you\'re running on port 5173.');
        }
        throw error;
      }
      
      throw new Error('Unknown error occurred while creating workflow');
    }
  };

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load workflow templates
      const { data: templatesData, error: templatesError } = await supabase
        .from('workflow_templates')
        .select('*')
        .order('name');
      
      if (templatesError) {
        console.error('Error loading templates:', templatesError);
      } else {
        setTemplates(templatesData || []);
      }

      // Load properties
      const { data: propertiesData, error: propertiesError } = await supabase
        .from('properties')
        .select('*')
        .order('name');
      
      if (propertiesError) {
        console.error('Error loading properties:', propertiesError);
        // Fallback to mock data if properties table doesn't exist yet
        setProperties(mockProperties);
      } else {
        setProperties(propertiesData || []);
      }

      // Load workflow instances with workstreams
      const { data: instancesData, error: instancesError } = await supabase
        .from('workflow_instances')
        .select(`
          *,
          workstreams!workflow_instance_id (*)
        `)
        .order('created_at', { ascending: false });
      
      if (instancesError) {
        console.error('Error loading workflow instances:', instancesError);
      } else {
        setWorkflowInstances(instancesData || []);
      }
      
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderMainContent = () => {
    switch (selectedView) {
      case 'dashboard':
        return (
          <Dashboard 
            properties={properties}
            workflowInstances={workflowInstances}
          />
        );
      case 'property_register':
        return (
          <div className="flex-1 p-6 overflow-hidden">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Property Register</h1>
              <p className="text-sm text-gray-500">Manage your property portfolio</p>
            </div>
            <PropertiesTable
              properties={properties}
              workflowInstances={workflowInstances}
              selectedProperty={selectedProperty}
              onPropertySelect={handlePropertySelect}
              onPropertiesUpdate={handlePropertyUpdate}
            />
          </div>
        );
        
      case 'task_manager':
        return (
          <TaskManager
            properties={properties}
            workflowInstances={workflowInstances}
            templates={templates}
            onPushToWorkflow={handlePushToWorkflow}
            onNavigateToProperty={handleNavigateToProperty}
            onDataRefresh={loadData}
          />
        );
        
      case 'workflow_templates':
        return (
          <div className="flex-1 p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">Workflow Templates</h1>
              <p className="text-sm text-gray-500">Available workflow templates for your operations</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {templates.map((template) => (
                <div key={template.id} className="bg-white p-6 rounded-lg shadow border border-gray-200">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">{template.name}</h3>
                  <p className="text-sm text-gray-500 mb-4">{template.description}</p>
                  <div className="text-xs text-gray-400">
                    <div>Key: {template.key}</div>
                    <div>Category: {template.category}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
        
      case 'template_detail':
        return (
          <div className="flex-1 p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{selectedData?.name}</h1>
              <p className="text-sm text-gray-500">{selectedData?.description}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-700">Template Key:</span> {selectedData?.key}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Category:</span> {selectedData?.category}
                </div>
              </div>
            </div>
          </div>
        );
        
      case 'workstream_detail':
        return (
          <div className="flex-1 p-6">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{selectedData?.workflow?.name}</h1>
              <p className="text-sm text-gray-500">Workstream: {selectedData?.workstream?.name}</p>
            </div>
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="grid grid-cols-2 gap-4 text-sm mb-6">
                <div>
                  <span className="font-medium text-gray-700">Status:</span> {selectedData?.workstream?.status}
                </div>
                <div>
                  <span className="font-medium text-gray-700">Order:</span> {selectedData?.workstream?.order_index}
                </div>
              </div>
              {selectedData?.workstream?.fields && (
                <div>
                  <h3 className="font-medium text-gray-900 mb-2">Fields</h3>
                  <pre className="text-xs bg-gray-50 p-4 rounded overflow-auto">
                    {JSON.stringify(selectedData.workstream.fields, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        );
        
      default:
        // Handle dynamic workflow views
        if (selectedView.startsWith('workflow_')) {
          const workflowId = selectedView.replace('workflow_', '');
          const workflow = workflowInstances.find(wi => wi.id === workflowId);
          
          if (workflow) {
            return (
              <div className="flex-1 flex flex-col">
                <div className="p-6 border-b border-gray-200">
                  <h1 className="text-2xl font-bold text-gray-900">{workflow.name}</h1>
                  <p className="text-sm text-gray-500">Progress: {workflow.completion_percentage}%</p>
                </div>
                <WorkstreamsTab
                  workflowInstance={workflow}
                  onWorkflowUpdate={handleWorkflowUpdate}
                />
              </div>
            );
          }
        }
        
        return (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <p>Select a view from the sidebar</p>
            </div>
          </div>
        );
    }
  };

  // Landing Page Component
  if (!isLoggedIn) {
    return (
      <div className="bg-gradient-to-br from-blue-50 via-orange-50 to-blue-50">
        {/* Top Navigation - Base44 Style */}
        <nav className="flex justify-between items-center p-6 bg-white/80 backdrop-blur-sm border-b border-gray-100">
          <div className="text-2xl font-bold text-gray-900">
            Turnkey
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-gray-600 hover:text-gray-900 font-medium">Features</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 font-medium">Pricing</a>
          <button 
            onClick={handleLogin}
              className="px-6 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-all duration-300"
          >
              Start Building
          </button>
          </div>
        </nav>

        {/* Hero Section - Base44 Inspired */}
        <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
          <div className="text-center max-w-5xl mx-auto relative z-10">
            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Let's make your real estate
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-blue-600">
                operation a reality.
              </span>
              <br />
              Right now.
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Turnkey lets you build fully-functional real estate workflows in minutes with just your words. No coding necessary.
            </p>

            {/* Primary CTA */}
            <button 
              onClick={handleLogin}
              className="px-12 py-4 bg-orange-500 text-white text-xl font-semibold rounded-2xl hover:bg-orange-600 transition-all duration-300 transform hover:scale-105 shadow-lg mb-8"
            >
              Start Now
            </button>

            {/* Quick Start Options */}
            <div className="text-gray-600 mb-4">Not sure where to start? Try one of these:</div>
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              <span className="px-4 py-2 bg-white rounded-full border border-gray-200 text-gray-700 hover:border-orange-300 cursor-pointer transition-all">
                Property Acquisition
              </span>
              <span className="px-4 py-2 bg-white rounded-full border border-gray-200 text-gray-700 hover:border-orange-300 cursor-pointer transition-all">
                Lease Management
              </span>
              <span className="px-4 py-2 bg-white rounded-full border border-gray-200 text-gray-700 hover:border-orange-300 cursor-pointer transition-all">
                CapEx Planning
              </span>
              <span className="px-4 py-2 bg-white rounded-full border border-gray-200 text-gray-700 hover:border-orange-300 cursor-pointer transition-all">
                Asset Disposal
              </span>
              <span className="px-4 py-2 bg-white rounded-full border border-gray-200 text-gray-700 hover:border-orange-300 cursor-pointer transition-all">
                Portfolio Dashboard
              </span>
            </div>

            {/* Trust Indicator */}
            <div className="text-gray-500 text-sm">
              Trusted by 100+ real estate professionals
            </div>
          </div>

          {/* Background Elements */}
          <div className="absolute top-20 left-20 w-32 h-32 bg-orange-200 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-blue-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-10 w-16 h-16 bg-orange-300 rounded-full opacity-30 animate-bounce"></div>
        </div>

        {/* Main Value Proposition - Base44 Style */}
        <div className="bg-white py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                Consider yourself <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-blue-600">limitless.</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                If you can describe your real estate process, you can automate it.
              </p>
            </div>

            {/* Three Step Process */}
            <div className="grid md:grid-cols-3 gap-12 mb-20">
              {/* Step 1 */}
              <div className="text-center">
                <div className="relative bg-gradient-to-br from-orange-50 to-blue-50 rounded-3xl p-8 mb-8 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-blue-100 opacity-50"></div>
                  <div className="relative">
                    <div className="w-full h-64 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-4">
                      <div className="text-center">
                        <div className="text-4xl mb-4">💬</div>
                        <div className="bg-orange-100 rounded-lg p-4 max-w-xs">
                          <p className="text-sm text-gray-700">"Create an acquisition workflow for commercial properties with due diligence, financing, and legal review stages"</p>
                        </div>
                        <div className="mt-4">
                          <div className="bg-orange-500 text-white px-4 py-2 rounded-full inline-block">
                            → Generate
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Create at the speed of thought</h3>
                <p className="text-gray-600 mb-6">
                  Tell Turnkey your real estate process, and watch it transform into a working workflow—complete with all stages, tasks, and automations.
                </p>
                <button 
                  onClick={handleLogin}
                  className="text-orange-500 font-semibold hover:text-orange-600"
                >
                  Start building →
                </button>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="relative bg-gradient-to-br from-blue-50 to-orange-50 rounded-3xl p-8 mb-8 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-orange-100 opacity-50"></div>
                  <div className="relative">
                    <div className="w-full h-64 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-4">
                      <div className="text-center space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                          <span>Property inspection</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                          <span>Financial analysis</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                          <span>Loan application</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                          <span>Legal review</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-4">Building workflow...</div>
                      </div>
                    </div>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">The system's built automatically</h3>
                <p className="text-gray-600 mb-6">
                  Everything your process needs to function, like task assignments, deadline tracking, or document generation is taken care of behind the scenes.
                </p>
                <button 
                  onClick={handleLogin}
                  className="text-orange-500 font-semibold hover:text-orange-600"
                >
                  Start building →
                </button>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="relative bg-gradient-to-br from-orange-50 to-blue-50 rounded-3xl p-8 mb-8 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-blue-100 opacity-50"></div>
                  <div className="relative">
                    <div className="w-full h-64 bg-white rounded-2xl shadow-lg p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold">Property Acquisition</h4>
                        <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">75% Complete</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span>Due Diligence</span>
                          <span className="text-green-600">✓</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Financing</span>
                          <span className="text-blue-600">In Progress</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Legal Review</span>
                          <span className="text-gray-400">Pending</span>
                        </div>
                      </div>
                      <button className="w-full mt-4 bg-orange-500 text-white py-2 rounded-lg text-sm">
                        + Add Task
                      </button>
                    </div>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to use, instantly.</h3>
                <p className="text-gray-600 mb-6">
                  Your workflow is live and ready. Track progress, assign tasks, and manage your entire real estate operation from day one.
                </p>
                <button 
                  onClick={handleLogin}
                  className="text-orange-500 font-semibold hover:text-orange-600"
                >
                  Start building →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials Section - Base44 Style */}
        <div className="bg-gradient-to-br from-blue-50 to-orange-50 py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                "Okay, <span className="text-orange-500">@Turnkey</span> has blown my mind."
              </h2>
              <p className="text-xl text-gray-600">
                And other great things our real estate professionals say about us.
              </p>
            </div>

            {/* Scrolling Testimonials */}
            <div className="grid md:grid-cols-3 gap-6 mb-16">
              <div className="bg-white p-6 rounded-2xl shadow-lg">
                <p className="text-gray-700 mb-4">"Turnkey looks perfect for property managers who want to automate without learning complex software."</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-orange-600 font-bold">SM</span>
                  </div>
                  <div>
                    <div className="font-semibold">Sarah Martinez</div>
                    <div className="text-gray-500 text-sm">Property Manager</div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg">
                <p className="text-gray-700 mb-4">"You can now manage a full real estate portfolio without hiring any developers. This tool is incredible."</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-bold">MJ</span>
                  </div>
                  <div>
                    <div className="font-semibold">Michael Johnson</div>
                    <div className="text-gray-500 text-sm">Real Estate Investor</div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg">
                <p className="text-gray-700 mb-4">"Okay, Turnkey has blown my mind 🤯. No iterations, no changes, just described my process and it worked perfectly."</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600 font-bold">AC</span>
                  </div>
                  <div>
                    <div className="font-semibold">Amanda Chen</div>
                    <div className="text-gray-500 text-sm">Portfolio Director</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button 
                onClick={handleLogin}
                className="px-8 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-all duration-300"
              >
                Start building →
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Section - Base44 Style */}
        <div className="bg-white py-20 px-4" id="pricing">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Pricing plans for every portfolio
              </h2>
              <p className="text-xl text-gray-600">
                Scale as you go with plans designed to match your growth.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Free Plan */}
              <div className="bg-gray-50 p-8 rounded-2xl">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Start for free.</h3>
                <p className="text-gray-600 mb-6">Get access to:</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>All core workflow features</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Up to 5 properties</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Basic task automation</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Email notifications</span>
                  </li>
                </ul>
                <button 
                  onClick={handleLogin}
                  className="w-full py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-all duration-300"
                >
                  Start building
                </button>
              </div>

              {/* Paid Plan */}
              <div className="bg-gradient-to-br from-orange-50 to-blue-50 p-8 rounded-2xl border-2 border-orange-200 relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-medium">Most Popular</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Paid plans from</h3>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-bold text-gray-900">$49</span>
                  <span className="text-gray-600 ml-2">/mo</span>
                </div>
                <p className="text-gray-600 mb-6">Upgrade as you go for unlimited properties, advanced features, and priority support.</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Unlimited properties</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Advanced AI automation</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Custom integrations</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Priority support</span>
                  </li>
                </ul>
                <button 
                  onClick={handleLogin}
                  className="w-full py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-all duration-300"
                >
                  See all plans →
                </button>
              </div>
            </div>
          </div>
            </div>

        {/* Final CTA Section */}
        <div className="bg-gray-900 py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              So, what are we building?
            </h2>
            <button 
              onClick={handleLogin}
              className="px-12 py-4 bg-orange-500 text-white text-xl font-semibold rounded-2xl hover:bg-orange-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Start building
            </button>
            <p className="text-gray-400 mt-6">
              Turnkey is the AI-powered platform that lets real estate professionals build fully functioning workflows in minutes. Using nothing but natural language, Turnkey enables anyone to turn their processes into automated systems that are ready to use, no integrations required.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Project Builder App (original functionality)
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Turnkey...</p>
        </div>
      </div>
    );
  }

  return (
    <TurnkeyApp
      properties={properties}
      setProperties={setProperties}
      templates={templates}
      setTemplates={setTemplates}
      workflowInstances={workflowInstances}
      setWorkflowInstances={setWorkflowInstances}
      selectedProperty={selectedProperty}
      setSelectedProperty={setSelectedProperty}
      selectedView={selectedView}
      setSelectedView={setSelectedView}
      selectedWorkflow={selectedWorkflow}
      setSelectedWorkflow={setSelectedWorkflow}
      showOnboarding={showOnboarding}
      setShowOnboarding={setShowOnboarding}
    />
  );
}

// Wrapper component with ModuleProvider
const AppWithModules: React.FC = () => {
  return (
    <ModuleProvider>
      <App />
    </ModuleProvider>
  );
};

export default AppWithModules;