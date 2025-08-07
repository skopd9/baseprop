import React, { useState } from 'react';
import { 
  ChartBarIcon, 
  XMarkIcon, 
  PaperAirplaneIcon
} from '@heroicons/react/24/outline';
import { Property, WorkflowInstance } from '../types';

interface ReportingAgentProps {
  properties: Property[];
  workflowInstances: WorkflowInstance[];
  onClose: () => void;
}

export const ReportingAgent: React.FC<ReportingAgentProps> = ({
  properties,
  workflowInstances,
  onClose
}) => {
  const [chatInput, setChatInput] = useState('');
  const [chatHistory, setChatHistory] = useState<Array<{role: 'user' | 'assistant', message: string}>>([
    { 
      role: 'assistant', 
      message: 'Hi! I\'m your Portfolio Reporting Assistant. I can help you generate reports about your real estate portfolio. You can ask me to:\n\n• Generate portfolio performance reports\n• Create property valuation summaries\n• Show workflow completion statistics\n• Analyze market trends\n• Export data for external analysis\n\nWhat kind of report would you like me to create?' 
    }
  ]);
  const [isProcessing, setIsProcessing] = useState(false);

  const processUserMessage = async (message: string) => {
    setIsProcessing(true);
    setChatHistory(prev => [...prev, { role: 'user', message }]);
    
    try {
      const lowerMessage = message.toLowerCase();
      let responseMessage = '';

      // Portfolio performance reports
      if (lowerMessage.includes('portfolio performance') || lowerMessage.includes('performance report')) {
        const totalValue = properties.reduce((sum, prop) => sum + (prop.estimated_value || 0), 0);
        const avgValue = totalValue / properties.length;
        const completedWorkflows = workflowInstances.filter(w => w.status === 'completed').length;
        
        responseMessage = `📊 **Portfolio Performance Report**\n\n• Total Properties: ${properties.length}\n• Total Portfolio Value: $${totalValue.toLocaleString()}\n• Average Property Value: $${avgValue.toLocaleString()}\n• Active Workflows: ${workflowInstances.filter(w => w.status !== 'completed').length}\n• Completed Workflows: ${completedWorkflows}\n• Completion Rate: ${((completedWorkflows / workflowInstances.length) * 100).toFixed(1)}%`;
      }
      // Property valuation summaries
      else if (lowerMessage.includes('valuation') || lowerMessage.includes('property values')) {
        const valuations = properties.map(p => ({
          name: p.name,
          value: p.estimated_value || 0,
          type: p.property_type || 'Unknown'
        })).sort((a, b) => b.value - a.value);
        
        responseMessage = `🏠 **Property Valuation Summary**\n\n${valuations.map((prop, i) => 
          `${i + 1}. ${prop.name} - $${prop.value.toLocaleString()} (${prop.type})`
        ).join('\n')}\n\nTotal Portfolio Value: $${valuations.reduce((sum, p) => sum + p.value, 0).toLocaleString()}`;
      }
      // Workflow statistics
      else if (lowerMessage.includes('workflow') || lowerMessage.includes('statistics')) {
        const statusCounts = workflowInstances.reduce((acc, w) => {
          acc[w.status] = (acc[w.status] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        responseMessage = `⚙️ **Workflow Statistics**\n\n${Object.entries(statusCounts).map(([status, count]) => 
          `• ${status.charAt(0).toUpperCase() + status.slice(1)}: ${count}`
        ).join('\n')}\n\nTotal Workflows: ${workflowInstances.length}`;
      }
      // Market analysis
      else if (lowerMessage.includes('market') || lowerMessage.includes('trends')) {
        const propertyTypes = properties.reduce((acc, p) => {
          const type = p.property_type || 'Unknown';
          acc[type] = (acc[type] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
        
        responseMessage = `📈 **Market Analysis**\n\n**Property Type Distribution:**\n${Object.entries(propertyTypes).map(([type, count]) => 
          `• ${type}: ${count} properties (${((count / properties.length) * 100).toFixed(1)}%)`
        ).join('\n')}\n\n**Geographic Distribution:**\n${properties.map(p => p.location?.city || 'Unknown').filter((city, i, arr) => arr.indexOf(city) === i).join(', ')}`;
      }
      // Export data
      else if (lowerMessage.includes('export') || lowerMessage.includes('download')) {
        responseMessage = `📥 **Data Export Options**\n\nI can help you export:\n• Portfolio summary (CSV)\n• Property details (Excel)\n• Workflow status report (PDF)\n• Valuation data (JSON)\n\nWhich format would you prefer?`;
      }
      // Help
      else if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
        responseMessage = `🤖 **Reporting Assistant Help**\n\nI can generate these types of reports:\n\n• **Portfolio Performance** - Overall portfolio metrics and KPIs\n• **Property Valuations** - Individual property values and summaries\n• **Workflow Statistics** - Workflow completion rates and status\n• **Market Analysis** - Property type and geographic distribution\n• **Data Export** - Download data in various formats\n\nJust ask me for any of these reports!`;
      }
      else {
        responseMessage = `I understand you're asking about "${message}". Let me help you with that. Could you be more specific about what kind of report you'd like? For example:\n\n• "Show me portfolio performance"\n• "Generate property valuation summary"\n• "What are the workflow statistics?"\n• "Analyze market trends"\n• "Help me export data"`;
      }

      setChatHistory(prev => [...prev, { role: 'assistant', message: responseMessage }]);
    } catch (error) {
      setChatHistory(prev => [...prev, { role: 'assistant', message: 'Sorry, I encountered an error while processing your request. Please try again.' }]);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendMessage = () => {
    if (!chatInput.trim() || isProcessing) return;
    
    const message = chatInput.trim();
    setChatInput('');
    processUserMessage(message);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
      <div className="absolute right-0 top-0 h-full w-96 bg-white shadow-xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <ChartBarIcon className="w-6 h-6 text-green-600" />
            <h2 className="text-lg font-semibold text-gray-900">Portfolio Reporting</h2>
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
                    ? 'bg-green-600 text-white'
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
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                  <span className="text-sm">Generating report...</span>
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
              placeholder="Ask me to generate a report..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
              disabled={isProcessing}
            />
            <button
              onClick={handleSendMessage}
              disabled={!chatInput.trim() || isProcessing}
              className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PaperAirplaneIcon className="w-4 h-4" />
            </button>
          </div>
          
          {/* Quick suggestions */}
          <div className="mt-2 flex flex-wrap gap-1">
            {[
              'Portfolio Performance',
              'Property Valuations',
              'Workflow Statistics',
              'Market Analysis',
              'Export Data'
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setChatInput(suggestion);
                  processUserMessage(suggestion);
                }}
                disabled={isProcessing}
                className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 disabled:opacity-50"
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
