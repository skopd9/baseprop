import React from 'react';
import { QuickStartGuide } from './QuickStartGuide';
import { SimplifiedProperty, SimplifiedTenant } from '../utils/simplifiedDataTransforms';

interface GetStartedProps {
  properties: SimplifiedProperty[];
  tenants: SimplifiedTenant[];
  onAddProperty: () => void;
  onAddTenant: () => void;
  onViewRent: () => void;
  onViewInspections: () => void;
  onLoadDemoData?: () => void;
  isLoadingDemo?: boolean;
}

export const GetStarted: React.FC<GetStartedProps> = ({
  properties,
  tenants,
  onAddProperty,
  onAddTenant,
  onViewRent,
  onViewInspections,
  onLoadDemoData,
  isLoadingDemo
}) => {
  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <QuickStartGuide
          properties={properties}
          tenants={tenants}
          onAddProperty={onAddProperty}
          onAddTenant={onAddTenant}
          onViewRent={onViewRent}
          onViewInspections={onViewInspections}
          onLoadDemoData={onLoadDemoData}
          isLoadingDemo={isLoadingDemo}
        />
      </div>
    </div>
  );
};

