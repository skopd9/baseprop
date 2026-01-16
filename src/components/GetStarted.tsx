import React from 'react';
import { PortfolioOnboardingWizard } from './PortfolioOnboardingWizard';
import { SimplifiedProperty, SimplifiedTenant } from '../utils/simplifiedDataTransforms';

interface GetStartedProps {
  properties: SimplifiedProperty[];
  tenants: SimplifiedTenant[];
  onAddProperty: (property: SimplifiedProperty) => void;
  onAddTenant: (tenant: SimplifiedTenant) => void;
  onViewRent: () => void;
  onViewInspections: () => void;
  onComplete?: () => void;
}

export const GetStarted: React.FC<GetStartedProps> = ({
  properties,
  tenants,
  onAddProperty,
  onAddTenant,
  onViewRent,
  onViewInspections,
  onComplete
}) => {
  return (
    <PortfolioOnboardingWizard
      properties={properties}
      tenants={tenants}
      onPropertyAdded={onAddProperty}
      onTenantAdded={onAddTenant}
      onComplete={onComplete}
    />
  );
};

