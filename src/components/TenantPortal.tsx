import React, { useState, useEffect } from 'react';
import { 
  DocumentTextIcon,
  DownloadIcon,
  EyeIcon,
  CheckCircleIcon,
  ClockIcon,
  HomeIcon,
  UserIcon,
  EnvelopeIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';
import { TenantOnboarding } from './TenantOnboardingWorkflow';
import { TenantOnboardingService } from '../services/TenantOnboardingService';

interface TenantPortalProps {
  tenantId: string;
  tenantEmail: string;
}

interface TenantDocument {
  id: string;
  title: string;
  type: 'agreement' | 'certificate' | 'guide' | 'inventory' | 'other';
  status: 'pending' | 'ready' | 'signed';
  uploadedAt?: Date;
  signedAt?: Date;
  downloadUrl?: string;
  requiresSignature: boolean;
}

export const TenantPortal: React.FC<TenantPortalProps> = ({
  tenantId,
  tenantEmail
}) => {
  const [onboarding, setOnboarding] = useState<TenantOnboarding | null>(null);
  const [documents, setDocuments] = useState<TenantDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTenantData();
  }, [tenantId]);

  const loadTenantData = async () => {
    setLoading(true);
    try {
      // Load onboarding data
      const onboardings = await TenantOnboardingService.getTenantOnboardingsByTenant(tenantId);
      if (onboardings.length > 0) {
        const latestOnboarding = onboardings.sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];
        setOnboarding(latestOnboarding);
      }

      // Mock documents - in real implementation, these would come from database
      const mockDocuments: TenantDocument[] = [
        {
          id: '1',
          title: 'Tenancy Agreement',
          type: 'agreement',
          status: 'ready',
          requiresSignature: true,
          uploadedAt: new Date(),
          downloadUrl: '#'
        },
        {
          id: '2',
          title: 'Gas Safety Certificate',
          type: 'certificate',
          status: 'ready',
          requiresSignature: false,
          uploadedAt: new Date(),
          downloadUrl: '#'
        },
        {
          id: '3',
          title: 'Electrical Safety Certificate (EICR)',
          type: 'certificate',
          status: 'ready',
          requiresSignature: false,
          uploadedAt: new Date(),
          downloadUrl: '#'
        },
        {
          id: '4',
          title: 'Energy Performance Certificate',
          type: 'certificate',
          status: 'ready',
          requiresSignature: false,
          uploadedAt: new Date(),
          downloadUrl: '#'
        },
        {
          id: '5',
          title: 'How to Rent Guide',
          type: 'guide',
          status: 'ready',
          requiresSignature: false,
          uploadedAt: new Date(),
          downloadUrl: '#'
        },
        {
          id: '6',
          title: 'Property Inventory',
          type: 'inventory',
          status: 'pending',
          requiresSignature: true
        }
      ];

      setDocuments(mockDocuments);
    } catch (error) {
      console.error('Error loading tenant data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDocumentAction = (document: TenantDocument, action: 'view' | 'download' | 'sign') => {
    switch (action) {
      case 'view':
        // Open document viewer
        window.open(document.downloadUrl, '_blank');
        break;
      case 'download':
        // Download document
        if (document.downloadUrl) {
          const link = document.createElement('a');
          link.href = document.downloadUrl;
          link.download = document.title;
          link.click();
        }
        break;
      case 'sign':
        // Open signing interface
        alert('Digital signing interface would open here');
        break;
    }
  };

  const getDocumentIcon = (type: string) => {
    return <DocumentTextIcon className="w-5 h-5 text-blue-600" />;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready': return 'text-green-600 bg-green-100';
      case 'signed': return 'text-blue-600 bg-blue-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ready': return <CheckCircleIcon className="w-4 h-4" />;
      case 'signed': return <CheckCircleIcon className="w-4 h-4" />;
      case 'pending': return <ClockIcon className="w-4 h-4" />;
      default: return <ClockIcon className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your tenant portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <HomeIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Tenant Portal</h1>
                <p className="text-sm text-gray-500">{tenantEmail}</p>
              </div>
            </div>
            
            <div className="text-right">
              <p className="text-sm text-gray-600">Welcome to your tenant portal</p>
              <p className="text-xs text-gray-500">Access your documents and tenancy information</p>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Property Information */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Property Information</h2>
              
              {onboarding && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Address</label>
                    <p className="text-sm text-gray-900">{onboarding.propertyAddress}</p>
                    {onboarding.unitNumber && (
                      <p className="text-sm text-gray-600">{onboarding.unitNumber}</p>
                    )}
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Move-in Date</label>
                    <p className="text-sm text-gray-900">
                      {onboarding.targetMoveInDate ? 
                        new Date(onboarding.targetMoveInDate).toLocaleDateString() : 
                        'To be confirmed'
                      }
                    </p>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700">Onboarding Status</label>
                    <div className="mt-1">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(onboarding.status)}`}>
                        {getStatusIcon(onboarding.status)}
                        <span className="ml-1 capitalize">{onboarding.status.replace('_', ' ')}</span>
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Contact Information */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">Need Help?</h2>
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">landlord@example.com</span>
                </div>
                <div className="flex items-center space-x-2">
                  <PhoneIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-sm text-gray-600">+44 20 1234 5678</span>
                </div>
              </div>
            </div>
          </div>

          {/* Documents */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">Your Documents</h2>
                <p className="text-sm text-gray-600 mt-1">
                  Access and manage your tenancy documents
                </p>
              </div>

              <div className="p-6">
                <div className="space-y-4">
                  {documents.map((document) => (
                    <div
                      key={document.id}
                      className="border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="flex-shrink-0">
                            {getDocumentIcon(document.type)}
                          </div>
                          <div>
                            <h3 className="text-sm font-medium text-gray-900">
                              {document.title}
                            </h3>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(document.status)}`}>
                                {getStatusIcon(document.status)}
                                <span className="ml-1 capitalize">{document.status}</span>
                              </span>
                              {document.requiresSignature && (
                                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-0.5 rounded">
                                  Signature Required
                                </span>
                              )}
                            </div>
                            {document.uploadedAt && (
                              <p className="text-xs text-gray-500 mt-1">
                                Available since {document.uploadedAt.toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-2">
                          {document.status === 'ready' && (
                            <>
                              <button
                                onClick={() => handleDocumentAction(document, 'view')}
                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                              >
                                <EyeIcon className="w-3 h-3 mr-1" />
                                View
                              </button>
                              <button
                                onClick={() => handleDocumentAction(document, 'download')}
                                className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50"
                              >
                                <DownloadIcon className="w-3 h-3 mr-1" />
                                Download
                              </button>
                              {document.requiresSignature && (
                                <button
                                  onClick={() => handleDocumentAction(document, 'sign')}
                                  className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-blue-600 hover:bg-blue-700"
                                >
                                  Sign Document
                                </button>
                              )}
                            </>
                          )}
                          {document.status === 'pending' && (
                            <span className="text-xs text-gray-500">
                              Document being prepared
                            </span>
                          )}
                          {document.status === 'signed' && (
                            <span className="text-xs text-green-600 font-medium">
                              ✓ Signed
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {documents.length === 0 && (
                  <div className="text-center py-8">
                    <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No documents yet</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Your documents will appear here once they're ready.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};