import React from 'react';
import { Module, UserModuleAccess } from '../types';
import { ChevronRightIcon } from '@heroicons/react/24/outline';

interface ModuleSelectorProps {
  modules: (Module & { user_module_access: UserModuleAccess })[];
  onSelect: (module: Module) => void;
  isLoading?: boolean;
}

export const ModuleSelector: React.FC<ModuleSelectorProps> = ({ 
  modules, 
  onSelect, 
  isLoading = false 
}) => {
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your workspaces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-green-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900">Turnkey</h1>
            <p className="mt-2 text-lg text-gray-600">Real Estate Operational Workflows</p>
          </div>
        </div>
      </div>

      {/* Module Selection */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">Choose Your Workspace</h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Select the real estate operation you want to focus on. Each workspace is tailored 
            for specific workflows and processes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8">
          {modules.map((module) => (
            <div
              key={module.id}
              onClick={() => onSelect(module)}
              className={`
                group relative bg-white rounded-2xl shadow-lg hover:shadow-xl 
                transition-all duration-300 cursor-pointer border border-gray-200
                hover:border-${module.color_theme}-300 hover:-translate-y-1
              `}
            >
              {/* Color accent */}
              <div className={`h-2 bg-${module.color_theme}-500 rounded-t-2xl`}></div>
              
              <div className="p-8">
                {/* Icon and title */}
                <div className="flex items-center mb-6">
                  <div className={`
                    p-4 bg-${module.color_theme}-100 rounded-xl mr-5
                    group-hover:bg-${module.color_theme}-200 transition-colors
                  `}>
                    <span className="text-4xl">{module.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 group-hover:text-gray-800">
                      {module.display_name}
                    </h3>
                    {module.user_module_access.role && (
                      <span className={`
                        inline-block px-2 py-1 rounded-full text-xs font-medium mt-1
                        bg-${module.color_theme}-100 text-${module.color_theme}-800
                      `}>
                        {module.user_module_access.role}
                      </span>
                    )}
                  </div>
                </div>

                {/* Description */}
                <p className="text-gray-600 text-lg leading-relaxed mb-6">
                  {module.description}
                </p>

                {/* Features */}
                {module.module_config?.dashboard_widgets && (
                  <div className="mb-6">
                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Key Features:</h4>
                    <div className="flex flex-wrap gap-2">
                      {module.module_config.dashboard_widgets.slice(0, 3).map((widget: string, index: number) => (
                        <span
                          key={index}
                          className={`
                            px-3 py-1 bg-${module.color_theme}-50 text-${module.color_theme}-700 
                            rounded-full text-sm border border-${module.color_theme}-200
                          `}
                        >
                          {widget.replace('_', ' ')}
                        </span>
                      ))}
                      {module.module_config.dashboard_widgets.length > 3 && (
                        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-full text-sm">
                          +{module.module_config.dashboard_widgets.length - 3} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Call to action */}
                <div className="flex items-center justify-between">
                  <div className="text-sm text-gray-500">
                    {module.user_module_access.last_accessed_at ? (
                      `Last accessed ${new Date(module.user_module_access.last_accessed_at).toLocaleDateString()}`
                    ) : (
                      'Ready to start'
                    )}
                  </div>
                  <div className={`
                    flex items-center text-${module.color_theme}-600 font-semibold
                    group-hover:text-${module.color_theme}-700
                  `}>
                    <span className="mr-2">Open Workspace</span>
                    <ChevronRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom help text */}
        <div className="text-center mt-16">
          <p className="text-gray-500">
            Need help choosing? Each workspace can be customized to fit your specific needs.{' '}
            <a href="#" className="text-blue-600 hover:text-blue-800 font-medium">
              Learn more about our modules
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};