import React, { useState } from 'react';
import { QuestionMarkCircleIcon } from '@heroicons/react/24/outline';

interface HelpTooltipProps {
  content: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  content,
  position = 'top'
}) => {
  const [isVisible, setIsVisible] = useState(false);

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 transform -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 transform -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 transform -translate-y-1/2 ml-2';
      default: // top
        return 'bottom-full left-1/2 transform -translate-x-1/2 mb-2';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'bottom':
        return 'bottom-full left-1/2 transform -translate-x-1/2 border-b-gray-800 border-b-4 border-x-transparent border-x-4 border-t-0';
      case 'left':
        return 'left-full top-1/2 transform -translate-y-1/2 border-l-gray-800 border-l-4 border-y-transparent border-y-4 border-r-0';
      case 'right':
        return 'right-full top-1/2 transform -translate-y-1/2 border-r-gray-800 border-r-4 border-y-transparent border-y-4 border-l-0';
      default: // top
        return 'top-full left-1/2 transform -translate-x-1/2 border-t-gray-800 border-t-4 border-x-transparent border-x-4 border-b-0';
    }
  };

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        className="text-gray-400 hover:text-gray-600 focus:outline-none focus:text-gray-600"
      >
        <QuestionMarkCircleIcon className="w-4 h-4" />
      </button>
      
      {isVisible && (
        <div className={`absolute z-10 ${getPositionClasses()}`}>
          <div className="bg-gray-800 text-white text-xs rounded-md py-2 px-3 max-w-xs whitespace-normal">
            {content}
            <div className={`absolute w-0 h-0 ${getArrowClasses()}`}></div>
          </div>
        </div>
      )}
    </div>
  );
};