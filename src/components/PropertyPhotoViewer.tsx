import React, { useState, useEffect } from 'react';
import {
  XMarkIcon,
  PhotoIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { PropertyPhotoService, PropertyPhoto } from '../services/PropertyPhotoService';

interface PropertyPhotoViewerProps {
  propertyId: string;
  propertyName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export const PropertyPhotoViewer: React.FC<PropertyPhotoViewerProps> = ({
  propertyId,
  propertyName,
  isOpen,
  onClose,
}) => {
  const [photos, setPhotos] = useState<PropertyPhoto[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load photos when modal opens
  useEffect(() => {
    if (isOpen && propertyId) {
      loadPhotos();
    } else {
      // Reset when modal closes
      setPhotos([]);
      setCurrentIndex(0);
      setError(null);
    }
  }, [isOpen, propertyId]);

  const loadPhotos = async () => {
    if (!propertyId) return;

    setLoading(true);
    setError(null);

    try {
      const propertyPhotos = await PropertyPhotoService.getPropertyPhotos(propertyId);
      setPhotos(propertyPhotos);
      
      // Find the primary photo index, or default to 0
      const primaryIndex = propertyPhotos.findIndex(photo => photo.isPrimary);
      setCurrentIndex(primaryIndex >= 0 ? primaryIndex : 0);
    } catch (err) {
      console.error('Error loading photos:', err);
      setError('Failed to load photos. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : photos.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < photos.length - 1 ? prev + 1 : 0));
  };

  const goToPhoto = (index: number) => {
    setCurrentIndex(index);
  };

  // Handle keyboard navigation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        goToPrevious();
      } else if (e.key === 'ArrowRight') {
        goToNext();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, photos.length]);

  if (!isOpen) return null;

  const currentPhoto = photos[currentIndex];
  const hasPhotos = photos.length > 0;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        className="relative bg-white rounded-lg shadow-xl max-w-6xl w-full mx-4 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <PhotoIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                {propertyName || 'Property Photos'}
              </h3>
              <p className="text-sm text-gray-500">
                {hasPhotos
                  ? `Photo ${currentIndex + 1} of ${photos.length}`
                  : 'No photos available'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-2 rounded-md hover:bg-gray-100"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <ArrowPathIcon className="w-12 h-12 text-gray-400 animate-spin mx-auto mb-4" />
                <p className="text-gray-500">Loading photos...</p>
              </div>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <button
                  onClick={loadPhotos}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : !hasPhotos ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <PhotoIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-2">No photos available</p>
                <p className="text-gray-400 text-sm">
                  Photos will appear here once uploaded
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* Main Photo Display */}
              <div className="flex-1 relative bg-gray-900 flex items-center justify-center overflow-hidden">
                {currentPhoto?.url ? (
                  <img
                    src={currentPhoto.url}
                    alt={currentPhoto.caption || `Photo ${currentIndex + 1}`}
                    className="max-w-full max-h-full object-contain"
                  />
                ) : (
                  <div className="text-center text-gray-400">
                    <PhotoIcon className="w-16 h-16 mx-auto mb-2" />
                    <p>Loading image...</p>
                  </div>
                )}

                {/* Navigation Arrows */}
                {photos.length > 1 && (
                  <>
                    <button
                      onClick={goToPrevious}
                      className="absolute left-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-3 rounded-full transition-all"
                      aria-label="Previous photo"
                    >
                      <ChevronLeftIcon className="w-6 h-6" />
                    </button>
                    <button
                      onClick={goToNext}
                      className="absolute right-4 top-1/2 -translate-y-1/2 bg-black bg-opacity-50 hover:bg-opacity-75 text-white p-3 rounded-full transition-all"
                      aria-label="Next photo"
                    >
                      <ChevronRightIcon className="w-6 h-6" />
                    </button>
                  </>
                )}

                {/* Primary Badge */}
                {currentPhoto?.isPrimary && (
                  <div className="absolute top-4 left-4 bg-blue-600 text-white px-3 py-1 rounded-md text-sm font-medium">
                    Primary Photo
                  </div>
                )}
              </div>

              {/* Thumbnail Strip */}
              {photos.length > 1 && (
                <div className="border-t border-gray-200 bg-gray-50 p-4">
                  <div className="flex space-x-2 overflow-x-auto pb-2">
                    {photos.map((photo, index) => (
                      <button
                        key={photo.id}
                        onClick={() => goToPhoto(index)}
                        className={`flex-shrink-0 w-20 h-20 rounded-md overflow-hidden border-2 transition-all ${
                          index === currentIndex
                            ? 'border-blue-600 ring-2 ring-blue-200'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        <img
                          src={photo.url || ''}
                          alt={`Thumbnail ${index + 1}`}
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Photo Info */}
              {currentPhoto && (
                <div className="border-t border-gray-200 p-4 bg-white">
                  <div className="flex items-center justify-between">
                    <div>
                      {currentPhoto.caption && (
                        <p className="text-sm font-medium text-gray-900">
                          {currentPhoto.caption}
                        </p>
                      )}
                      <p className="text-xs text-gray-500 mt-1">
                        {currentPhoto.fileName}
                        {currentPhoto.fileSize > 0 && (
                          <span className="ml-2">
                            • {(currentPhoto.fileSize / 1024 / 1024).toFixed(2)} MB
                          </span>
                        )}
                      </p>
                    </div>
                    {currentPhoto.uploadedAt && (
                      <p className="text-xs text-gray-400">
                        {new Date(currentPhoto.uploadedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

