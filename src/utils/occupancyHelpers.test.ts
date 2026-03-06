import { describe, expect, it } from 'vitest';
import type { Property, Tenant } from '../types';
import {
  calculatePortfolioOccupancy,
  calculatePropertyOccupancy,
  getAvailableHMOUnits,
  getOccupancyDisplayText,
  getOccupancyShortText,
  getOccupiedUnitsWithTenants,
  isHMOUnitAvailable,
} from './occupancyHelpers';

const makeProperty = (overrides: Partial<Property> = {}): Property => ({
  id: 'property-1',
  propertyReference: 1,
  countryCode: 'UK',
  address: '1 Test Street',
  propertyType: 'flat',
  isHMO: false,
  agentManaged: false,
  status: 'vacant',
  tenantCount: 0,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const makeTenant = (overrides: Partial<Tenant> = {}): Tenant => ({
  id: 'tenant-1',
  propertyId: 'property-1',
  countryCode: 'UK',
  name: 'Test Tenant',
  rightToRentChecked: false,
  rentDueDay: 1,
  status: 'active',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('occupancyHelpers', () => {
  it('calculates HMO occupancy using unique active unit assignments only', () => {
    const property = makeProperty({
      id: 'hmo-1',
      isHMO: true,
      propertyType: 'hmo',
      units: [
        { name: 'Room A', area: 10, targetRent: 600 },
        { name: 'Room B', area: 12, targetRent: 650 },
        { name: 'Room C', area: 11, targetRent: 625 },
      ],
    });

    const tenants = [
      makeTenant({ id: 't-1', propertyId: 'hmo-1', hmoUnitName: 'Room A', status: 'active' }),
      makeTenant({ id: 't-2', propertyId: 'hmo-1', hmoUnitName: 'Room A', status: 'active' }),
      makeTenant({ id: 't-3', propertyId: 'hmo-1', hmoUnitName: 'Room B', status: 'inactive' }),
      makeTenant({ id: 't-4', propertyId: 'other-property', hmoUnitName: 'Room C', status: 'active' }),
    ];

    const occupancy = calculatePropertyOccupancy(property, tenants);

    expect(occupancy).toMatchObject({
      type: 'hmo',
      totalCapacity: 3,
      occupiedCount: 1,
      vacantCount: 2,
      occupancyRate: 33,
      vacancyRate: 67,
      occupancyStatus: 'partially_occupied',
    });
  });

  it('calculates standard property occupancy from active tenants only', () => {
    const property = makeProperty({ id: 'std-1', isHMO: false, propertyType: 'flat' });

    const occupancy = calculatePropertyOccupancy(property, [
      makeTenant({ id: 'active', propertyId: 'std-1', status: 'active' }),
      makeTenant({ id: 'inactive', propertyId: 'std-1', status: 'inactive' }),
    ]);

    expect(occupancy).toMatchObject({
      type: 'standard',
      totalCapacity: 1,
      occupiedCount: 1,
      occupancyRate: 100,
      vacancyRate: 0,
      occupancyStatus: 'occupied',
    });
    expect(getOccupancyDisplayText(occupancy)).toBe('Occupied');
    expect(getOccupancyShortText(occupancy)).toBe('1/1');
  });

  it('returns available HMO units excluding occupied active assignments', () => {
    const property = makeProperty({
      id: 'hmo-2',
      isHMO: true,
      propertyType: 'hmo',
      units: [
        { name: 'Room A', area: 10, targetRent: 600 },
        { name: 'Room B', area: 12, targetRent: 650 },
        { name: 'Room C', area: 11, targetRent: 625 },
      ],
    });

    const tenants = [
      makeTenant({ propertyId: 'hmo-2', status: 'active', hmoUnitName: 'Room A' }),
      makeTenant({ propertyId: 'hmo-2', status: 'inactive', hmoUnitName: 'Room B' }),
      makeTenant({ propertyId: 'other', status: 'active', hmoUnitName: 'Room C' }),
    ];

    expect(getAvailableHMOUnits(property, tenants)).toEqual(['Room B', 'Room C']);
  });

  it('reports whether a specific HMO unit can be assigned', () => {
    const property = makeProperty({
      id: 'hmo-3',
      isHMO: true,
      propertyType: 'hmo',
      units: [
        { name: 'Room A', area: 10, targetRent: 600 },
        { name: 'Room B', area: 12, targetRent: 650 },
      ],
    });

    const tenants = [
      makeTenant({ propertyId: 'hmo-3', status: 'active', hmoUnitName: 'Room A' }),
      makeTenant({ propertyId: 'hmo-3', status: 'inactive', hmoUnitName: 'Room B' }),
    ];

    expect(isHMOUnitAvailable(property, 'Room A', tenants)).toBe(false);
    expect(isHMOUnitAvailable(property, 'Room B', tenants)).toBe(true);
    expect(isHMOUnitAvailable(property, 'Room C', tenants)).toBe(false);
    expect(isHMOUnitAvailable(makeProperty({ isHMO: false }), 'Room A', tenants)).toBe(false);
  });

  it('returns occupied units with active tenant details', () => {
    const property = makeProperty({ id: 'hmo-4', isHMO: true, propertyType: 'hmo' });

    const tenants = [
      makeTenant({ id: 'active-1', propertyId: 'hmo-4', status: 'active', hmoUnitName: 'Room A' }),
      makeTenant({ id: 'inactive', propertyId: 'hmo-4', status: 'inactive', hmoUnitName: 'Room B' }),
      makeTenant({ id: 'no-unit', propertyId: 'hmo-4', status: 'active' }),
      makeTenant({ id: 'other-property', propertyId: 'other', status: 'active', hmoUnitName: 'Room C' }),
    ];

    expect(getOccupiedUnitsWithTenants(property, tenants)).toEqual([
      {
        unitName: 'Room A',
        tenant: expect.objectContaining({ id: 'active-1' }),
      },
    ]);
  });

  it('aggregates portfolio occupancy across mixed HMO and standard properties', () => {
    const properties = [
      makeProperty({
        id: 'hmo-portfolio',
        isHMO: true,
        propertyType: 'hmo',
        units: [
          { name: 'Room A', area: 10, targetRent: 600 },
          { name: 'Room B', area: 12, targetRent: 650 },
          { name: 'Room C', area: 11, targetRent: 625 },
        ],
      }),
      makeProperty({ id: 'std-occupied', isHMO: false, propertyType: 'house' }),
      makeProperty({ id: 'std-vacant', isHMO: false, propertyType: 'flat' }),
    ];

    const tenants = [
      makeTenant({ propertyId: 'hmo-portfolio', status: 'active', hmoUnitName: 'Room A' }),
      makeTenant({ propertyId: 'hmo-portfolio', status: 'active', hmoUnitName: 'Room B' }),
      makeTenant({ propertyId: 'std-occupied', status: 'active' }),
      makeTenant({ propertyId: 'std-vacant', status: 'inactive' }),
    ];

    expect(calculatePortfolioOccupancy(properties, tenants)).toMatchObject({
      totalProperties: 3,
      totalCapacity: 5,
      totalOccupied: 3,
      totalVacant: 2,
      occupancyRate: 60,
      vacancyRate: 40,
      hmoCount: 1,
      hmoCapacity: 3,
      hmoOccupied: 2,
      standardCount: 2,
      standardOccupied: 1,
    });
  });
});
