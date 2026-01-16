import React, { useState, useEffect } from 'react';
import {
  DocumentTextIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  TrashIcon,
  ArrowDownTrayIcon,
  ExclamationTriangleIcon,
  FolderIcon,
} from '@heroicons/react/24/outline';
import { TenantDocumentService } from '../services/TenantDocumentService';
import {
  TenantDocument,
  TenantDocumentRequirement,
  CountryCode,
  DocumentType,
  getDocumentStatusColor,
  getDocumentStatusLabel,
  formatFileSize,
} from '../types/tenantDocuments';

interface TenantDocumentsManagerProps {
  tenantId: string;
  propertyId: string;
  countryCode: CountryCode;
  onDocumentsChange?: () => void;
}

export const TenantDocumentsManager: React.FC<TenantDocumentsManagerProps> = ({
  tenantId,
  propertyId,
  countryCode,
  onDocumentsChange,
}) => {
  const [documents, setDocuments] = useState<TenantDocument[]>([]);
  const [requirements, setRequirements] = useState<TenantDocumentRequirement[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [completionPercentage, setCompletionPercentage] = useState(0);
  const [uploadingType, setUploadingType] = useState<DocumentType | null>(null);

  useEffect(() => {
    loadDocuments();
  }, [tenantId, countryCode]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const [docs, reqs, completion] = await Promise.all([
        TenantDocumentService.getTenantDocuments(tenantId),
        TenantDocumentService.getDocumentRequirements(countryCode),
        TenantDocumentService.getDocumentCompletionPercentage(tenantId, countryCode),
      ]);
      
      setDocuments(docs);
      setRequirements(reqs);
      setCompletionPercentage(completion);
    } catch (err) {
      console.error('Error loading documents:', err);
      setError('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (
    file: File,
    requirement: TenantDocumentRequirement
  ) => {
    try {
      setUploading(true);
      setUploadingType(requirement.documentType);
      setError(null);

      // Calculate expiry date if document can expire
      let expiryDate: string | undefined;
      if (requirement.canExpire && requirement.typicalExpiryYears) {
        const expiry = new Date();
        expiry.setFullYear(expiry.getFullYear() + requirement.typicalExpiryYears);
        expiryDate = expiry.toISOString().split('T')[0];
      }

      await TenantDocumentService.uploadDocument({
        tenantId,
        propertyId,
        countryCode,
        documentType: requirement.documentType,
        documentName: requirement.documentLabel,
        description: requirement.description,
        file,
        expiryDate,
        relatedTo: 'tenant',
      });

      setSuccessMessage(`${requirement.documentLabel} uploaded successfully!`);
      await loadDocuments();
      
      if (onDocumentsChange) {
        onDocumentsChange();
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error uploading document:', err);
      setError(`Failed to upload ${requirement.documentLabel}`);
    } finally {
      setUploading(false);
      setUploadingType(null);
    }
  };

  const handleDownload = async (document: TenantDocument) => {
    try {
      const url = await TenantDocumentService.getDocumentDownloadUrl(document.id);
      window.open(url, '_blank');
    } catch (err) {
      console.error('Error downloading document:', err);
      setError('Failed to download document');
    }
  };

  const handleVerify = async (documentId: string) => {
    try {
      await TenantDocumentService.updateDocumentStatus(
        documentId,
        'verified',
        'current-user@example.com', // TODO: Get from auth context
        'Document verified'
      );
      setSuccessMessage('Document verified successfully!');
      await loadDocuments();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error verifying document:', err);
      setError('Failed to verify document');
    }
  };

  const handleDelete = async (document: TenantDocument) => {
    if (!confirm(`Are you sure you want to delete ${document.documentName}?`)) {
      return;
    }

    try {
      await TenantDocumentService.deleteDocument(document.id);
      setSuccessMessage('Document deleted successfully');
      await loadDocuments();
      
      if (onDocumentsChange) {
        onDocumentsChange();
      }

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Error deleting document:', err);
      setError('Failed to delete document');
    }
  };

  const getDocumentsForType = (documentType: DocumentType): TenantDocument[] => {
    return documents.filter((doc) => doc.documentType === documentType);
  };

  const isDocumentExpiringSoon = (document: TenantDocument): boolean => {
    if (!document.expiryDate) return false;
    const expiry = new Date(document.expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.floor(
      (expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  };

  const isDocumentExpired = (document: TenantDocument): boolean => {
    if (!document.expiryDate) return false;
    return new Date(document.expiryDate) < new Date();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with completion status */}
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-sm font-semibold text-gray-900 flex items-center">
            <FolderIcon className="w-5 h-5 mr-2 text-gray-600" />
            Tenant Documents
          </h3>
          <span className="text-xs text-gray-500">
            {countryCode === 'UK' ? '🇬🇧 UK' : countryCode === 'GR' ? '🇬🇷 Greece' : '🇺🇸 USA'}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="mb-2">
          <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
            <span>Completion</span>
            <span className="font-medium">{completionPercentage}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${
                completionPercentage === 100
                  ? 'bg-green-500'
                  : completionPercentage >= 50
                  ? 'bg-blue-500'
                  : 'bg-yellow-500'
              }`}
              style={{ width: `${completionPercentage}%` }}
            />
          </div>
        </div>

        {completionPercentage === 100 && (
          <p className="text-xs text-green-700 flex items-center">
            <CheckCircleIcon className="w-4 h-4 mr-1" />
            All required documents uploaded
          </p>
        )}
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="p-3 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm flex items-center">
          <CheckCircleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
          {successMessage}
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm flex items-center">
          <XCircleIcon className="w-5 h-5 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Document List */}
      <div className="space-y-3">
        {requirements.map((requirement) => {
          const docsForType = getDocumentsForType(requirement.documentType);
          const hasDocument = docsForType.length > 0;
          const latestDoc = docsForType[0]; // Most recent

          return (
            <div
              key={requirement.id}
              className={`border rounded-lg p-4 ${
                hasDocument
                  ? 'border-gray-200 bg-white'
                  : requirement.isRequired
                  ? 'border-orange-200 bg-orange-50'
                  : 'border-gray-200 bg-gray-50'
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <h4 className="text-sm font-medium text-gray-900">
                      {requirement.documentLabel}
                    </h4>
                    {requirement.isRequired && (
                      <span className="text-xs text-red-600">*Required</span>
                    )}
                    {requirement.canExpire && (
                      <span className="text-xs text-gray-500 flex items-center">
                        <ClockIcon className="w-3 h-3 mr-1" />
                        Expires
                      </span>
                    )}
                  </div>

                  {requirement.description && (
                    <p className="text-xs text-gray-500 mb-2">
                      {requirement.description}
                    </p>
                  )}

                  {/* Show uploaded documents */}
                  {hasDocument && (
                    <div className="space-y-2 mt-3">
                      {docsForType.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between bg-gray-50 rounded p-2 border border-gray-200"
                        >
                          <div className="flex items-center space-x-3 flex-1">
                            <DocumentTextIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {doc.fileName}
                              </p>
                              <div className="flex items-center space-x-2 text-xs text-gray-500">
                                {doc.fileSize && (
                                  <span>{formatFileSize(doc.fileSize)}</span>
                                )}
                                {doc.uploadedAt && (
                                  <span>
                                    • Uploaded{' '}
                                    {new Date(doc.uploadedAt).toLocaleDateString()}
                                  </span>
                                )}
                                {doc.expiryDate && (
                                  <span
                                    className={
                                      isDocumentExpired(doc)
                                        ? 'text-red-600 font-medium'
                                        : isDocumentExpiringSoon(doc)
                                        ? 'text-orange-600 font-medium'
                                        : ''
                                    }
                                  >
                                    • Expires{' '}
                                    {new Date(doc.expiryDate).toLocaleDateString()}
                                    {isDocumentExpired(doc) && ' (EXPIRED)'}
                                    {isDocumentExpiringSoon(doc) &&
                                      !isDocumentExpired(doc) &&
                                      ' (Soon)'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 ml-2">
                            {/* Status Badge */}
                            <span
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getDocumentStatusColor(
                                doc.status
                              )}`}
                            >
                              {getDocumentStatusLabel(doc.status)}
                            </span>

                            {/* Action Buttons */}
                            <button
                              onClick={() => handleDownload(doc)}
                              className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                              title="Download"
                            >
                              <ArrowDownTrayIcon className="w-4 h-4" />
                            </button>

                            {doc.status === 'uploaded' && (
                              <button
                                onClick={() => handleVerify(doc.id)}
                                className="p-1 text-green-600 hover:bg-green-50 rounded"
                                title="Verify"
                              >
                                <CheckCircleIcon className="w-4 h-4" />
                              </button>
                            )}

                            <button
                              onClick={() => handleDelete(doc)}
                              className="p-1 text-red-600 hover:bg-red-50 rounded"
                              title="Delete"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Upload Button */}
                <div className="ml-4 flex-shrink-0">
                  <label
                    className={`inline-flex items-center px-3 py-2 text-sm font-medium rounded-md cursor-pointer transition-colors ${
                      uploading && uploadingType === requirement.documentType
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : hasDocument
                        ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          handleFileUpload(file, requirement);
                        }
                        e.target.value = ''; // Reset input
                      }}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      disabled={uploading && uploadingType === requirement.documentType}
                    />
                    {uploading && uploadingType === requirement.documentType ? (
                      <>
                        <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div>
                        Uploading...
                      </>
                    ) : (
                      <>
                        <CloudArrowUpIcon className="w-4 h-4 mr-2" />
                        {hasDocument ? 'Replace' : 'Upload'}
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Expiry Warning */}
              {hasDocument && latestDoc && isDocumentExpiringSoon(latestDoc) && (
                <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700 flex items-start">
                  <ExclamationTriangleIcon className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span>
                    This document is expiring soon. Please upload a new version.
                  </span>
                </div>
              )}

              {hasDocument && latestDoc && isDocumentExpired(latestDoc) && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start">
                  <XCircleIcon className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                  <span>This document has expired. Please upload a new version.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Info Footer */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
        <div className="flex items-start">
          <DocumentTextIcon className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium mb-1">Accepted formats:</p>
            <p>PDF, JPG, PNG, DOC, DOCX (max 50MB)</p>
          </div>
        </div>
      </div>
    </div>
  );
};

