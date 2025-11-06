import React, { useState } from 'react';
import { useOrganization } from '../contexts/OrganizationContext';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface CreateWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CreateWorkspaceModal: React.FC<CreateWorkspaceModalProps> = ({
  isOpen,
  onClose,
  onSuccess
}) => {
  const { createOrganization, switchOrganization, refreshOrganizations } = useOrganization();
  const [workspaceName, setWorkspaceName] = useState('');
  const [country, setCountry] = useState('UK');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!workspaceName.trim()) {
      setError('Workspace name is required');
      return;
    }

    setIsCreating(true);
    try {
      const settings = {
        country: country,
        default_currency: country === 'UK' ? 'GBP' : country === 'GR' ? 'EUR' : 'USD'
      };

      const newWorkspace = await createOrganization(workspaceName.trim(), settings);
      
      // Workspace is automatically switched by createOrganization
      
      // Reset form
      setWorkspaceName('');
      setCountry('UK');
      
      // Close modal and call success callback
      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      console.error('Error creating workspace:', err);
      setError(err.message || 'Failed to create workspace. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleClose = () => {
    if (!isCreating) {
      setWorkspaceName('');
      setCountry('UK');
      setError('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg w-full max-w-md shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Create New Workspace</h2>
          <button
            onClick={handleClose}
            disabled={isCreating}
            className="text-gray-400 hover:text-gray-600 disabled:opacity-50"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="workspace-name" className="block text-sm font-medium text-gray-700 mb-2">
                Workspace Name *
              </label>
              <input
                id="workspace-name"
                type="text"
                value={workspaceName}
                onChange={(e) => setWorkspaceName(e.target.value)}
                placeholder="e.g., My Properties, Company Name"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                disabled={isCreating}
                autoFocus
              />
              <p className="mt-1 text-xs text-gray-500">
                Choose a name that helps you identify this workspace
              </p>
            </div>

            <div>
              <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                Default Country
              </label>
              <select
                id="country"
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isCreating}
              >
                <option value="UK">United Kingdom</option>
                <option value="GR">Greece</option>
                <option value="US">United States</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                You can change this later in workspace settings
              </p>
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={handleClose}
              disabled={isCreating}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isCreating || !workspaceName.trim()}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isCreating ? 'Creating...' : 'Create Workspace'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

