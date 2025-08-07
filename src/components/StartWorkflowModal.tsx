import React, { useEffect, useState } from 'react';
import { Dialog } from '@headlessui/react';
import { supabase } from '../lib/supabase';
import { WorkflowTemplate, Property } from '../types';

interface StartWorkflowModalProps {
  open: boolean;
  onClose: () => void;
  userId: string;
  properties: Property[];
  onCreated?: (instanceId: string) => void;
}

export const StartWorkflowModal: React.FC<StartWorkflowModalProps> = ({ open, onClose, userId, properties, onCreated }) => {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [instanceName, setInstanceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      supabase.from('workflow_templates').select('*').then(({ data, error }) => {
        if (error) setError('Failed to load templates');
        else setTemplates(data || []);
      });
      setSelectedTemplate(null);
      setSelectedProperty(null);
      setInstanceName('');
      setError(null);
    }
  }, [open]);

  const handleCreate = async () => {
    if (!selectedTemplate || !selectedProperty || !instanceName.trim()) {
      setError('Please select a template, property, and enter a name.');
      return;
    }
    setLoading(true);
    setError(null);
    // Create workflow instance
    const { data: instanceData, error: instanceError } = await supabase.from('workflow_instances').insert([
      {
        user_id: '12e905ef-640e-4fdb-a5c5-71a5ab676c84', // Test user ID
        template_id: selectedTemplate.id,
        property_id: selectedProperty.id,
        name: instanceName,
        status: 'not_started',
        completion_percentage: 0,
      }
    ]).select('id').single();
    
    if (instanceError) {
      setLoading(false);
      console.error('Supabase error:', instanceError);
      setError(`Failed to create workflow instance: ${instanceError.message}`);
      return;
    }

    // Create workstreams from template
    if (selectedTemplate.workstreams && instanceData?.id) {
      const workstreamsToInsert = selectedTemplate.workstreams.map((ws, index) => ({
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
        console.error('Error creating workstreams:', workstreamsError);
        setError(`Failed to create workstreams: ${workstreamsError.message}`);
        return;
      }
    }

    setLoading(false);
    if (onCreated && instanceData?.id) onCreated(instanceData.id);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} className="fixed z-40 inset-0 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4">
        <div className="fixed inset-0 bg-black bg-opacity-30" aria-hidden="true" />
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-lg mx-auto z-50 p-6">
          <Dialog.Title className="text-lg font-bold mb-4">Start New Workflow</Dialog.Title>
          
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Select a Property</label>
            <div className="grid grid-cols-1 gap-2 max-h-32 overflow-y-auto">
              {properties.map((property) => (
                <button
                  key={property.id}
                  className={`w-full text-left px-3 py-2 rounded border ${selectedProperty?.id === property.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  onClick={() => setSelectedProperty(property)}
                  type="button"
                >
                  <div className="font-medium">{property.name}</div>
                  <div className="text-xs text-gray-500">{property.address}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Select a Template</label>
            <div className="grid grid-cols-1 gap-2 max-h-40 overflow-y-auto">
              {templates.map((tpl) => (
                <button
                  key={tpl.id}
                  className={`w-full text-left px-3 py-2 rounded border ${selectedTemplate?.id === tpl.id ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 hover:bg-gray-50'}`}
                  onClick={() => setSelectedTemplate(tpl)}
                  type="button"
                >
                  <div className="font-medium">{tpl.name}</div>
                  <div className="text-xs text-gray-500">{tpl.description || tpl.key}</div>
                </button>
              ))}
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Workflow Name</label>
            <input
              type="text"
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
              placeholder="Enter a name for this workflow instance"
              value={instanceName}
              onChange={e => setInstanceName(e.target.value)}
              disabled={loading}
            />
          </div>
          {error && <div className="text-red-500 text-sm mb-2">{error}</div>}
          <div className="flex justify-end space-x-2">
            <button
              className="px-4 py-2 rounded bg-gray-100 text-gray-700 hover:bg-gray-200"
              onClick={onClose}
              type="button"
              disabled={loading}
            >Cancel</button>
            <button
              className="px-4 py-2 rounded bg-indigo-600 text-white font-semibold hover:bg-indigo-700"
              onClick={handleCreate}
              type="button"
              disabled={loading || !selectedTemplate || !selectedProperty || !instanceName.trim()}
            >{loading ? 'Creating...' : 'Create'}</button>
          </div>
        </div>
      </div>
    </Dialog>
  );
}; 