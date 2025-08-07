import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Module, UserModuleAccess } from '../types';
import { moduleService } from '../lib/supabase';

interface ModuleContextType {
  currentModule: Module | null;
  availableModules: (Module & { user_module_access: UserModuleAccess })[];
  setCurrentModule: (module: Module) => void;
  switchModule: (moduleId: string) => void;
  isLoading: boolean;
  error: string | null;
}

const ModuleContext = createContext<ModuleContextType | undefined>(undefined);

interface ModuleProviderProps {
  children: ReactNode;
  userId?: string; // In a real app, this would come from auth
}

export const ModuleProvider: React.FC<ModuleProviderProps> = ({ children, userId = 'demo-user' }) => {
  const [currentModule, setCurrentModule] = useState<Module | null>(null);
  const [availableModules, setAvailableModules] = useState<(Module & { user_module_access: UserModuleAccess })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load user's available modules
  useEffect(() => {
    loadUserModules();
  }, [userId]);

  const loadUserModules = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // For demo purposes, get all modules since we don't have proper auth
      const modules = await moduleService.getModules();
      
      // Convert to the expected format with fake user access
      const modulesWithAccess = modules.map(module => ({
        ...module,
        user_module_access: {
          id: `access-${module.id}`,
          user_id: userId,
          module_id: module.id,
          role: 'user' as const,
          is_default: module.name === 'valuations', // Default to valuations
          created_at: new Date().toISOString()
        }
      }));

      setAvailableModules(modulesWithAccess);

      // Set default module (valuations for now)
      const defaultModule = modulesWithAccess.find(m => m.name === 'valuations');
      if (defaultModule && !currentModule) {
        setCurrentModule(defaultModule);
      }
    } catch (err) {
      console.error('Error loading modules:', err);
      setError(err instanceof Error ? err.message : 'Failed to load modules');
    } finally {
      setIsLoading(false);
    }
  };

  const switchModule = async (moduleId: string) => {
    const module = availableModules.find(m => m.id === moduleId);
    if (module) {
      setCurrentModule(module);
      
      // Update last accessed (demo only)
      try {
        await moduleService.updateModuleAccess(userId, moduleId);
      } catch (err) {
        console.warn('Could not update module access:', err);
      }
    }
  };

  const handleSetCurrentModule = (module: Module) => {
    setCurrentModule(module);
  };

  const value: ModuleContextType = {
    currentModule,
    availableModules,
    setCurrentModule: handleSetCurrentModule,
    switchModule,
    isLoading,
    error
  };

  return (
    <ModuleContext.Provider value={value}>
      {children}
    </ModuleContext.Provider>
  );
};

export const useModule = () => {
  const context = useContext(ModuleContext);
  if (context === undefined) {
    throw new Error('useModule must be used within a ModuleProvider');
  }
  return context;
};

export default ModuleContext;