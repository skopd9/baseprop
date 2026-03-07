import { describe, expect, it } from 'vitest';
import {
  getOccupancyDisplay,
  validatePropertyData,
  type SimplifiedProperty,
  type SimplifiedTenant,
} from './simplifiedDataTransforms';

function makeProperty(overrides: Partial<SimplifiedProperty> = {}): SimplifiedProperty {
  return {
    id: 'property-1',
    propertyReference: 101,
    countryCode: 'UK',
    address: '1 Test Street',
    propertyType: 'house',
    bedrooms: 3,
    bathrooms: 2,
    targetRent: 2000,
    tenantCount: 0,
    status: 'under_management',
    units: 1,
    ...overrides,
  };
}

function makeTenant(overrides: Partial<SimplifiedTenant> = {}): SimplifiedTenant {
  return {
    id: 'tenant-1',
    name: 'Alex Tenant',
    phone: '',
    email: 'alex@example.com',
    propertyId: 'property-1',
    propertyAddress: '1 Test Street',
    monthlyRent: 1000,
    rentStatus: 'current',
    depositAmount: 1000,
    ...overrides,
  };
}

describe('getOccupancyDisplay', () => {
  it('returns sold status for sold properties even when tenants exist', () => {
    const property = makeProperty({ status: 'sold' });
    const tenant = makeTenant({ propertyId: property.id });

    const result = getOccupancyDisplay(property, [tenant]);

    expect(result).toMatchObject({
      status: 'sold',
      label: 'Sold',
      tenantInfo: null,
    });
  });

  it('counts unique HMO rooms for partially occupied labels', () => {
    const property = makeProperty({
      id: 'hmo-1',
      propertyType: 'hmo',
      units: 3,
      unitDetails: [
        { name: 'Room 1', area: 10, targetRent: 600 },
        { name: 'Room 2', area: 12, targetRent: 650 },
        { name: 'Room 3', area: 11, targetRent: 625 },
      ],
    });

    const tenants = [
      makeTenant({ id: 't1', propertyId: 'hmo-1', roomName: 'Room 1' }),
      makeTenant({ id: 't2', propertyId: 'hmo-1', roomName: 'Room 1' }),
      makeTenant({ id: 't3', propertyId: 'hmo-1', roomName: 'Room 2' }),
      makeTenant({ id: 't4', propertyId: 'other-property', roomName: 'Room 3' }),
    ];

    const result = getOccupancyDisplay(property, tenants);

    expect(result.status).toBe('partially_occupied');
    expect(result.label).toBe('Partially Occupied (2/3)');
    expect(result.occupancyDetails).toEqual({
      type: 'hmo',
      totalUnits: 3,
      occupiedUnits: 2,
      vacantUnits: 1,
    });
  });
});

describe('validatePropertyData', () => {
  it('flags over-capacity when units are provided as an array', () => {
    const property = makeProperty({
      units: [{ name: 'Unit A' }, { name: 'Unit B' }],
      tenantCount: 9,
    });

    const errors = validatePropertyData(property);

    expect(errors).toContain('Too many tenants for the number of units available');
  });

  it('allows capacity boundary when tenant count equals maximum', () => {
    const property = makeProperty({
      units: [{ name: 'Unit A' }, { name: 'Unit B' }],
      tenantCount: 8,
    });

    const errors = validatePropertyData(property);

    expect(errors).not.toContain('Too many tenants for the number of units available');
  });
});
