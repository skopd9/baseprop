import React, { useState, useRef, useEffect } from 'react';
import { Property, WorkflowInstance, ChatMessage } from '../types';
import { 
  PaperAirplaneIcon,
  SparklesIcon,
  UserIcon,
  ChatBubbleLeftRightIcon
} from '@heroicons/react/24/outline';
import { aiService } from '../lib/ai';

interface ChatAssistantTabProps {
  property: Property;
  workflowInstance: WorkflowInstance | null;
  onWorkflowUpdate: (updates: any) => void;
}

export const ChatAssistantTab: React.FC<ChatAssistantTabProps> = ({
  property,
  workflowInstance,
  onWorkflowUpdate,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add welcome message on first load
  useEffect(() => {
    if (messages.length === 0 && workflowInstance) {
      const welcomeMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: `Hello! I'm your turnkey AI assistant. I can help you manage the ${workflowInstance.name} workflow for ${property.name}. 

You can ask me to:
• Add or remove workstreams
• Modify workflow stages
• Get progress summaries
• Add new stages to existing workstreams

What would you like to do today?`,
        timestamp: new Date().toISOString(),
        workflow_instance_id: workflowInstance.id
      };
      setMessages([welcomeMessage]);
    }
  }, [workflowInstance, property, messages.length]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !workflowInstance) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString(),
      workflow_instance_id: workflowInstance.id
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      // Process the message with AI
      const aiUpdate = await aiService.processWorkflowCommand(
        inputMessage,
        workflowInstance,
        property
      );

      // Add AI response
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'll help you with that! Here's what I'm going to do:

**Action:** ${aiUpdate.action}
**Target:** ${aiUpdate.target}
**Reasoning:** ${aiUpdate.reasoning}

Would you like me to apply these changes to your workflow?`,
        timestamp: new Date().toISOString(),
        workflow_instance_id: workflowInstance.id
      };

      setMessages(prev => [...prev, aiMessage]);

      // Apply the changes
      onWorkflowUpdate(aiUpdate);

    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `I'm sorry, I encountered an error while processing your request. Please try rephrasing your message or contact support if the issue persists.`,
        timestamp: new Date().toISOString(),
        workflow_instance_id: workflowInstance.id
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!workflowInstance) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <ChatBubbleLeftRightIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No workflow instance</h3>
          <p className="mt-1 text-sm text-gray-500">
            Select a property with an active workflow to chat with the AI assistant.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <SparklesIcon className="w-5 h-5 text-indigo-600" />
          <h3 className="text-lg font-medium text-gray-900">AI Assistant</h3>
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Ask me to modify workflows, add workstreams, or get progress updates
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-100 text-gray-900'
              }`}
            >
              <div className="flex items-start space-x-2">
                {message.role === 'assistant' && (
                  <SparklesIcon className="w-4 h-4 text-indigo-600 flex-shrink-0 mt-0.5" />
                )}
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
              </div>
            </div>
          </div>
        ))}
        
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-900 max-w-xs lg:max-w-md px-4 py-2 rounded-lg">
              <div className="flex items-center space-x-2">
                <SparklesIcon className="w-4 h-4 text-indigo-600" />
                <div className="text-sm">Thinking...</div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200">
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me to modify workflows, add workstreams..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm bg-white text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <PaperAirplaneIcon className="w-4 h-4" />
          </button>
        </div>
        
        <div className="mt-2 text-xs text-gray-500">
          Press Enter to send, Shift+Enter for new line
        </div>
      </div>
    </div>
  );
}; 