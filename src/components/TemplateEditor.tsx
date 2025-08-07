import React, { useState } from 'react';
import { 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  CheckIcon, 
  XMarkIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { WorkflowTemplate, WorkflowTemplateField, WorkflowTemplateWorkstream } from '../types';

interface TemplateEditorProps {
  template: WorkflowTemplate;
  onTemplateUpdate: (updatedTemplate: WorkflowTemplate) => void;
}

export const TemplateEditor: React.FC<TemplateEditorProps> = ({
  template,
  onTemplateUpdate
}) => {
  const [editingField, setEditingField] = useState<{workstreamIndex: number, fieldIndex: number} | null>(null);
  const [editingWorkstream, setEditingWorkstream] = useState<number | null>(null);
  const [newField, setNewField] = useState<Partial<WorkflowTemplateField>>({});
  const [showNewFieldForm, setShowNewFieldForm] = useState<number | null>(null);
  const [tempField, setTempField] = useState<WorkflowTemplateField | null>(null);

  const fieldTypes = ['text', 'number', 'select', 'textarea', 'file', 'formula'];
  const selectOptions = ['High', 'Medium', 'Low', 'Yes', 'No', 'Pending', 'Approved', 'Rejected'];

  const handleFieldUpdate = (workstreamIndex: number, fieldIndex: number, updates: Partial<WorkflowTemplateField>) => {
    const updatedTemplate = { ...template };
    const workstream = updatedTemplate.workstreams![workstreamIndex];
    const field = workstream.fields![fieldIndex];
    
    Object.assign(field, updates);
    
    onTemplateUpdate(updatedTemplate);
    setEditingField(null);
  };

  const handleAddField = (workstreamIndex: number) => {
    if (!newField.label || !newField.type) return;

    const updatedTemplate = { ...template };
    const workstream = updatedTemplate.workstreams![workstreamIndex];
    
    if (!workstream.fields) workstream.fields = [];
    
    const field: WorkflowTemplateField = {
      id: newField.label.toLowerCase().replace(/\s+/g, '_'),
      label: newField.label,
      type: newField.type as any,
      options: newField.type === 'select' ? ['Option 1', 'Option 2'] : undefined,
      formula: newField.type === 'formula' ? newField.formula || '' : undefined
    };
    
    workstream.fields.push(field);
    onTemplateUpdate(updatedTemplate);
    
    setNewField({});
    setShowNewFieldForm(null);
  };

  const handleRemoveField = (workstreamIndex: number, fieldIndex: number) => {
    const updatedTemplate = { ...template };
    const workstream = updatedTemplate.workstreams![workstreamIndex];
    workstream.fields!.splice(fieldIndex, 1);
    onTemplateUpdate(updatedTemplate);
  };

  const getAvailableFields = (currentWorkstreamIndex: number) => {
    const allFields: Array<{workstreamName: string, field: WorkflowTemplateField}> = [];
    
    template.workstreams?.forEach((workstream, wsIndex) => {
      if (wsIndex !== currentWorkstreamIndex && workstream.fields) {
        workstream.fields.forEach(field => {
          allFields.push({
            workstreamName: workstream.name,
            field: { ...field, id: `${workstream.key}.${field.id}` }
          });
        });
      }
    });
    
    return allFields;
  };

  const renderFieldEditor = (workstreamIndex: number, fieldIndex: number, field: WorkflowTemplateField) => {
    if (!tempField) {
      setTempField(field);
      return null;
    }

    return (
      <div className="bg-blue-50 p-3 rounded border border-blue-200">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input
            type="text"
            value={tempField.label}
            onChange={(e) => setTempField({...tempField, label: e.target.value})}
            placeholder="Field Label"
            className="px-2 py-1 text-xs border rounded"
          />
          <select
            value={tempField.type}
            onChange={(e) => setTempField({...tempField, type: e.target.value as any})}
            className="px-2 py-1 text-xs border rounded"
          >
            {fieldTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        
        {tempField.type === 'select' && (
          <div className="mb-2">
            <input
              type="text"
              value={tempField.options?.join(', ') || ''}
              onChange={(e) => setTempField({
                ...tempField, 
                options: e.target.value.split(',').map(s => s.trim()).filter(s => s)
              })}
              placeholder="Options (comma separated)"
              className="w-full px-2 py-1 text-xs border rounded"
            />
          </div>
        )}
        
        {tempField.type === 'formula' && (
          <div className="mb-2">
            <textarea
              value={tempField.formula || ''}
              onChange={(e) => setTempField({...tempField, formula: e.target.value})}
              placeholder="Enter formula (e.g., field1 + field2)"
              className="w-full px-2 py-1 text-xs border rounded"
              rows={2}
            />
            <div className="text-xs text-gray-500 mt-1">
              Available fields: {getAvailableFields(workstreamIndex).map(f => f.field.id).join(', ')}
            </div>
          </div>
        )}
        
        <div className="flex space-x-1">
          <button
            onClick={() => {
              handleFieldUpdate(workstreamIndex, fieldIndex, tempField);
              setTempField(null);
            }}
            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
          >
            <CheckIcon className="w-3 h-3" />
          </button>
          <button
            onClick={() => {
              setEditingField(null);
              setTempField(null);
            }}
            className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            <XMarkIcon className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  };

  const renderNewFieldForm = (workstreamIndex: number) => {
    return (
      <div className="bg-green-50 p-3 rounded border border-green-200">
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input
            type="text"
            value={newField.label || ''}
            onChange={(e) => setNewField({...newField, label: e.target.value})}
            placeholder="Field Label"
            className="px-2 py-1 text-xs border rounded"
          />
          <select
            value={newField.type || 'text'}
            onChange={(e) => setNewField({...newField, type: e.target.value as any})}
            className="px-2 py-1 text-xs border rounded"
          >
            {fieldTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
        
        {newField.type === 'select' && (
          <div className="mb-2">
            <input
              type="text"
              value={newField.options?.join(', ') || ''}
              onChange={(e) => setNewField({
                ...newField, 
                options: e.target.value.split(',').map(s => s.trim()).filter(s => s)
              })}
              placeholder="Options (comma separated)"
              className="w-full px-2 py-1 text-xs border rounded"
            />
          </div>
        )}
        
        {newField.type === 'formula' && (
          <div className="mb-2">
            <textarea
              value={newField.formula || ''}
              onChange={(e) => setNewField({...newField, formula: e.target.value})}
              placeholder="Enter formula (e.g., field1 + field2)"
              className="w-full px-2 py-1 text-xs border rounded"
              rows={2}
            />
            <div className="text-xs text-gray-500 mt-1">
              Available fields: {getAvailableFields(workstreamIndex).map(f => f.field.id).join(', ')}
            </div>
          </div>
        )}
        
        <div className="flex space-x-1">
          <button
            onClick={() => handleAddField(workstreamIndex)}
            className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
          >
            Add Field
          </button>
          <button
            onClick={() => {
              setShowNewFieldForm(null);
              setNewField({});
            }}
            className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {template.workstreams?.map((workstream, workstreamIndex) => (
        <div key={workstreamIndex} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-medium text-gray-900">{workstream.name}</h3>
            <button
              onClick={() => setShowNewFieldForm(showNewFieldForm === workstreamIndex ? null : workstreamIndex)}
              className="flex items-center space-x-1 px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              <PlusIcon className="w-3 h-3" />
              <span>Add Field</span>
            </button>
          </div>
          
          {showNewFieldForm === workstreamIndex && renderNewFieldForm(workstreamIndex)}
          
          <div className="grid grid-cols-2 gap-2">
            {workstream.fields?.map((field, fieldIndex) => (
              <div key={fieldIndex} className="bg-white p-2 rounded border">
                {editingField?.workstreamIndex === workstreamIndex && editingField?.fieldIndex === fieldIndex ? (
                  renderFieldEditor(workstreamIndex, fieldIndex, field)
                ) : (
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900 text-xs">{field.label}</span>
                      {field.type === 'formula' && (
                        <span className="inline-flex items-center px-1 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                          ƒ
                        </span>
                      )}
                      <span className="text-gray-500 text-xs">({field.type})</span>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => {
                          setEditingField({workstreamIndex, fieldIndex});
                          setTempField(field);
                        }}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Edit field"
                      >
                        <PencilIcon className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleRemoveField(workstreamIndex, fieldIndex)}
                        className="p-1 text-gray-400 hover:text-red-600"
                        title="Remove field"
                      >
                        <TrashIcon className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}
                
                {field.type === 'formula' && field.formula && (
                  <div className="text-purple-600 font-mono text-xs mt-1 truncate" title={field.formula}>
                    = {field.formula}
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
        </div>
      ))}
    </div>
  );
};
