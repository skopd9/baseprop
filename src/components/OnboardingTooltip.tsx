import React, { useState } from 'react';
import { InformationCircleIcon, XMarkIcon } from '@heroicons/react/24/outline';

interface OnboardingTooltipProps {
  title: string;
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
  showOnFirstVisit?: boolean;
  storageKey?: string;
}

export const OnboardingTooltip: React.FC<OnboardingTooltipProps> = ({
  title,
  content,
  position = 'top',
  showOnFirstVisit = true,
  storageKey
}) => {
  const [isVisible, setIsVisible] = useState(() => {
    if (!showOnFirstVisit || !storageKey) return false;
    return !localStorage.getItem(storageKey);
  });

  const handleDismiss = () => {
    setIsVisible(false);
    if (storageKey) {
      localStorage.setItem(storageKey, 'dismissed');
    }
  };

  if (!isVisible) return null;

  const positionClasses = {
    top: 'bottom-full left-1/2 transform -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 transform -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 transform -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 transform -translate-y-1/2 ml-2'
  };

  const arrowClasses = {
    top: 'top-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-blue-600',
    bottom: 'bottom-full left-1/2 transform -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-blue-600',
    left: 'left-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-blue-600',
    right: 'right-full top-1/2 transform -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-blue-600'
  };

  return (
    <div className="relative inline-block">
      <div className={`absolute z-50 ${positionClasses[position]}`}>
        <div className="bg-blue-600 text-white p-4 rounded-lg shadow-lg max-w-xs">
          <div className="flex items-start justify-between mb-2">
            <h4 className="font-medium text-sm">{title}</h4>
            <button
              onClick={handleDismiss}
              className="ml-2 text-blue-200 hover:text-white"
            >
              <XMarkIcon className="w-4 h-4" />
            </button>
          </div>
          <p className="text-sm text-blue-100">{content}</p>
        </div>
        <div className={`absolute w-0 h-0 border-4 ${arrowClasses[position]}`} />
      </div>
    </div>
  );
};

// Helper component for showing info tooltips on hover
export const InfoTooltip: React.FC<{ content: string }> = ({ content }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        className="text-gray-400 hover:text-gray-600"
      >
        <InformationCircleIcon className="w-4 h-4" />
      </button>
      
      {isVisible && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 z-50">
          <div className="bg-gray-900 text-white p-2 rounded text-xs max-w-xs">
            {content}
          </div>
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-l-transparent border-r-transparent border-t-gray-900" />
        </div>
      )}
    </div>
  );
};