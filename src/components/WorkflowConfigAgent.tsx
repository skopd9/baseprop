import React, { useState } from 'react';
import { 
  ChatBubbleLeftRightIcon, 
  XMarkIcon, 
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import { WorkflowTemplate, WorkflowTemplateWorkstream } from '../types';

interface WorkflowConfigAgentProps {
  templates: WorkflowTemplate[];
  onTemplateUpdate: (updatedTemplate: WorkflowTemplate) => void;
  onClose: () => void;
}

export const WorkflowConfigAgent: React.FC<WorkflowConfigAgentProps> = ({
  templates,
  onTemplateUpdate,
  onClose
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', message: string}>>([
    { role: 'assistant', message: 'Hi! I can help you modify the Group Valuations workflow template. You can ask me to:\n\n• Add new fields to workstreams\n• Remove existing fields\n• Modify field types or options\n• Add new workstreams\n• Change field labels\n\nWhat would you like to change?' }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processUserMessage = async (message: string) => {
    setIsProcessing(true);
    setChatHistory(prev => [...prev, { role: 'user', message }]);
    
    try {
      // Find the Group Valuations template
      const valuationsTemplate = templates.find(t => t.key === 'valuations');
      if (!valuationsTemplate) {
        setChatHistory(prev => [...prev, { role: 'assistant', message: 'Sorry, I cannot find the Group Valuations template to modify.' }]);
        return;
      }

      // Simple text processing for common requests
      const lowerMessage = message.toLowerCase();
      let updatedTemplate = { ...valuationsTemplate };
      let responseMessage = '';

      // Add field requests
      if (lowerMessage.includes('add field') || lowerMessage.includes('add a field')) {
        if (lowerMessage.includes('valuer assignment') || lowerMessage.includes('assignment')) {
          const workstreamIndex = 0; // Valuer Assignment is first
          if (!updatedTemplate.workstreams![workstreamIndex].fields) {
            updatedTemplate.workstreams![workstreamIndex].fields = [];
          }
          
          // Extract field details from message
          let fieldName = 'New Field';
          let fieldType = 'text';
          
          if (lowerMessage.includes('email')) {
            fieldName = 'Contact Email';
            fieldType = 'text';
          } else if (lowerMessage.includes('phone')) {
            fieldName = 'Phone Number';
            fieldType = 'text';
          } else if (lowerMessage.includes('date')) {
            fieldName = 'Target Date';
            fieldType = 'text';
          } else if (lowerMessage.includes('priority')) {
            fieldName = 'Priority Level';
            fieldType = 'select';
          }
          
          const newField = {
            id: fieldName.toLowerCase().replace(/\s+/g, '_'),
            label: fieldName,
            type: fieldType as 'text' | 'select',
            options: fieldType === 'select' ? ['High', 'Medium', 'Low'] : undefined
          };
          
          updatedTemplate.workstreams![workstreamIndex].fields!.push(newField);
          responseMessage = `✅ Added "${fieldName}" field to Valuer Assignment workstream!`;
        } else {
          responseMessage = '❓ Which workstream would you like to add a field to? (Valuer Assignment, Field Completion, Review, or Completion)';
        }
      }
      // Remove field requests
      else if (lowerMessage.includes('remove field') || lowerMessage.includes('delete field')) {
        responseMessage = '🔍 Which field would you like to remove? Please specify the field name and workstream.';
      }
      // Add workstream requests
      else if (lowerMessage.includes('add workstream') || lowerMessage.includes('new workstream')) {
        const newWorkstream: WorkflowTemplateWorkstream = {
          key: `custom_workstream_${Date.now()}`,
          name: 'Custom Workstream',
          fields: [
            { id: 'notes', label: 'Notes', type: 'textarea' }
          ]
        };
        
        updatedTemplate.workstreams!.push(newWorkstream);
        responseMessage = '✅ Added new "Custom Workstream" to the template!';
      }
      // Modify field type requests
      else if (lowerMessage.includes('change') && lowerMessage.includes('type')) {
        responseMessage = '🔧 I can help change field types. Which field would you like to modify and what type should it be? (text, select, textarea, number)';
      }
      // Help requests
      else if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
        responseMessage = `I can help you modify the Group Valuations template! Here are some examples:

📝 **Add fields:** "Add an email field to valuer assignment"
🗑️ **Remove fields:** "Remove the notification_sent field"
➕ **Add workstreams:** "Add a new workstream for documentation"
🔧 **Change field types:** "Change valuer_email to select type"
📋 **View structure:** "Show me the current structure"

Just tell me what you'd like to change in plain English!`;
      }
      // View current structure
      else if (lowerMessage.includes('structure') || lowerMessage.includes('show me') || lowerMessage.includes('current')) {
        const workstreamSummary = updatedTemplate.workstreams?.map((ws, i) => 
          `${i + 1}. ${ws.name} (${ws.fields?.length || 0} fields)`
        ).join('\n');
        
        responseMessage = `📋 **Current Group Valuations Structure:**

**Stages:** ${updatedTemplate.stages?.join(' → ')}

**Workstreams:**
${workstreamSummary}

**Total Fields:** ${updatedTemplate.workstreams?.reduce((total, ws) => total + (ws.fields?.length || 0), 0)}`;
      }
      else {
        responseMessage = '🤔 I\'m not sure how to help with that. Try asking me to "add a field", "remove a field", "add a workstream", or ask for "help" to see what I can do!';
      }

      // Update template if changes were made
      if (responseMessage.includes('✅')) {
        onTemplateUpdate(updatedTemplate);
      }

      setChatHistory(prev => [...prev, { role: 'assistant', message: responseMessage }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'assistant', message: 'Sorry, there was an error processing your request. Please try again.' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = () => {
    if (!chatInput.trim() || isProcessing) return;
    
    processUserMessage(chatInput);
    setChatInput('');
  };

  if (!isExpanded) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={() => setIsExpanded(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-lg transition-all duration-200 hover:scale-110"
          title="Template Config Chat"
        >
          <ChatBubbleLeftRightIcon className="w-6 h-6" />
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <ChatBubbleLeftRightIcon className="w-6 h-6 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">Template Config Chat</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {chatHistory.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="text-sm whitespace-pre-wrap">{message.message}</div>
              </div>
            </div>
          ))}
          
          {isProcessing && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-2 rounded-lg">
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                  <span className="text-sm">Processing...</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Input */}
        <div className="border-t border-gray-200 p-4">
          <div className="flex space-x-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              placeholder="Ask me to modify the template..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              disabled={isProcessing}
            />
            <button
              onClick={handleSendMessage}
              disabled={!chatInput.trim() || isProcessing}
              className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </div>
          
          {/* Quick suggestions */}
          <div className="mt-2 flex flex-wrap gap-1">
            {[
              'Show me current structure',
              'Add email field to assignment',
              'Add new workstream',
              'Help'
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setChatInput(suggestion);
                  processUserMessage(suggestion);
                }}
                disabled={isProcessing}
                className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
