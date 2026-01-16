// =====================================================
// OCCUPANCY HELPERS
// Utilities for calculating and displaying property occupancy
// =====================================================

import { Property, Tenant, PropertyOccupancy } from '../types';

/**
 * Calculate occupancy information for a property
 */
export function calculatePropertyOccupancy(
  property: Property,
  tenants: Tenant[]
): PropertyOccupancy {
  // Filter active tenants for this property
  const activeTenants = tenants.filter(
    (t) => t.propertyId === property.id && t.status === 'active'
  );

  // For HMO properties
  if (property.isHMO && property.units && property.units.length > 0) {
    const totalCapacity = property.units.length;
    
    // Count unique occupied units (in case multiple tenants somehow assigned to same unit)
    const occupiedUnits = new Set(
      activeTenants
        .filter((t) => t.hmoUnitName)
        .map((t) => t.hmoUnitName)
    ).size;
    
    const vacantCount = totalCapacity - occupiedUnits;
    const occupancyRate = totalCapacity > 0 
      ? Math.round((occupiedUnits / totalCapacity) * 100) 
      : 0;
    const vacancyRate = 100 - occupancyRate;

    let occupancyStatus: 'vacant' | 'occupied' | 'partially_occupied';
    if (occupiedUnits === 0) {
      occupancyStatus = 'vacant';
    } else if (occupiedUnits === totalCapacity) {
      occupancyStatus = 'occupied';
    } else {
      occupancyStatus = 'partially_occupied';
    }

    return {
      type: 'hmo',
      totalCapacity,
      occupiedCount: occupiedUnits,
      vacantCount,
      occupancyRate,
      vacancyRate,
      occupancyStatus,
    };
  }

  // For standard properties (non-HMO)
  const isOccupied = activeTenants.length > 0;
  
  return {
    type: 'standard',
    totalCapacity: 1,
    occupiedCount: isOccupied ? 1 : 0,
    occupancyRate: isOccupied ? 100 : 0,
    vacancyRate: isOccupied ? 0 : 100,
    occupancyStatus: isOccupied ? 'occupied' : 'vacant',
  };
}

/**
 * Get formatted occupancy display string
 * Examples: "Vacant", "Occupied", "1 of 4 occupied"
 */
export function getOccupancyDisplayText(occupancy: PropertyOccupancy): string {
  if (occupancy.type === 'standard') {
    return occupancy.occupancyStatus === 'occupied' ? 'Occupied' : 'Vacant';
  }

  // For HMO properties
  if (occupancy.occupiedCount === 0) {
    return 'Vacant';
  }
  
  if (occupancy.occupiedCount === occupancy.totalCapacity) {
    return 'Fully Occupied';
  }

  return `${occupancy.occupiedCount} of ${occupancy.totalCapacity} occupied`;
}

/**
 * Get short occupancy display (e.g., "1/4" for HMOs)
 */
export function getOccupancyShortText(occupancy: PropertyOccupancy): string {
  if (occupancy.type === 'standard') {
    return occupancy.occupancyStatus === 'occupied' ? '1/1' : '0/1';
  }

  return `${occupancy.occupiedCount}/${occupancy.totalCapacity}`;
}

/**
 * Get occupancy status badge color
 */
export function getOccupancyStatusColor(
  status: 'vacant' | 'occupied' | 'partially_occupied'
): string {
  switch (status) {
    case 'vacant':
      return 'gray';
    case 'occupied':
      return 'green';
    case 'partially_occupied':
      return 'yellow';
    default:
      return 'gray';
  }
}

/**
 * Get available units in an HMO property
 */
export function getAvailableHMOUnits(
  property: Property,
  tenants: Tenant[]
): string[] {
  if (!property.isHMO || !property.units) {
    return [];
  }

  // Get occupied unit names
  const occupiedUnits = new Set(
    tenants
      .filter(
        (t) =>
          t.propertyId === property.id &&
          t.status === 'active' &&
          t.hmoUnitName
      )
      .map((t) => t.hmoUnitName!)
  );

  // Return units that are not occupied
  return property.units
    .map((unit) => unit.name)
    .filter((unitName) => !occupiedUnits.has(unitName));
}

/**
 * Get occupied units with tenant information
 */
export function getOccupiedUnitsWithTenants(
  property: Property,
  tenants: Tenant[]
): Array<{ unitName: string; tenant: Tenant }> {
  if (!property.isHMO) {
    return [];
  }

  return tenants
    .filter(
      (t) =>
        t.propertyId === property.id &&
        t.status === 'active' &&
        t.hmoUnitName
    )
    .map((tenant) => ({
      unitName: tenant.hmoUnitName!,
      tenant,
    }));
}

/**
 * Check if a specific HMO unit is available
 */
export function isHMOUnitAvailable(
  property: Property,
  unitName: string,
  tenants: Tenant[]
): boolean {
  if (!property.isHMO) {
    return false;
  }

  // Check if unit exists in property
  const unitExists = property.units?.some((unit) => unit.name === unitName);
  if (!unitExists) {
    return false;
  }

  // Check if unit is occupied
  const isOccupied = tenants.some(
    (t) =>
      t.propertyId === property.id &&
      t.status === 'active' &&
      t.hmoUnitName === unitName
  );

  return !isOccupied;
}

/**
 * Get occupancy status badge text
 */
export function getOccupancyStatusBadge(
  status: 'vacant' | 'occupied' | 'partially_occupied'
): string {
  switch (status) {
    case 'vacant':
      return 'Vacant';
    case 'occupied':
      return 'Occupied';
    case 'partially_occupied':
      return 'Partially Occupied';
    default:
      return 'Unknown';
  }
}

/**
 * Calculate portfolio-wide occupancy statistics
 */
export function calculatePortfolioOccupancy(
  properties: Property[],
  tenants: Tenant[]
): {
  totalProperties: number;
  totalCapacity: number; // Total units/properties
  totalOccupied: number;
  totalVacant: number;
  occupancyRate: number;
  vacancyRate: number;
  hmoCount: number;
  hmoCapacity: number;
  hmoOccupied: number;
  standardCount: number;
  standardOccupied: number;
} {
  let totalCapacity = 0;
  let totalOccupied = 0;
  let hmoCount = 0;
  let hmoCapacity = 0;
  let hmoOccupied = 0;
  let standardCount = 0;
  let standardOccupied = 0;

  properties.forEach((property) => {
    const occupancy = calculatePropertyOccupancy(property, tenants);
    
    totalCapacity += occupancy.totalCapacity;
    totalOccupied += occupancy.occupiedCount;

    if (occupancy.type === 'hmo') {
      hmoCount++;
      hmoCapacity += occupancy.totalCapacity;
      hmoOccupied += occupancy.occupiedCount;
    } else {
      standardCount++;
      if (occupancy.occupiedCount > 0) {
        standardOccupied++;
      }
    }
  });

  const totalVacant = totalCapacity - totalOccupied;
  const occupancyRate = totalCapacity > 0 
    ? Math.round((totalOccupied / totalCapacity) * 100) 
    : 0;
  const vacancyRate = 100 - occupancyRate;

  return {
    totalProperties: properties.length,
    totalCapacity,
    totalOccupied,
    totalVacant,
    occupancyRate,
    vacancyRate,
    hmoCount,
    hmoCapacity,
    hmoOccupied,
    standardCount,
    standardOccupied,
  };
}

