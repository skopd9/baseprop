import { describe, expect, it } from 'vitest';
import {
  getOccupancyDisplay,
  getOccupancyStatus,
  SimplifiedProperty,
  SimplifiedTenant,
  transformToSimplifiedProperty,
  validateTenantAssignment,
} from './simplifiedDataTransforms';

const makeProperty = (
  overrides: Partial<SimplifiedProperty>
): SimplifiedProperty => ({
  id: 'property-default',
  propertyReference: 1,
  countryCode: 'UK',
  address: 'Default Address',
  propertyType: 'flat',
  bedrooms: 2,
  bathrooms: 1,
  targetRent: 1000,
  tenantCount: 0,
  status: 'under_management',
  units: 1,
  ...overrides,
});

let tenantIdCounter = 0;
const makeTenant = (overrides: Partial<SimplifiedTenant>): SimplifiedTenant => ({
  id: `tenant-${tenantIdCounter++}`,
  name: 'Tenant Name',
  phone: '',
  email: '',
  propertyId: 'property-default',
  propertyAddress: 'Default Address',
  monthlyRent: 1000,
  rentStatus: 'current',
  depositAmount: 0,
  ...overrides,
});

describe('transformToSimplifiedProperty', () => {
  it('prefers live tenant count and maps HMO fields', () => {
    const transformed = transformToSimplifiedProperty(
      {
        id: 'property-1',
        property_reference: 42,
        address: '12 Test Street',
        status: 'active',
        latitude: '51.509865',
        longitude: '-0.118092',
        property_data: {
          property_type: 'residential',
          property_sub_type: 'hmo',
          tenant_count: 1,
          rooms: [{ id: 'r1' }, { id: 'r2' }, { id: 'r3' }],
        },
      },
      5
    );

    expect(transformed.propertyType).toBe('hmo');
    expect(transformed.tenantCount).toBe(5);
    expect(transformed.units).toBe(3);
    expect(transformed.maxOccupancy).toBe(3);
    expect(transformed.latitude).toBe(51.509865);
    expect(transformed.longitude).toBe(-0.118092);
  });

  it('marks disposed properties as sold', () => {
    const transformed = transformToSimplifiedProperty({
      id: 'property-2',
      property_reference: 99,
      address: '9 Sold Road',
      status: 'disposed',
      property_data: {},
    });

    expect(transformed.status).toBe('sold');
  });
});

describe('validateTenantAssignment', () => {
  it('caps houses at 4 tenants per unit', () => {
    const errors = validateTenantAssignment(
      'p-1',
      'Unit A',
      [
        makeTenant({ propertyId: 'p-1', unitNumber: 'Unit A' }),
        makeTenant({ propertyId: 'p-1', unitNumber: 'Unit A' }),
        makeTenant({ propertyId: 'p-1', unitNumber: 'Unit A' }),
        makeTenant({ propertyId: 'p-1', unitNumber: 'Unit A' }),
      ],
      makeProperty({ propertyType: 'house' })
    );

    expect(errors).toEqual([
      'This unit is already at maximum capacity (4 tenants)',
    ]);
  });

  it('caps non-house properties at 2 tenants when unit is not specified', () => {
    const errors = validateTenantAssignment(
      'p-2',
      undefined,
      [makeTenant({ propertyId: 'p-2' }), makeTenant({ propertyId: 'p-2' })],
      makeProperty({ propertyType: 'flat' })
    );

    expect(errors).toEqual([
      'This property is already at maximum capacity (2 tenants)',
    ]);
  });
});

describe('getOccupancyStatus and getOccupancyDisplay', () => {
  it('treats sold properties as vacant regardless of active tenants', () => {
    const soldProperty = makeProperty({
      id: 'sold-1',
      status: 'sold',
      propertyType: 'flat',
    });

    expect(getOccupancyStatus(soldProperty, [makeTenant({ propertyId: 'sold-1' })])).toBe('vacant');

    expect(
      getOccupancyDisplay(soldProperty, [makeTenant({ propertyId: 'sold-1' })])
    ).toMatchObject({
      status: 'sold',
      label: 'Sold',
      tenantInfo: null,
    });
  });

  it('calculates unique room occupancy for HMOs', () => {
    const hmoProperty = makeProperty({
      id: 'hmo-1',
      status: 'under_management',
      propertyType: 'hmo',
      unitDetails: [{ name: 'Room 1', area: 0, targetRent: 0 }, { name: 'Room 2', area: 0, targetRent: 0 }, { name: 'Room 3', area: 0, targetRent: 0 }],
    });

    const display = getOccupancyDisplay(
      hmoProperty,
      [
        makeTenant({ propertyId: 'hmo-1', roomName: 'Room 1' }),
        makeTenant({ propertyId: 'hmo-1', roomName: 'Room 1' }),
        makeTenant({ propertyId: 'hmo-1', roomName: 'Room 2' }),
      ]
    );

    expect(display).toMatchObject({
      status: 'partially_occupied',
      label: 'Partially Occupied (2/3)',
      occupancyDetails: {
        type: 'hmo',
        totalUnits: 3,
        occupiedUnits: 2,
        vacantUnits: 1,
      },
    });
  });
});
