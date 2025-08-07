import React, { useState, useRef, useEffect } from 'react';
import { Property } from '../types';

interface Message {
  id: string;
  type: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ConfigurationChatProps {
  onConfigurationComplete: (config: ValuationConfig) => void;
  onSkip: () => void;
}

interface ValuationConfig {
  workflowType: string;
  companyName: string;
  portfolioSize: string;
  propertyTypes: string[];
  valuationFrequency: string;
  primaryUseCase: string;
  teamSize: string;
  currentProcess: string;
}

export const ConfigurationChat: React.FC<ConfigurationChatProps> = ({ 
  onConfigurationComplete, 
  onSkip 
}) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [config, setConfig] = useState<Partial<ValuationConfig>>({});
  const [isComplete, setIsComplete] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const configurationSteps = [
    {
      question: "Hi! 👋 I'm here to help you build your real estate workflow solution. What type of workflow would you like to start with?",
      key: 'workflowType',
      type: 'select',
      options: ['Property Valuations', 'Lease Management', 'Property Acquisition', 'Asset Management', 'Capital Expenditure Planning']
    },
    {
      question: "Perfect! Let's set up your workflow. What's your company name?",
      key: 'companyName',
      type: 'text'
    },
    {
      question: "Great! How many properties are you currently managing in your portfolio?",
      key: 'portfolioSize',
      type: 'select',
      options: ['1-10 properties', '11-50 properties', '51-200 properties', '200+ properties']
    },
    {
      question: "What types of properties do you primarily work with? (You can select multiple)",
      key: 'propertyTypes',
      type: 'multiselect',
      options: ['Residential', 'Commercial Office', 'Retail', 'Industrial', 'Mixed Use', 'Land', 'Hospitality']
    },
    {
      question: "How often do you typically need property valuations?",
      key: 'valuationFrequency',
      type: 'select',
      options: ['Monthly', 'Quarterly', 'Semi-annually', 'Annually', 'As needed']
    },
    {
      question: "What's your primary use case for valuations?",
      key: 'primaryUseCase',
      type: 'select',
      options: ['Investment decisions', 'Portfolio reporting', 'Compliance requirements', 'Insurance purposes', 'Financial reporting', 'Asset disposition']
    },
    {
      question: "How many team members will be using this system?",
      key: 'teamSize',
      type: 'select',
      options: ['Just me', '2-5 team members', '6-15 team members', '16+ team members']
    },
    {
      question: "Tell me about your current valuation process. What challenges are you facing?",
      key: 'currentProcess',
      type: 'text'
    }
  ];

