import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { QuickStartGuide } from '../QuickStartGuide';

const buildProps = (overrides?: Partial<React.ComponentProps<typeof QuickStartGuide>>) => ({
  properties: [],
  tenants: [],
  onAddProperty: vi.fn(),
  onAddTenant: vi.fn(),
  onViewRent: vi.fn(),
  onViewInspections: vi.fn(),
  ...overrides,
});

describe('QuickStartGuide', () => {
  it('gates onboarding actions when no properties or tenants exist', () => {
    const props = buildProps();
    render(<QuickStartGuide {...props} />);

    expect(screen.getByText('0 of 4 completed')).toBeInTheDocument();

    const addPropertyButton = screen.getByRole('button', { name: 'Add Property' });
    fireEvent.click(addPropertyButton);
    expect(props.onAddProperty).toHaveBeenCalledTimes(1);

    expect(screen.getByRole('button', { name: 'Add Tenant' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Manage Rent' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'View Inspections' })).toBeDisabled();
  });

  it('treats zero rent as incomplete rent setup', () => {
    render(
      <QuickStartGuide
        {...buildProps({
          properties: [{ id: 'p-1' }],
          tenants: [{ id: 't-1', monthlyRent: 0 }],
        })}
      />
    );

    expect(screen.getByText('2 of 4 completed')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Manage Rent' })).toBeEnabled();
  });

  it('marks rent setup complete when any tenant has positive monthly rent', () => {
    render(
      <QuickStartGuide
        {...buildProps({
          properties: [{ id: 'p-1' }],
          tenants: [{ id: 't-1', monthlyRent: 1200 }],
        })}
      />
    );

    expect(screen.getByText('3 of 4 completed')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Manage Rent' })).not.toBeInTheDocument();
  });

  it('does not show removed demo data CTA copy', () => {
    render(<QuickStartGuide {...buildProps()} />);

    expect(screen.queryByText('Want to explore first?')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Try Demo Data' })).not.toBeInTheDocument();
  });
});
