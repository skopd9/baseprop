import React, { useState, useCallback, useRef } from 'react';
import {
  XMarkIcon,
  DocumentTextIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
  ArrowPathIcon,
  CheckIcon,
  PencilIcon,
} from '@heroicons/react/24/outline';
import { LeaseParserService } from '../services/LeaseParserService';
import {
  ParsedLeaseData,
  LeaseParseResponse,
  SupportedLanguage,
  FieldConfidence,
  getConfidenceColor,
} from '../types/leaseParsing';

interface LeaseParserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataExtracted?: (data: ParsedLeaseData, confidence: Record<string, FieldConfidence>) => void;
  mode?: 'standalone' | 'tenant-form';
}

type ParseState = 'idle' | 'uploading' | 'parsing' | 'success' | 'error';

interface EditingField {
  fieldName: keyof ParsedLeaseData;
  value: string;
}

export const LeaseParserModal: React.FC<LeaseParserModalProps> = ({
  isOpen,
  onClose,
  onDataExtracted,
  mode = 'standalone',
}) => {
  const [parseState, setParseState] = useState<ParseState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [language, setLanguage] = useState<SupportedLanguage | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [parseResult, setParseResult] = useState<LeaseParseResponse | null>(null);
  const [editingField, setEditingField] = useState<EditingField | null>(null);
  const [editedValues, setEditedValues] = useState<Partial<ParsedLeaseData>>({});
  const [verifiedFields, setVerifiedFields] = useState<Set<string>>(new Set());
  const [rejectedFields, setRejectedFields] = useState<Set<string>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  const resetState = useCallback(() => {
    setParseState('idle');
    setSelectedFile(null);
    setLanguage('');
    setError(null);
    setParseResult(null);
    setEditingField(null);
    setEditedValues({});
    setVerifiedFields(new Set());
    setRejectedFields(new Set());
  }, []);

  const handleClose = useCallback(() => {
    resetState();
    onClose();
  }, [resetState, onClose]);

  const handleFileSelect = useCallback((file: File) => {
    const validation = LeaseParserService.validateFile(file);
    if (!validation.valid) {
      setError(validation.error || 'Invalid file');
      return;
    }

    setSelectedFile(file);
    setError(null);

    // Try to detect language from filename
    const detectedLang = LeaseParserService.detectLanguageFromFilename(file.name);
    if (detectedLang) {
      setLanguage(detectedLang);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const file = e.dataTransfer.files[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFileSelect(file);
      }
    },
    [handleFileSelect]
  );

  const handleParse = useCallback(async () => {
    if (!selectedFile) return;

    setParseState('parsing');
    setError(null);

    try {
      const result = await LeaseParserService.parseLeaseDocument(
        selectedFile,
        language || undefined
      );

      if (result.success) {
        setParseResult(result);
        setParseState('success');
      } else {
        // Show full error details including API response
        const errorMsg = result.details 
          ? `${result.error}\n\nDetails: ${typeof result.details === 'string' ? result.details : JSON.stringify(result.details)}`
          : result.error || 'Failed to parse document';
        setError(errorMsg);
        setParseState('error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setParseState('error');
    }
  }, [selectedFile, language]);

  const handleFieldEdit = useCallback(
    (fieldName: keyof ParsedLeaseData, currentValue: any) => {
      setEditingField({
        fieldName,
        value: String(currentValue ?? ''),
      });
    },
    []
  );

  const handleFieldEditSave = useCallback(() => {
    if (!editingField) return;

    const { fieldName, value } = editingField;
    setEditedValues((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
    setEditingField(null);
  }, [editingField]);

  const handleFieldEditCancel = useCallback(() => {
    setEditingField(null);
  }, []);

  const handleVerifyField = useCallback((fieldName: string) => {
    setVerifiedFields((prev) => {
      const newSet = new Set(prev);
      newSet.add(fieldName);
      return newSet;
    });
    setRejectedFields((prev) => {
      const newSet = new Set(prev);
      newSet.delete(fieldName);
      return newSet;
    });
  }, []);

  const handleRejectField = useCallback((fieldName: string) => {
    setRejectedFields((prev) => {
      const newSet = new Set(prev);
      newSet.add(fieldName);
      return newSet;
    });
    setVerifiedFields((prev) => {
      const newSet = new Set(prev);
      newSet.delete(fieldName);
      return newSet;
    });
  }, []);

  const handleUseData = useCallback(() => {
    if (!parseResult || !onDataExtracted) return;

    // Merge parsed data with edited values
    const finalData: ParsedLeaseData = {
      ...parseResult.data,
      ...editedValues,
    };

    // Remove rejected fields
    rejectedFields.forEach((field) => {
      delete finalData[field as keyof ParsedLeaseData];
    });

    onDataExtracted(finalData, parseResult.confidence);
    handleClose();
  }, [parseResult, editedValues, rejectedFields, onDataExtracted, handleClose]);

  const getFieldValue = useCallback(
    (fieldName: keyof ParsedLeaseData): any => {
      if (editedValues[fieldName] !== undefined) {
        return editedValues[fieldName];
      }
      return parseResult?.data[fieldName];
    },
    [editedValues, parseResult]
  );

  const renderConfidenceIndicator = (confidence: FieldConfidence) => {
    const colorClass = getConfidenceColor(confidence.level);
    const percentage = Math.round(confidence.confidence * 100);

    return (
      <span
        className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${colorClass}`}
        title={`Confidence: ${percentage}%`}
      >
        {confidence.level === 'high' && <CheckCircleIcon className="w-3 h-3 mr-1" />}
        {confidence.level === 'medium' && <ExclamationTriangleIcon className="w-3 h-3 mr-1" />}
        {confidence.level === 'low' && <XCircleIcon className="w-3 h-3 mr-1" />}
        {percentage}%
      </span>
    );
  };

  const renderFieldRow = (fieldName: keyof ParsedLeaseData, confidence: FieldConfidence) => {
    const value = getFieldValue(fieldName);
    const isEditing = editingField?.fieldName === fieldName;
    const isVerified = verifiedFields.has(fieldName);
    const isRejected = rejectedFields.has(fieldName);
    const displayName = LeaseParserService.getFieldDisplayName(fieldName);
    const formattedValue = LeaseParserService.formatFieldValue(
      fieldName,
      value,
      parseResult?.data.currency
    );

    if (value === undefined || value === null || value === '') {
      return null;
    }

    return (
      <tr
        key={fieldName}
        className={`
          ${isRejected ? 'bg-red-50 opacity-50' : ''}
          ${isVerified ? 'bg-green-50' : ''}
        `}
      >
        <td className="px-4 py-3 text-sm font-medium text-gray-900">
          {displayName}
        </td>
        <td className="px-4 py-3 text-sm text-gray-700">
          {isEditing ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={editingField.value}
                onChange={(e) =>
                  setEditingField({ ...editingField, value: e.target.value })
                }
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                autoFocus
              />
              <button
                onClick={handleFieldEditSave}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
              >
                <CheckIcon className="w-4 h-4" />
              </button>
              <button
                onClick={handleFieldEditCancel}
                className="p-1 text-gray-400 hover:bg-gray-50 rounded"
              >
                <XMarkIcon className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <span className={isRejected ? 'line-through' : ''}>
                {formattedValue}
              </span>
              <button
                onClick={() => handleFieldEdit(fieldName, value)}
                className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-50 rounded opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <PencilIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </td>
        <td className="px-4 py-3 text-sm">
          {renderConfidenceIndicator(confidence)}
        </td>
        <td className="px-4 py-3 text-sm">
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleVerifyField(fieldName)}
              className={`p-1 rounded transition-colors ${
                isVerified
                  ? 'bg-green-100 text-green-600'
                  : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
              }`}
              title="Accept this value"
            >
              <CheckIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleRejectField(fieldName)}
              className={`p-1 rounded transition-colors ${
                isRejected
                  ? 'bg-red-100 text-red-600'
                  : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
              }`}
              title="Reject this value"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={handleClose}
        />

        {/* Modal */}
        <div className="relative bg-white rounded-xl shadow-xl w-full max-w-3xl transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <DocumentTextIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Parse Lease Document
                </h2>
                <p className="text-sm text-gray-500">
                  Extract tenant and lease information automatically
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {parseState === 'idle' || parseState === 'error' ? (
              <>
                {/* Upload Zone */}
                <div
                  ref={dropZoneRef}
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => fileInputRef.current?.click()}
                  className={`
                    border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all
                    ${selectedFile ? 'border-blue-300 bg-blue-50' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'}
                  `}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileInputChange}
                    accept=".pdf,.jpg,.jpeg,.png,.tiff,.webp"
                    className="hidden"
                  />
                  
                  {selectedFile ? (
                    <div className="flex flex-col items-center">
                      <DocumentTextIcon className="w-12 h-12 text-blue-500 mb-3" />
                      <p className="text-sm font-medium text-gray-900">
                        {selectedFile.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="mt-3 text-sm text-blue-600 hover:text-blue-700"
                      >
                        Choose a different file
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center">
                      <CloudArrowUpIcon className="w-12 h-12 text-gray-400 mb-3" />
                      <p className="text-sm font-medium text-gray-900">
                        Drop your lease document here
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        or click to browse (PDF, JPG, PNG, TIFF)
                      </p>
                    </div>
                  )}
                </div>

                {/* Language Selection */}
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Document Language (optional)
                  </label>
                  <div className="flex gap-2">
                    {(['', 'en', 'bg', 'it'] as const).map((lang) => (
                      <button
                        key={lang || 'auto'}
                        onClick={() => setLanguage(lang)}
                        className={`
                          px-4 py-2 rounded-lg text-sm font-medium transition-colors
                          ${language === lang
                            ? 'bg-blue-100 text-blue-700 border-2 border-blue-300'
                            : 'bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200'
                          }
                        `}
                      >
                        {lang === '' ? 'Auto-detect' : LeaseParserService.getLanguageDisplayName(lang)}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Error Display */}
                {error && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                      <XCircleIcon className="w-5 h-5 text-red-500" />
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                )}

                {/* Parse Button */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleParse}
                    disabled={!selectedFile}
                    className={`
                      px-6 py-2.5 rounded-lg text-sm font-medium transition-colors
                      ${selectedFile
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }
                    `}
                  >
                    Parse Document
                  </button>
                </div>
              </>
            ) : parseState === 'parsing' ? (
              /* Parsing State */
              <div className="py-12 text-center">
                <ArrowPathIcon className="w-12 h-12 text-blue-500 mx-auto animate-spin" />
                <p className="mt-4 text-sm font-medium text-gray-900">
                  Parsing your document...
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  This may take a few seconds
                </p>
              </div>
            ) : parseState === 'success' && parseResult ? (
              /* Results View */
              <>
                {/* Summary */}
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                    <div>
                      <p className="text-sm font-medium text-green-800">
                        Document parsed successfully
                      </p>
                      <p className="text-xs text-green-600">
                        Processed in {parseResult.processingTimeMs}ms
                        {parseResult.documentLanguage && (
                          <> • Language: {LeaseParserService.getLanguageDisplayName(parseResult.documentLanguage as SupportedLanguage)}</>
                        )}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Extracted Fields Table */}
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Field
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Extracted Value
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Confidence
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {parseResult.confidence &&
                        Object.entries(parseResult.confidence)
                          .filter(([key]) => parseResult.data[key as keyof ParsedLeaseData] !== undefined)
                          .map(([key, conf]) =>
                            renderFieldRow(key as keyof ParsedLeaseData, conf as FieldConfidence)
                          )}
                    </tbody>
                  </table>
                </div>

                {/* Actions */}
                <div className="mt-6 flex items-center justify-between">
                  <button
                    onClick={resetState}
                    className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800"
                  >
                    Parse Another Document
                  </button>
                  <div className="flex gap-3">
                    <button
                      onClick={handleClose}
                      className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    {onDataExtracted && (
                      <button
                        onClick={handleUseData}
                        className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
                      >
                        {mode === 'tenant-form' ? 'Use Data to Fill Form' : 'Save Extracted Data'}
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