  useEffect(() => {
    // Start the conversation
    if (messages.length === 0) {
      addAssistantMessage(configurationSteps[0].question);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const addUserMessage = (content: string) => {
    const newMessage: Message = {
      id: crypto.randomUUID(),
      type: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, newMessage]);
  };

  const addAssistantMessage = (content: string, delay = 1000) => {
    setIsTyping(true);
    setTimeout(() => {
      const newMessage: Message = {
        id: crypto.randomUUID(),
        type: 'assistant',
        content,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, newMessage]);
      setIsTyping(false);
    }, delay);
  };

  const handleSendMessage = () => {
    if (!currentInput.trim() || isTyping) return;

    const userInput = currentInput.trim();
    addUserMessage(userInput);
    setCurrentInput('');

    // Update configuration
    const currentStepConfig = configurationSteps[currentStep];
    const updatedConfig = {
      ...config,
      [currentStepConfig.key]: userInput
    };
    setConfig(updatedConfig);

    // Move to next step or complete
    if (currentStep < configurationSteps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      
      // Add follow-up message and next question
      setTimeout(() => {
        addAssistantMessage("Perfect! " + configurationSteps[nextStep].question, 800);
      }, 500);
    } else {
      // Configuration complete
      setIsComplete(true);
      setTimeout(() => {
        const workflowSolutions = {
          'Property Valuations': {
            features: [
              '✅ **Automated Valuation Workflows** - Streamlined 4-stage process: Valuer Assignment → Field Completion → Review → Completion',
              '✅ **Professional Valuer Network** - Access to qualified valuers: John Smith, Jane Doe, Mike Johnson, Sarah Wilson',
              '✅ **Comprehensive Data Collection** - 50+ data points including property details, location data, physical characteristics, market analysis, and financial metrics',
              '✅ **Real-time Progress Tracking** - Dashboard showing valuation status, completion rates, and team performance',
              '✅ **Automated Reporting** - Generate professional valuation reports with one click',
              '✅ **Team Collaboration** - Assign tasks, track progress, and manage approvals across your team'
            ]
          },
          'Lease Management': {
            features: [
              '✅ **Tenant Screening Workflows** - Background checks and application review processes',
              '✅ **Automated Rent Collection** - Payment processing and tracking',
              '✅ **Lease Renewal Management** - Negotiation and renewal workflows',
              '✅ **Maintenance Request System** - Tenant request management and tracking',
              '✅ **Document Management** - Centralized lease documentation',
              '✅ **Performance Analytics** - Occupancy rates and rental income tracking'
            ]
          },
          'Property Acquisition': {
            features: [
              '✅ **Deal Pipeline Management** - Property sourcing and tracking',
              '✅ **Due Diligence Workflows** - Comprehensive property analysis processes',
              '✅ **Financing Management** - Loan and investment workflow coordination',
              '✅ **Legal Review Process** - Document review and approval workflows',
              '✅ **Closing Coordination** - Transaction completion management',
              '✅ **Investment Analysis** - ROI and performance projections'
            ]
          }
        };

        const selectedWorkflow = workflowSolutions[updatedConfig.workflowType as keyof typeof workflowSolutions] || workflowSolutions['Property Valuations'];
        
        addAssistantMessage(
          `Excellent! I've got everything I need to set up your ${updatedConfig.workflowType.toLowerCase()} solution. 

Based on your responses, here's what we'll configure for ${updatedConfig.companyName}:

🔧 **Workflow Type**: ${updatedConfig.workflowType}
🏢 **Portfolio**: ${updatedConfig.portfolioSize}
🏗️ **Property Types**: ${Array.isArray(updatedConfig.propertyTypes) ? updatedConfig.propertyTypes?.join(', ') : updatedConfig.propertyTypes}
📅 **Frequency**: ${updatedConfig.valuationFrequency}
🎯 **Primary Use Case**: ${updatedConfig.primaryUseCase}
👥 **Team Size**: ${updatedConfig.teamSize}

**Your Turnkey ${updatedConfig.workflowType} Solution includes:**

${selectedWorkflow.features.join('\n\n')}

🏢 **Demo Portfolio** - I'll create 5 sample properties to showcase the platform capabilities

Ready to start using your ${updatedConfig.workflowType.toLowerCase()} solution?`, 
          1200
        );
      }, 1000);
    }
  };

  const handleQuickReply = (option: string) => {
    const currentStepConfig = configurationSteps[currentStep];
    
    if (currentStepConfig.type === 'multiselect') {
      // Handle multiple selections
      const currentSelections = config[currentStepConfig.key as keyof ValuationConfig] as string[] || [];
      const newSelections = currentSelections.includes(option)
        ? currentSelections.filter(item => item !== option)
        : [...currentSelections, option];
      
      setConfig(prev => ({
        ...prev,
        [currentStepConfig.key]: newSelections
      }));
      
      // Don't auto-advance for multiselect
      return;
    } else {
      // Handle single selection
      setCurrentInput(option);
      setTimeout(() => handleSendMessage(), 100);
    }
  };

  const handleMultiselectConfirm = () => {
    const currentStepConfig = configurationSteps[currentStep];
    const selections = config[currentStepConfig.key as keyof ValuationConfig] as string[] || [];
    
    if (selections.length === 0) return;
    
    const selectionText = selections.join(', ');
    addUserMessage(selectionText);
    
    // Move to next step
    if (currentStep < configurationSteps.length - 1) {
      const nextStep = currentStep + 1;
      setCurrentStep(nextStep);
      setTimeout(() => {
        addAssistantMessage("Great choices! " + configurationSteps[nextStep].question, 800);
      }, 500);
    }
  };

  const handleComplete = () => {
    onConfigurationComplete(config as ValuationConfig);
  };

  const currentStepConfig = configurationSteps[currentStep];
  const isMultiselect = currentStepConfig?.type === 'multiselect';
  const multiSelectValue = isMultiselect ? (config[currentStepConfig.key as keyof ValuationConfig] as string[] || []) : [];

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-orange-50 to-blue-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-3xl max-w-2xl w-full h-[90vh] flex flex-col shadow-2xl border border-gray-100">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-orange-500 to-blue-600 rounded-full flex items-center justify-center">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C13.1 2 14 2.9 14 4V10C14 11.1 13.1 12 12 12C10.9 12 10 11.1 10 10V4C10 2.9 10.9 2 12 2M19 10V12C19 15.9 15.9 19 12 19C8.1 19 5 15.9 5 12V10H7V12C7 14.8 9.2 17 12 17C14.8 17 17 14.8 17 12V10H19Z"/>
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Setup Assistant</h2>
              <p className="text-sm text-gray-500">Let's configure your valuation solution</p>
            </div>
          </div>
          <button
            onClick={onSkip}
            className="text-gray-400 hover:text-gray-600 text-sm font-medium"
          >
            Skip setup
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                  message.type === 'user'
                    ? 'bg-orange-500 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {message.content}
                </div>
                <div className={`text-xs mt-1 ${
                  message.type === 'user' ? 'text-orange-100' : 'text-gray-500'
                }`}>
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}

