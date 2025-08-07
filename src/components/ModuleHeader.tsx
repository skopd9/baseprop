import React, { useState } from 'react';
import { Module, UserModuleAccess } from '../types';
import { 
  ChevronDownIcon, 
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  BellIcon 
} from '@heroicons/react/24/outline';

interface ModuleHeaderProps {
  currentModule: Module | null;
  availableModules: (Module & { user_module_access: UserModuleAccess })[];
  onModuleSwitch: (module: Module) => void;
  onShowModuleSelector?: () => void;
  onShowNotifications?: () => void;
}

export const ModuleHeader: React.FC<ModuleHeaderProps> = ({
  currentModule,
  availableModules,
  onModuleSwitch,
  onShowModuleSelector,
  onShowNotifications
}) => {


  if (!currentModule) return null;

  return (
    <header className={`bg-${currentModule.color_theme}-600 text-white shadow-lg`}>
      <div className="px-6">
        <div className="flex items-center justify-between h-16">
          {/* Left spacer */}
          <div className="flex-1"></div>

          {/* Right side - All Actions */}
          <div className="flex items-center space-x-4">
            {/* Notifications Bell */}
            <button
              onClick={onShowNotifications}
              className={`
                relative p-2 rounded-lg
                bg-${currentModule.color_theme}-700 hover:bg-${currentModule.color_theme}-800
                transition-colors duration-200
              `}
            >
              <BellIcon className="w-6 h-6" />
              {/* Notification badge */}
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                3
              </span>
            </button>

            {/* Settings */}
            <button className={`
              p-2 rounded-lg bg-${currentModule.color_theme}-700 
              hover:bg-${currentModule.color_theme}-800 transition-colors
            `}>
              <Cog6ToothIcon className="w-5 h-5" />
            </button>

            {/* Logout */}
            <button className={`
              p-2 rounded-lg bg-${currentModule.color_theme}-700 
              hover:bg-${currentModule.color_theme}-800 transition-colors
            `}>
              <ArrowRightOnRectangleIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

    </header>
  );
};