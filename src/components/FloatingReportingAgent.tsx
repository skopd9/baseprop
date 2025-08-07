import React, { useState } from 'react';
import { ReportingAgent } from './ReportingAgent';
import { Property, WorkflowInstance } from '../types';

interface FloatingReportingAgentProps {
  properties: Property[];
  workflowInstances: WorkflowInstance[];
}

export const FloatingReportingAgent: React.FC<FloatingReportingAgentProps> = ({
  properties,
  workflowInstances
}) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          className="bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 transition-colors"
          title="Portfolio Reporting Assistant"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <ReportingAgent
      properties={properties}
      workflowInstances={workflowInstances}
      onClose={() => setIsOpen(false)}
    />
  );
};