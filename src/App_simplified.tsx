import React, { useState } from 'react';
import { ModuleProvider } from './contexts/ModuleContext';
import { Property, WorkflowTemplate, WorkflowInstance } from './types';
import { mockProperties } from './lib/mockData';
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