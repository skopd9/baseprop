import { describe, expect, it } from 'vitest';
import {
  getOccupancyDisplay,
  getOccupancyStatus,
  validatePropertyData,
  type SimplifiedProperty,
  type SimplifiedTenant,
} from './simplifiedDataTransforms';

const makeProperty = (overrides: Partial<SimplifiedProperty> = {}): SimplifiedProperty => ({
  id: 'property-1',
  propertyReference: 101,
  countryCode: 'UK',
  address: '1 Test Street',
  propertyType: 'flat',
  bedrooms: 2,
  bathrooms: 1,
  targetRent: 1500,
  tenantCount: 0,
  status: 'under_management',
  units: 1,
  ...overrides,
});

const makeTenant = (overrides: Partial<SimplifiedTenant> = {}): SimplifiedTenant => ({
  id: 'tenant-1',
  name: 'Alex Tenant',
  phone: '+447700900123',
  email: 'alex@example.com',
  propertyId: 'property-1',
  propertyAddress: '1 Test Street',
  monthlyRent: 1500,
  rentStatus: 'current',
  depositAmount: 1500,
  ...overrides,
});

describe('simplifiedDataTransforms occupancy helpers', () => {
  it('treats sold properties as vacant even when tenant records exist', () => {
    const property = makeProperty({ status: 'sold' });
    const tenants = [makeTenant({ propertyId: property.id })];

    expect(getOccupancyStatus(property, tenants)).toBe('vacant');
    expect(getOccupancyDisplay(property, tenants)).toMatchObject({
      status: 'sold',
      label: 'Sold',
      tenantInfo: null,
    });
  });

  it('counts unique HMO rooms for partial occupancy labels', () => {
    const property = makeProperty({
      propertyType: 'hmo',
      units: 3,
      unitDetails: [
        { name: 'Room 1', area: 12, targetRent: 700 },
        { name: 'Room 2', area: 13, targetRent: 710 },
        { name: 'Room 3', area: 14, targetRent: 720 },
      ],
    });
    const tenants = [
      makeTenant({ id: 't1', roomName: 'Room 1' }),
      makeTenant({ id: 't2', roomName: 'Room 1' }),
      makeTenant({ id: 't3', roomName: 'Room 2' }),
    ];

    const display = getOccupancyDisplay(property, tenants);

    expect(display).toMatchObject({
      status: 'partially_occupied',
      label: 'Partially Occupied (2/3)',
      occupancyDetails: {
        totalUnits: 3,
        occupiedUnits: 2,
        vacantUnits: 1,
      },
    });
  });

  it('formats occupied standard properties with correct pluralization', () => {
    const property = makeProperty();
    const tenants = [
      makeTenant({ id: 'tenant-a' }),
      makeTenant({ id: 'tenant-b' }),
    ];

    expect(getOccupancyDisplay(property, tenants)).toMatchObject({
      status: 'occupied',
      label: 'Occupied (2 tenants)',
    });
  });

  it('safely handles non-array tenant inputs as empty', () => {
    const property = makeProperty();
    const invalidTenants = null as unknown as SimplifiedTenant[];

    expect(getOccupancyStatus(property, invalidTenants)).toBe('vacant');
  });
});

describe('validatePropertyData', () => {
  it('enforces tenant capacity when units are represented as an array', () => {
    const property = makeProperty({
      propertyType: 'hmo',
      units: [{ name: 'Room 1' }, { name: 'Room 2' }],
      tenantCount: 9,
    });

    expect(validatePropertyData(property)).toContain(
      'Too many tenants for the number of units available'
    );
  });
});
