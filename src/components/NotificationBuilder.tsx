import React, { useState } from 'react';
import { 
  XMarkIcon,
  SparklesIcon,
  PaperAirplaneIcon,
  BellIcon,
  EnvelopeIcon,
  ChatBubbleLeftRightIcon,
  PhoneIcon,
  ClockIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  CurrencyDollarIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

interface NotificationBuilderProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ChatMessage {
  id: string;
  type: 'user' | 'agent';
  content: string;
  timestamp: Date;
  suggestions?: string[];
}

interface NotificationRule {
  id: string;
  name: string;
  trigger: {
    type: 'property_value_change' | 'workflow_stage' | 'date_reminder' | 'custom';
    condition: string;
    threshold?: number;
  };
  delivery: {
    method: 'email' | 'sms' | 'in_app' | 'all';
    recipients: string[];
    template: string;
  };
  isActive: boolean;
}

export const NotificationBuilder: React.FC<NotificationBuilderProps> = ({
  isOpen,
  onClose
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'agent',
      content: "Hi! I'm your notification assistant. I'll help you set up smart notifications for your real estate workflows. What would you like to be notified about?",
      timestamp: new Date(),
      suggestions: [
        "When property values change by more than 10%",
        "When workflows reach certain stages",
        "Daily digest of portfolio performance",
        "Lease expiration reminders"
      ]
    }
  ]);
  
  const [currentMessage, setCurrentMessage] = useState('');
  const [isAgentTyping, setIsAgentTyping] = useState(false);
  const [notificationRules, setNotificationRules] = useState<NotificationRule[]>([]);
  const [currentStep, setCurrentStep] = useState<'chat' | 'configure' | 'preview'>('chat');
  const [currentRule, setCurrentRule] = useState<Partial<NotificationRule> | null>(null);

  const handleSendMessage = async () => {
    if (!currentMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: currentMessage,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentMessage('');
    setIsAgentTyping(true);

    // Simulate agent response
    setTimeout(() => {
      const agentResponse = generateAgentResponse(currentMessage);
      setMessages(prev => [...prev, agentResponse]);
      setIsAgentTyping(false);
    }, 1500);
  };

  const generateAgentResponse = (userInput: string): ChatMessage => {
    const input = userInput.toLowerCase();
    
    if (input.includes('property value') || input.includes('value change')) {
      return {
        id: Date.now().toString(),
        type: 'agent',
        content: "Great! I'll help you set up property value change notifications. What threshold would trigger the notification? For example, should we notify you when values change by 5%, 10%, or a custom amount?",
        timestamp: new Date(),
        suggestions: ["5% change", "10% change", "15% change", "Custom threshold"]
      };
    } else if (input.includes('workflow') || input.includes('stage')) {
      return {
        id: Date.now().toString(),
        type: 'agent',
        content: "Perfect! Workflow stage notifications keep you updated on progress. Which workflow stages are most important to track? I can notify you when workflows start, reach milestones, or complete.",
        timestamp: new Date(),
        suggestions: ["When workflows start", "At key milestones", "When workflows complete", "When workflows are overdue"]
      };
    } else if (input.includes('lease') || input.includes('expir')) {
      return {
        id: Date.now().toString(),
        type: 'agent',
        content: "Smart choice! Lease expiration notifications prevent missed renewals. How far in advance should we notify you? I recommend starting alerts 90 days before expiration.",
        timestamp: new Date(),
        suggestions: ["30 days before", "60 days before", "90 days before", "Custom timeline"]
      };
    } else if (input.includes('digest') || input.includes('daily') || input.includes('summary')) {
      return {
        id: Date.now().toString(),
        type: 'agent',
        content: "Excellent! A daily digest keeps you informed without overwhelming your inbox. What metrics would you like included? I can summarize portfolio performance, recent activities, and upcoming tasks.",
        timestamp: new Date(),
        suggestions: ["Portfolio performance", "Recent activities", "Upcoming deadlines", "All of the above"]
      };
    } else {
      return {
        id: Date.now().toString(),
        type: 'agent',
        content: "I understand! Let me help you create a custom notification. Could you tell me more about when you'd like to be notified and how you'd prefer to receive these alerts?",
        timestamp: new Date(),
        suggestions: ["Via email", "Via SMS", "In-app notifications", "All methods"]
      };
    }
  };

  const handleSuggestionClick = (suggestion: string) => {
    setCurrentMessage(suggestion);
  };

  const createNotificationRule = (trigger: string, delivery: string) => {
    const newRule: NotificationRule = {
      id: Date.now().toString(),
      name: `${trigger} notification`,
      trigger: {
        type: 'custom',
        condition: trigger,
      },
      delivery: {
        method: delivery.includes('email') ? 'email' : delivery.includes('SMS') ? 'sms' : 'in_app',
        recipients: ['user@example.com'],
        template: `Alert: ${trigger}`
      },
      isActive: true
    };
    
    setNotificationRules(prev => [...prev, newRule]);
    setCurrentRule(newRule);
    setCurrentStep('configure');
  };

  const deliveryIcons = {
    email: EnvelopeIcon,
    sms: PhoneIcon,
    in_app: BellIcon,
    all: ChatBubbleLeftRightIcon
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center">
              <SparklesIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Notification Builder</h2>
              <p className="text-sm text-gray-500">AI-powered notification setup</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 flex overflow-hidden">
          {/* Chat Interface */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs lg:max-w-md ${message.type === 'user' ? 'order-2' : ''}`}>
                    <div className={`flex items-start space-x-2 ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                        message.type === 'user' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-purple-600 text-white'
                      }`}>
                        {message.type === 'user' ? (
                          <span className="text-sm font-medium">U</span>
                        ) : (
                          <SparklesIcon className="w-4 h-4" />
                        )}
                      </div>
                      <div className={`flex-1 ${message.type === 'user' ? 'text-right' : ''}`}>
                        <div className={`inline-block p-3 rounded-lg ${
                          message.type === 'user'
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-900'
                        }`}>
                          <p className="text-sm">{message.content}</p>
                        </div>
                        {message.suggestions && (
                          <div className="mt-2 space-y-1">
                            {message.suggestions.map((suggestion, index) => (
                              <button
                                key={index}
                                onClick={() => handleSuggestionClick(suggestion)}
                                className="block w-full text-left px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                              >
                                {suggestion}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {isAgentTyping && (
                <div className="flex justify-start">
                  <div className="flex items-start space-x-2">
                    <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center">
                      <SparklesIcon className="w-4 h-4" />
                    </div>
                    <div className="bg-gray-100 rounded-lg p-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input */}
            <div className="p-6 border-t border-gray-200">
              <div className="flex space-x-3">
                <textarea
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage();
                    }
                  }}
                  placeholder="Describe what notifications you'd like to set up..."
                  className="flex-1 px-4 py-3 text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                  rows={2}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!currentMessage.trim()}
                  className="px-4 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <PaperAirplaneIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Notification Rules Sidebar */}
          <div className="w-80 border-l border-gray-200 bg-gray-50">
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Active Notifications</h3>
              
              {notificationRules.length === 0 ? (
                <div className="text-center py-8">
                  <BellIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-500">No notifications set up yet.</p>
                  <p className="text-xs text-gray-400 mt-1">Chat with the assistant to create your first notification!</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {notificationRules.map((rule) => {
                    const DeliveryIcon = deliveryIcons[rule.delivery.method];
                    return (
                      <div key={rule.id} className="bg-white p-4 rounded-lg border border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 text-sm">{rule.name}</h4>
                          <div className="flex items-center space-x-2">
                            <DeliveryIcon className="w-4 h-4 text-gray-400" />
                            <div className={`w-2 h-2 rounded-full ${rule.isActive ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600">{rule.trigger.condition}</p>
                        <div className="mt-2 flex space-x-2">
                          <button className="text-xs text-purple-600 hover:text-purple-700">Edit</button>
                          <button className="text-xs text-gray-400 hover:text-gray-600">Delete</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Quick Setup Templates */}
              <div className="mt-8">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Quick Setup</h4>
                <div className="space-y-2">
                  {[
                    { icon: CurrencyDollarIcon, label: "Value Changes", trigger: "property values change by 10%" },
                    { icon: ClockIcon, label: "Workflow Updates", trigger: "workflows reach new stages" },
                    { icon: CalendarIcon, label: "Lease Reminders", trigger: "leases expire in 60 days" },
                    { icon: ExclamationTriangleIcon, label: "Overdue Tasks", trigger: "tasks become overdue" }
                  ].map((template, index) => (
                    <button
                      key={index}
                      onClick={() => createNotificationRule(template.trigger, "email")}
                      className="w-full flex items-center space-x-3 p-3 text-left hover:bg-white rounded-lg transition-colors"
                    >
                      <template.icon className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{template.label}</p>
                        <p className="text-xs text-gray-500">{template.trigger}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};