          {/* Typing indicator */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-900 px-4 py-3 rounded-2xl max-w-xs">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                  <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick Reply Options */}
        {!isTyping && !isComplete && currentStepConfig?.type === 'select' && (
          <div className="px-6 pb-4">
            <div className="flex flex-wrap gap-2">
              {currentStepConfig.options?.map((option) => (
                <button
                  key={option}
                  onClick={() => handleQuickReply(option)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-full text-sm transition-colors"
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Multi-select Options */}
        {!isTyping && !isComplete && currentStepConfig?.type === 'multiselect' && (
          <div className="px-6 pb-4">
            <div className="flex flex-wrap gap-2 mb-3">
              {currentStepConfig.options?.map((option) => (
                <button
                  key={option}
                  onClick={() => handleQuickReply(option)}
                  className={`px-4 py-2 rounded-full text-sm transition-colors ${
                    multiSelectValue.includes(option)
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                  }`}
                >
                  {option}
                  {multiSelectValue.includes(option) && (
                    <span className="ml-2">✓</span>
                  )}
                </button>
              ))}
            </div>
            {multiSelectValue.length > 0 && (
              <button
                onClick={handleMultiselectConfirm}
                className="w-full bg-orange-500 text-white py-2 rounded-xl font-medium hover:bg-orange-600 transition-colors"
              >
                Continue with {multiSelectValue.length} selected
              </button>
            )}
          </div>
        )}

        {/* Input Area */}
        {!isComplete && (
          <div className="p-6 border-t border-gray-100">
            {currentStepConfig?.type === 'text' && (
              <div className="flex space-x-3">
                <input
                  ref={inputRef}
                  type="text"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type your response..."
                  className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  disabled={isTyping}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!currentInput.trim() || isTyping}
                  className="px-6 py-3 bg-orange-500 text-white rounded-xl font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Send
                </button>
              </div>
            )}
          </div>
        )}

        {/* Complete Button */}
        {isComplete && (
          <div className="p-6 border-t border-gray-100">
            <button
              onClick={handleComplete}
              className="w-full bg-gradient-to-r from-orange-500 to-blue-600 text-white py-4 rounded-xl text-lg font-semibold hover:from-orange-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg"
            >
              Start Using My Valuation Solution →
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
