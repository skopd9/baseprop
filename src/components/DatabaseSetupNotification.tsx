import React, { useState } from 'react';
import { 
  ExclamationTriangleIcon, 
  XMarkIcon,
  InformationCircleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

interface DatabaseSetupNotificationProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export const DatabaseSetupNotification: React.FC<DatabaseSetupNotificationProps> = ({
  isVisible,
  onDismiss
}) => {
  const [showDetails, setShowDetails] = useState(false);

  if (!isVisible) return null;

  return (
    <div className="fixed top-4 right-4 max-w-md bg-white border border-yellow-200 rounded-lg shadow-lg z-50">
      <div className="p-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <InformationCircleIcon className="h-5 w-5 text-blue-400" />
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-gray-900">
              Onboarding System Ready
            </h3>
            <div className="mt-2 text-sm text-gray-600">
              <p>
                The tenant onboarding system is running in <strong>mock mode</strong>. 
                Your data will be stored temporarily in memory.
              </p>
            </div>
            
            {showDetails && (
              <div className="mt-3 text-sm text-gray-600">
                <div className="bg-gray-50 rounded-md p-3">
                  <h4 className="font-medium text-gray-900 mb-2">To enable database storage:</h4>
                  <ol className="list-decimal list-inside space-y-1 text-xs">
                    <li>Go to your Supabase dashboard</li>
                    <li>Open the SQL Editor</li>
                    <li>Run <code className="bg-gray-200 px-1 rounded">add_tenant_onboarding_table.sql</code></li>
                    <li>Run <code className="bg-gray-200 px-1 rounded">fix_tenant_table_structure.sql</code></li>
                    <li>Refresh this page</li>
                  </ol>
                  <div className="mt-2 flex items-center text-green-600">
                    <CheckCircleIcon className="h-4 w-4 mr-1" />
                    <span className="text-xs">Mock mode works perfectly for testing!</span>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-3 flex space-x-2">
              <button
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs text-blue-600 hover:text-blue-500 font-medium"
              >
                {showDetails ? 'Hide Details' : 'Setup Instructions'}
              </button>
              <button
                onClick={onDismiss}
                className="text-xs text-gray-500 hover:text-gray-400 font-medium"
              >
                Dismiss
              </button>
            </div>
          </div>
          <div className="ml-4 flex-shrink-0">
            <button
              onClick={onDismiss}
              className="bg-white rounded-md inline-flex text-gray-400 hover:text-gray-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <XMarkIcon className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};