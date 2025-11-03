import React from 'react';
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon } from '@heroicons/react/24/outline';
import { DocuSignService } from '../services/DocuSignService';

export const DocuSignConfigStatus: React.FC = () => {
  const isConfigured = DocuSignService.isConfigured();
  
  const integrationKey = import.meta.env.VITE_DOCUSIGN_INTEGRATION_KEY;
  const accountId = import.meta.env.VITE_DOCUSIGN_ACCOUNT_ID;
  const redirectUrl = import.meta.env.VITE_DOCUSIGN_REDIRECT_URL;

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <h3 className="font-semibold text-gray-900 mb-3 flex items-center">
        <InformationCircleIcon className="w-5 h-5 mr-2 text-blue-600" />
        DocuSign Configuration Status
      </h3>

      <div className="space-y-2">
        {/* Integration Key */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Integration Key:</span>
          <div className="flex items-center space-x-2">
            {integrationKey ? (
              <>
                <CheckCircleIcon className="w-4 h-4 text-green-600" />
                <span className="text-xs text-gray-500 font-mono">
                  {integrationKey.substring(0, 8)}...
                </span>
              </>
            ) : (
              <>
                <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                <span className="text-xs text-red-600">Not set</span>
              </>
            )}
          </div>
        </div>

        {/* Account ID */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Account ID:</span>
          <div className="flex items-center space-x-2">
            {accountId ? (
              <>
                <CheckCircleIcon className="w-4 h-4 text-green-600" />
                <span className="text-xs text-gray-500 font-mono">
                  {accountId.substring(0, 8)}...
                </span>
              </>
            ) : (
              <>
                <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                <span className="text-xs text-red-600">Not set</span>
              </>
            )}
          </div>
        </div>

        {/* Redirect URL */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-700">Redirect URL:</span>
          <div className="flex items-center space-x-2">
            {redirectUrl ? (
              <>
                <CheckCircleIcon className="w-4 h-4 text-green-600" />
                <span className="text-xs text-gray-500">{redirectUrl}</span>
              </>
            ) : (
              <>
                <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                <span className="text-xs text-red-600">Not set</span>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        {isConfigured ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-700">
                <p className="font-medium mb-1">Credentials configured - Demo mode active</p>
                <p className="text-xs">
                  OAuth 2.0 authentication needs to be implemented for production use.
                  {' '}
                  <button 
                    onClick={() => alert(DocuSignService.getConfigurationInstructions())}
                    className="underline hover:text-yellow-800"
                  >
                    View setup instructions
                  </button>
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
            <div className="flex items-start space-x-2">
              <InformationCircleIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Demo mode active</p>
                <p className="text-xs">
                  Add DocuSign credentials to .env file to enable production features.
                  See DOCUSIGN_SETUP_GUIDE.md for instructions.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 pt-3 border-t border-gray-200">
        <details className="text-xs text-gray-600">
          <summary className="cursor-pointer hover:text-gray-800 font-medium">
            Current Features
          </summary>
          <ul className="mt-2 space-y-1 ml-4">
            <li>✅ Envelope creation (simulated)</li>
            <li>✅ Signature workflow (simulated)</li>
            <li>✅ Status tracking</li>
            <li>✅ Auto-completion in 5 seconds (demo)</li>
            <li>⏳ Real DocuSign API calls (requires OAuth)</li>
            <li>⏳ Actual email sending (requires OAuth)</li>
            <li>⏳ Real signature collection (requires OAuth)</li>
          </ul>
        </details>
      </div>
    </div>
  );
};

