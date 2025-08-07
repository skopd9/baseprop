import React, { useState, useEffect } from 'react';
import { ModuleProvider } from './contexts/ModuleContext';
import { Property, WorkflowTemplate, WorkflowInstance } from './types';
import { mockProperties } from './lib/mockData';
import { TurnkeyApp } from './components/TurnkeyApp';
import { AuthModal } from './components/AuthModal';
import { ConfigurationChat } from './components/ConfigurationChat';
import { supabase } from './lib/supabase';

function App() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showConfigurationChat, setShowConfigurationChat] = useState(false);
  const [userConfiguration, setUserConfiguration] = useState<any>(null);

  // Core state for the application
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [properties, setProperties] = useState<Property[]>(mockProperties);
  const [workflowInstances, setWorkflowInstances] = useState<WorkflowInstance[]>([]);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [selectedView, setSelectedView] = useState('dashboard');
  const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowInstance | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  
  // Load data from database
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load workflow templates from database
        const { data: templatesData, error: templatesError } = await supabase
          .from('workflow_templates')
          .select('*')
          .order('name');
        
        if (templatesError) {
          console.error('Error loading templates:', templatesError);
        } else {
          console.log('🔍 DATABASE TEMPLATES DEBUG:');
          console.log('Raw database response:', templatesData);
          console.log('Number of templates loaded:', templatesData?.length || 0);
          if (templatesData && templatesData.length > 0) {
            templatesData.forEach((template, index) => {
              console.log(`Template ${index + 1}:`, {
                id: template.id,
                name: template.name,
                key: template.key,
                category: template.category,
                stages: template.stages,
                workstreams: template.workstreams?.length || 0,
                created_at: template.created_at
              });
            });
          }
          setTemplates(templatesData || []);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  // Manage ElevenLabs widget visibility
  useEffect(() => {
    if (isLoggedIn) {
      hideElevenLabsWidget();
    } else {
      showElevenLabsWidget();
    }
  }, [isLoggedIn]);

  // Handle login - open auth modal
  const handleLogin = () => {
    setShowAuthModal(true);
  };

  // Handle successful authentication
  const handleAuthSuccess = () => {
    setIsLoggedIn(true);
    setShowAuthModal(false);
    // Show configuration chat for new users
    setShowConfigurationChat(true);
    // Hide the ElevenLabs widget when logged in
    hideElevenLabsWidget();
  };

  // Function to hide ElevenLabs widget
  const hideElevenLabsWidget = () => {
    const widgetContainer = document.getElementById('elevenlabs-widget-container');
    if (widgetContainer) {
      widgetContainer.style.display = 'none';
    }
  };

  // Function to show ElevenLabs widget
  const showElevenLabsWidget = () => {
    const widgetContainer = document.getElementById('elevenlabs-widget-container');
    if (widgetContainer) {
      widgetContainer.style.display = 'block';
    }
  };

  // Handle voice agent - directly start the conversation
  const handleTryVoiceAgent = async () => {
    // Function to try clicking the widget
    const tryClickWidget = () => {
      const widget = document.querySelector('elevenlabs-convai') as any;
      if (!widget) return false;
      
      try {
        // Method 1: Look for buttons in shadow DOM or regular DOM
        const widgetButton = widget.shadowRoot?.querySelector('button') || 
                            widget.querySelector('button') ||
                            widget.querySelector('[role="button"]') ||
                            widget.shadowRoot?.querySelector('[data-testid*="call"]') ||
                            widget.shadowRoot?.querySelector('.convai-trigger-button');
        
        if (widgetButton) {
          widgetButton.click();
          return true;
        }
        
        // Method 2: Try clicking the widget itself
        widget.click();
        return true;
      } catch (error) {
        console.log('Click attempt failed:', error);
        return false;
      }
    };
    
    // Try immediately first
    if (tryClickWidget()) return;
    
    // If that fails, wait a bit for the widget to fully load and try again
    setTimeout(() => {
      if (!tryClickWidget()) {
        // Final fallback: scroll to widget
        const widget = document.querySelector('elevenlabs-convai');
        if (widget) {
          widget.scrollIntoView({ behavior: 'smooth' });
          // Also try to focus the widget to make it more visible
          if ('focus' in widget) {
            (widget as any).focus();
          }
        }
      }
    }, 500);
  };

  // Landing Page Component
  if (!isLoggedIn) {
        return (
      <div className="bg-gradient-to-br from-blue-50 via-orange-50 to-blue-50">
        {/* Top Navigation - Base44 Style */}
        <nav className="flex justify-between items-center p-6 bg-white/80 backdrop-blur-sm border-b border-gray-100">
          <div className="text-2xl font-bold text-gray-900">
            Turnkey
          </div>
          <div className="flex items-center gap-6">
            <a href="#features" className="text-gray-600 hover:text-gray-900 font-medium">Features</a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 font-medium">Pricing</a>
          <button 
            onClick={handleLogin}
            className="px-6 py-2 bg-orange-500 text-white font-medium rounded-lg hover:bg-orange-600 transition-all duration-300"
          >
            Start Building
          </button>
          </div>
        </nav>

        {/* Hero Section - Base44 Inspired */}
        <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden">
          <div className="text-center max-w-5xl mx-auto relative z-10">
            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-bold text-gray-900 mb-6 leading-tight">
              Let's make your real estate
              <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-blue-600">
                operation a reality.
              </span>
              <br />
              Right now.
            </h1>

            {/* Subtitle */}
            <p className="text-xl md:text-2xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
              Turnkey lets you build fully-functional real estate workflows in minutes with just your words. No coding necessary.
            </p>

            {/* Primary CTA */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <button 
                onClick={handleLogin}
                className="px-12 py-4 bg-orange-500 text-white text-xl font-semibold rounded-2xl hover:bg-orange-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Start Building
              </button>
              <button 
                onClick={handleTryVoiceAgent}
                className="px-12 py-4 bg-gradient-to-r from-purple-500 to-blue-600 text-white text-xl font-semibold rounded-2xl hover:from-purple-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-3"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C13.1 2 14 2.9 14 4V10C14 11.1 13.1 12 12 12C10.9 12 10 11.1 10 10V4C10 2.9 10.9 2 12 2M19 10V12C19 15.9 15.9 19 12 19C8.1 19 5 15.9 5 12V10H7V12C7 14.8 9.2 17 12 17C14.8 17 17 14.8 17 12V10H19ZM12 20.5C12.3 20.5 12.5 20.8 12.5 21S12.3 21.5 12 21.5H12C8.7 21.5 6 18.8 6 15.5V14H8V15.5C8 17.7 9.8 19.5 12 19.5C14.2 19.5 16 17.7 16 15.5V14H18V15.5C18 18.8 15.3 21.5 12 21.5Z"/>
                </svg>
                Talk to AI
              </button>
            </div>

            {/* Quick Start Options */}
            <div className="text-gray-600 mb-4">Not sure where to start? Try one of these:</div>
            <div className="flex flex-wrap justify-center gap-3 mb-12">
              <span className="px-4 py-2 bg-white rounded-full border border-gray-200 text-gray-700 hover:border-orange-300 cursor-pointer transition-all">
                Property Acquisition
              </span>
              <span className="px-4 py-2 bg-white rounded-full border border-gray-200 text-gray-700 hover:border-orange-300 cursor-pointer transition-all">
                Lease Management
              </span>
              <span className="px-4 py-2 bg-white rounded-full border border-gray-200 text-gray-700 hover:border-orange-300 cursor-pointer transition-all">
                CapEx Planning
              </span>
              <span className="px-4 py-2 bg-white rounded-full border border-gray-200 text-gray-700 hover:border-orange-300 cursor-pointer transition-all">
                Asset Disposal
              </span>
              <span className="px-4 py-2 bg-white rounded-full border border-gray-200 text-gray-700 hover:border-orange-300 cursor-pointer transition-all">
                Portfolio Dashboard
              </span>
            </div>

            {/* Trust Indicator */}
            <div className="text-gray-500 text-sm">
              Trusted by 100+ real estate professionals
            </div>
          </div>

          {/* Background Elements */}
          <div className="absolute top-20 left-20 w-32 h-32 bg-orange-200 rounded-full opacity-20 animate-pulse"></div>
          <div className="absolute bottom-20 right-20 w-48 h-48 bg-blue-200 rounded-full opacity-20 animate-pulse" style={{animationDelay: '1s'}}></div>
          <div className="absolute top-1/2 left-10 w-16 h-16 bg-orange-300 rounded-full opacity-30 animate-bounce"></div>
        </div>

        {/* Main Value Proposition - Base44 Style */}
        <div className="bg-white py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
                Consider yourself <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-blue-600">limitless.</span>
              </h2>
              <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                If you can describe your real estate process, you can automate it.
              </p>
            </div>

            {/* Three Step Process */}
            <div className="grid md:grid-cols-3 gap-12 mb-20">
              {/* Step 1 */}
              <div className="text-center">
                <div className="relative bg-gradient-to-br from-orange-50 to-blue-50 rounded-3xl p-8 mb-8 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-blue-100 opacity-50"></div>
                  <div className="relative">
                    <div className="w-full h-64 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-4">
                      <div className="text-center">
                        <div className="text-4xl mb-4">💬</div>
                        <div className="bg-orange-100 rounded-lg p-4 max-w-xs">
                          <p className="text-sm text-gray-700">"Create an acquisition workflow for commercial properties with due diligence, financing, and legal review stages"</p>
                        </div>
                        <div className="mt-4">
                          <div className="bg-orange-500 text-white px-4 py-2 rounded-full inline-block">
                            → Generate
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Create at the speed of thought</h3>
                <p className="text-gray-600 mb-6">
                  Tell Turnkey your real estate process through text or voice, and watch it transform into a working workflow—complete with all stages, tasks, and automations.
                </p>
                <button 
                  onClick={handleLogin}
                  className="text-orange-500 font-semibold hover:text-orange-600"
                >
                  Start building →
                </button>
              </div>

              {/* Step 2 */}
              <div className="text-center">
                <div className="relative bg-gradient-to-br from-blue-50 to-orange-50 rounded-3xl p-8 mb-8 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-100 to-orange-100 opacity-50"></div>
                  <div className="relative">
                    <div className="w-full h-64 bg-white rounded-2xl shadow-lg flex items-center justify-center mb-4">
                      <div className="text-center space-y-2">
                        <div className="flex items-center space-x-2 text-sm">
                          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                          <span>Property inspection</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                          <span>Financial analysis</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                          <span>Loan application</span>
                        </div>
                        <div className="flex items-center space-x-2 text-sm">
                          <div className="w-4 h-4 bg-gray-300 rounded-full"></div>
                          <span>Legal review</span>
                        </div>
                        <div className="text-xs text-gray-500 mt-4">Building workflow...</div>
            </div>
          </div>
            </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">The system's built automatically</h3>
                <p className="text-gray-600 mb-6">
                  Everything your process needs to function, like task assignments, deadline tracking, or document generation is taken care of behind the scenes.
                </p>
                <button 
                  onClick={handleLogin}
                  className="text-orange-500 font-semibold hover:text-orange-600"
                >
                  Start building →
                </button>
              </div>

              {/* Step 3 */}
              <div className="text-center">
                <div className="relative bg-gradient-to-br from-orange-50 to-blue-50 rounded-3xl p-8 mb-8 overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-100 to-blue-100 opacity-50"></div>
                  <div className="relative">
                    <div className="w-full h-64 bg-white rounded-2xl shadow-lg p-6">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold">Property Acquisition</h4>
                        <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">75% Complete</span>
                      </div>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span>Due Diligence</span>
                          <span className="text-green-600">✓</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Financing</span>
                          <span className="text-blue-600">In Progress</span>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span>Legal Review</span>
                          <span className="text-gray-400">Pending</span>
                        </div>
                      </div>
                      <button className="w-full mt-4 bg-orange-500 text-white py-2 rounded-lg text-sm">
                        + Add Task
                      </button>
                    </div>
                  </div>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Ready to use, instantly.</h3>
                <p className="text-gray-600 mb-6">
                  Your workflow is live and ready. Track progress, assign tasks, and manage your entire real estate operation from day one.
                </p>
                <button 
                  onClick={handleLogin}
                  className="text-orange-500 font-semibold hover:text-orange-600"
                >
                  Start building →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Testimonials Section - Base44 Style */}
        <div className="bg-gradient-to-br from-blue-50 to-orange-50 py-20 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                "Okay, <span className="text-orange-500">@Turnkey</span> has blown my mind."
              </h2>
              <p className="text-xl text-gray-600">
                And other great things our real estate professionals say about us.
              </p>
            </div>

            {/* Scrolling Testimonials */}
            <div className="grid md:grid-cols-3 gap-6 mb-16">
              <div className="bg-white p-6 rounded-2xl shadow-lg">
                <p className="text-gray-700 mb-4">"Turnkey looks perfect for property managers who want to automate without learning complex software."</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-orange-600 font-bold">SM</span>
                  </div>
                <div>
                    <div className="font-semibold">Sarah Martinez</div>
                    <div className="text-gray-500 text-sm">Property Manager</div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg">
                <p className="text-gray-700 mb-4">"You can now manage a full real estate portfolio without hiring any developers. This tool is incredible."</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-blue-600 font-bold">MJ</span>
                </div>
                <div>
                    <div className="font-semibold">Michael Johnson</div>
                    <div className="text-gray-500 text-sm">Real Estate Investor</div>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl shadow-lg">
                <p className="text-gray-700 mb-4">"Okay, Turnkey has blown my mind 🤯. No iterations, no changes, just described my process and it worked perfectly."</p>
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <span className="text-green-600 font-bold">AC</span>
                  </div>
                <div>
                    <div className="font-semibold">Amanda Chen</div>
                    <div className="text-gray-500 text-sm">Portfolio Director</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="text-center">
              <button 
                onClick={handleLogin}
                className="px-8 py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-all duration-300"
              >
                Start building →
              </button>
            </div>
          </div>
        </div>

        {/* Pricing Section - Base44 Style */}
        <div className="bg-white py-20 px-4" id="pricing">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
                Pricing plans for every portfolio
              </h2>
              <p className="text-xl text-gray-600">
                Scale as you go with plans designed to match your growth.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              {/* Free Plan */}
              <div className="bg-gray-50 p-8 rounded-2xl">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Start for free.</h3>
                <p className="text-gray-600 mb-6">Get access to:</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>All core workflow features</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Up to 5 properties</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Basic task automation</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Email notifications</span>
                  </li>
                </ul>
                <button 
                  onClick={handleLogin}
                  className="w-full py-3 bg-gray-900 text-white font-semibold rounded-xl hover:bg-gray-800 transition-all duration-300"
                >
                  Start building
                </button>
              </div>

              {/* Paid Plan */}
              <div className="bg-gradient-to-br from-orange-50 to-blue-50 p-8 rounded-2xl border-2 border-orange-200 relative">
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="bg-orange-500 text-white px-4 py-1 rounded-full text-sm font-medium">Most Popular</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-4">Paid plans from</h3>
                <div className="flex items-baseline mb-6">
                  <span className="text-4xl font-bold text-gray-900">$49</span>
                  <span className="text-gray-600 ml-2">/mo</span>
                </div>
                <p className="text-gray-600 mb-6">Upgrade as you go for unlimited properties, advanced features, and priority support.</p>
                <ul className="space-y-3 mb-8">
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Unlimited properties</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Advanced AI automation</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Custom integrations</span>
                  </li>
                  <li className="flex items-center">
                    <svg className="w-5 h-5 text-green-500 mr-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span>Priority support</span>
                  </li>
                </ul>
                <button 
                  onClick={handleLogin}
                  className="w-full py-3 bg-orange-500 text-white font-semibold rounded-xl hover:bg-orange-600 transition-all duration-300"
                >
                  See all plans →
                </button>
              </div>
            </div>
          </div>
            </div>

        {/* Final CTA Section */}
        <div className="bg-gray-900 py-20 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
              So, what are we building?
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-8">
              <button 
                onClick={handleLogin}
                className="px-12 py-4 bg-orange-500 text-white text-xl font-semibold rounded-2xl hover:bg-orange-600 transition-all duration-300 transform hover:scale-105 shadow-lg"
              >
                Start Building
              </button>
              <button 
                onClick={handleTryVoiceAgent}
                className="px-12 py-4 bg-gradient-to-r from-purple-500 to-blue-600 text-white text-xl font-semibold rounded-2xl hover:from-purple-600 hover:to-blue-700 transition-all duration-300 transform hover:scale-105 shadow-lg flex items-center gap-3"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 2C13.1 2 14 2.9 14 4V10C14 11.1 13.1 12 12 12C10.9 12 10 11.1 10 10V4C10 2.9 10.9 2 12 2M19 10V12C19 15.9 15.9 19 12 19C8.1 19 5 15.9 5 12V10H7V12C7 14.8 9.2 17 12 17C14.8 17 17 14.8 17 12V10H19ZM12 20.5C12.3 20.5 12.5 20.8 12.5 21S12.3 21.5 12 21.5H12C8.7 21.5 6 18.8 6 15.5V14H8V15.5C8 17.7 9.8 19.5 12 19.5C14.2 19.5 16 17.7 16 15.5V14H18V15.5C18 18.8 15.3 21.5 12 21.5Z"/>
                </svg>
                Talk to AI
              </button>
            </div>
            <p className="text-gray-400 mt-6">
              Turnkey is the AI-powered platform that lets real estate professionals build fully functioning workflows in minutes. Using nothing but natural language, Turnkey enables anyone to turn their processes into automated systems that are ready to use, no integrations required.
            </p>
          </div>
        </div>

        {/* Auth Modal */}
        <AuthModal 
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
          onSuccess={handleAuthSuccess}
        />
      </div>
    );
  }

  // Create demo properties based on user configuration
  const createDemoProperties = (config: any) => {
    const demoProperties: Property[] = [
      {
        id: 'demo-1',
        asset_register_id: 'DEMO-001',
        name: 'Metro Office Tower',
        address: '123 Business District, Downtown',
        property_type: 'stand_alone_buildings',
        property_sub_type: 'office',
        square_feet: 45000,
        units: 12,
        acquisition_date: '2023-01-15',
        acquisition_price: 8500000,
        current_value: 9200000,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'demo-2',
        asset_register_id: 'DEMO-002',
        name: 'Riverside Apartments',
        address: '456 River View Lane, Midtown',
        property_type: 'horizontal_properties',
        property_sub_type: 'apartment',
        square_feet: 32000,
        units: 24,
        acquisition_date: '2022-08-20',
        acquisition_price: 5200000,
        current_value: 5800000,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'demo-3',
        asset_register_id: 'DEMO-003',
        name: 'Tech Campus Plaza',
        address: '789 Innovation Drive, Tech District',
        property_type: 'stand_alone_buildings',
        property_sub_type: 'commercial',
        square_feet: 68000,
        units: 8,
        acquisition_date: '2023-03-10',
        acquisition_price: 12300000,
        current_value: 13100000,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'demo-4',
        asset_register_id: 'DEMO-004',
        name: 'Heritage Retail Center',
        address: '321 Main Street, Historic Quarter',
        property_type: 'stand_alone_buildings',
        property_sub_type: 'retail',
        square_feet: 28000,
        units: 16,
        acquisition_date: '2022-11-05',
        acquisition_price: 4100000,
        current_value: 4650000,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      },
      {
        id: 'demo-5',
        asset_register_id: 'DEMO-005',
        name: 'Industrial Park East',
        address: '987 Manufacturing Way, Industrial Zone',
        property_type: 'stand_alone_buildings',
        property_sub_type: 'industrial',
        square_feet: 95000,
        units: 4,
        acquisition_date: '2023-02-28',
        acquisition_price: 6800000,
        current_value: 7200000,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    ];

    // Add demo properties to existing properties
    setProperties(prev => [...prev, ...demoProperties]);
  };

  // Handle configuration completion
  const handleConfigurationComplete = (config: any) => {
    console.log('Configuration completed:', config);
    setUserConfiguration(config);
    
    // Create demo properties for demonstration
    createDemoProperties(config);
    
    setShowConfigurationChat(false);
  };

  // Handle configuration skip
  const handleConfigurationSkip = () => {
    setShowConfigurationChat(false);
  };

  // Show configuration chat after login but before main app
  if (isLoggedIn && showConfigurationChat) {
    return (
      <ConfigurationChat
        onConfigurationComplete={handleConfigurationComplete}
        onSkip={handleConfigurationSkip}
      />
    );
  }

  // Project Builder App (original functionality)
  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Turnkey...</p>
        </div>
      </div>
    );
  }

  return (
    <TurnkeyApp
      properties={properties}
      setProperties={setProperties}
        templates={templates}
      setTemplates={setTemplates}
        workflowInstances={workflowInstances}
      setWorkflowInstances={setWorkflowInstances}
      selectedProperty={selectedProperty}
      setSelectedProperty={setSelectedProperty}
        selectedView={selectedView}
      setSelectedView={setSelectedView}
      selectedWorkflow={selectedWorkflow}
      setSelectedWorkflow={setSelectedWorkflow}
      showOnboarding={showOnboarding}
      setShowOnboarding={setShowOnboarding}
      userConfiguration={userConfiguration}
    />
  );
}

// Wrapper component with ModuleProvider
const AppWithModules: React.FC = () => {
  return (
    <ModuleProvider>
      <App />
    </ModuleProvider>
  );
};

export default AppWithModules;