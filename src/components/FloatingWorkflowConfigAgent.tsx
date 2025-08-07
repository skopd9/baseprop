import React, { useState } from 'react';
import { WorkflowConfigAgent } from './WorkflowConfigAgent';
import { WorkflowTemplate } from '../types';

interface FloatingWorkflowConfigAgentProps {
  templates: WorkflowTemplate[];
  onTemplateUpdate: (updatedTemplate: WorkflowTemplate) => void;
}

export const FloatingWorkflowConfigAgent: React.FC<FloatingWorkflowConfigAgentProps> = ({
  templates,
  onTemplateUpdate
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:bg-indigo-700 transition-colors"
          title="Configure Workflow Template"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <WorkflowConfigAgent
      templates={templates}
      onTemplateUpdate={onTemplateUpdate}
      onClose={() => setIsOpen(false)}
    />
  );
};
