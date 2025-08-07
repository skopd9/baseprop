import React from 'react';
import { WorkflowInstance, Workstream, WorkflowStage } from '../types';
import { 
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PlayIcon,
  PauseIcon,
  PlusIcon
} from '@heroicons/react/24/outline';

interface WorkstreamsTabProps {
  workflowInstance: WorkflowInstance | null;
  onWorkflowUpdate: (updates: any) => void;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
    case 'active':
      return <PlayIcon className="w-5 h-5 text-blue-500" />;
    case 'paused':
      return <PauseIcon className="w-5 h-5 text-yellow-500" />;
    default:
      return <ClockIcon className="w-5 h-5 text-gray-400" />;
  }
};

const getStageStatusIcon = (status: string) => {
  switch (status) {
    case 'completed':
      return <CheckCircleIcon className="w-4 h-4 text-green-500" />;
    case 'in_progress':
      return <PlayIcon className="w-4 h-4 text-blue-500" />;
    case 'blocked':
      return <ExclamationTriangleIcon className="w-4 h-4 text-red-500" />;
    default:
      return <ClockIcon className="w-4 h-4 text-gray-400" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed':
      return 'bg-green-100 text-green-800';
    case 'active':
      return 'bg-blue-100 text-blue-800';
    case 'paused':
      return 'bg-yellow-100 text-yellow-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export const WorkstreamsTab: React.FC<WorkstreamsTabProps> = ({
  workflowInstance,
  onWorkflowUpdate,
}) => {
  if (!workflowInstance) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No workflow instance</h3>
          <p className="mt-1 text-sm text-gray-500">
            Select a property with an active workflow to view workstreams.
          </p>
        </div>
      </div>
    );
  }

  const workstreams = workflowInstance.workstreams || [];
  const completedCount = workstreams.filter(ws => ws.status === 'completed').length;
  const totalCount = workstreams.length;
  const progressPercentage = workflowInstance.completion_percentage || 0;

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-medium text-gray-900">{workflowInstance.name}</h3>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(workflowInstance.status)}`}>
            {workflowInstance.status}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progress</span>
            <span>{completedCount} of {totalCount} workstreams</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        </div>
      </div>

      {/* Workstreams List */}
      <div className="flex-1 overflow-y-auto p-4">
        {workstreams.length === 0 ? (
          <div className="text-center py-8">
            <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No workstreams yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              This workflow instance doesn't have any workstreams yet.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {workstreams.map((workstream) => (
            <div key={workstream.id} className="bg-gray-50 rounded-lg p-4">
              {/* Workstream Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  {getStatusIcon(workstream.status)}
                  <div>
                    <h4 className="font-medium text-gray-900">{workstream.name}</h4>
                    <p className="text-sm text-gray-500">{workstream.description}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium capitalize ${getStatusColor(workstream.status)}`}>
                    {workstream.status}
                  </span>
                  <span className="text-xs text-gray-500">
                    Order: {workstream.order_index}
                  </span>
                </div>
              </div>

                                            {/* Fields */}
              <div className="space-y-2">
                {workstream.fields && workstream.fields.length > 0 ? (
                  <div className="text-xs text-gray-500">
                    {workstream.fields.length} field{workstream.fields.length !== 1 ? 's' : ''} available
                  </div>
                ) : (
                  <div className="text-xs text-gray-400 italic">
                    No fields defined
                  </div>
                )}
                {workstream.can_start && (
                  <button 
                    className="w-full mt-2 px-3 py-2 bg-indigo-600 text-white text-sm rounded hover:bg-indigo-700"
                    onClick={() => onWorkflowUpdate({ action: 'start_workstream', target: workstream.id })}
                  >
                    Start This Workstream
                  </button>
                )}
              </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Workstream Button */}
        <button
          onClick={() => onWorkflowUpdate({ action: 'add_workstream', target: 'new' })}
          className="mt-4 w-full flex items-center justify-center px-4 py-2 border-2 border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
        >
          <PlusIcon className="w-4 h-4 mr-2" />
          Add Workstream
        </button>
      </div>
    </div>
  );
}; 