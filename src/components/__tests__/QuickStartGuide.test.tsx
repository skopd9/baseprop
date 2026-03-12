import { fireEvent, render, screen } from '@testing-library/react';
import { QuickStartGuide } from '../QuickStartGuide';

type Tenant = {
  monthlyRent?: number;
};

type RenderOptions = {
  properties?: Array<Record<string, unknown>>;
  tenants?: Tenant[];
};

const renderQuickStartGuide = ({ properties = [], tenants = [] }: RenderOptions = {}) => {
  const handlers = {
    onAddProperty: vi.fn(),
    onAddTenant: vi.fn(),
    onViewRent: vi.fn(),
    onViewInspections: vi.fn(),
  };

  render(
    <QuickStartGuide
      properties={properties}
      tenants={tenants}
      onAddProperty={handlers.onAddProperty}
      onAddTenant={handlers.onAddTenant}
      onViewRent={handlers.onViewRent}
      onViewInspections={handlers.onViewInspections}
    />
  );

  return handlers;
};

describe('QuickStartGuide', () => {
  it('shows onboarding dependency states and keeps demo CTA removed', () => {
    const handlers = renderQuickStartGuide();

    expect(screen.getByText('0 of 4 completed')).toBeInTheDocument();

    const addPropertyButton = screen.getByRole('button', { name: 'Add Property' });
    const addTenantButton = screen.getByRole('button', { name: 'Add Tenant' });
    const manageRentButton = screen.getByRole('button', { name: 'Manage Rent' });
    const viewInspectionsButton = screen.getByRole('button', { name: 'View Inspections' });

    expect(addPropertyButton).toBeEnabled();
    expect(addTenantButton).toBeDisabled();
    expect(manageRentButton).toBeDisabled();
    expect(viewInspectionsButton).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Try Demo Data' })).not.toBeInTheDocument();

    fireEvent.click(addPropertyButton);
    expect(handlers.onAddProperty).toHaveBeenCalledTimes(1);
  });

  it('marks rent setup complete only when tenant rent is positive', () => {
    const handlers = renderQuickStartGuide({
      properties: [{ id: 'p1' }],
      tenants: [{ monthlyRent: 0 }],
    });

    expect(screen.getByText('2 of 4 completed')).toBeInTheDocument();

    const manageRentButton = screen.getByRole('button', { name: 'Manage Rent' });
    expect(manageRentButton).toBeEnabled();

    fireEvent.click(manageRentButton);
    expect(handlers.onViewRent).toHaveBeenCalledTimes(1);
  });

  it('hides completed-step actions and keeps inspections action available', () => {
    const handlers = renderQuickStartGuide({
      properties: [{ id: 'p1' }],
      tenants: [{ monthlyRent: 1200 }],
    });

    expect(screen.getByText('3 of 4 completed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Property' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Add Tenant' })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Manage Rent' })).not.toBeInTheDocument();

    const viewInspectionsButton = screen.getByRole('button', { name: 'View Inspections' });
    expect(viewInspectionsButton).toBeEnabled();

    fireEvent.click(viewInspectionsButton);
    expect(handlers.onViewInspections).toHaveBeenCalledTimes(1);
  });
});
