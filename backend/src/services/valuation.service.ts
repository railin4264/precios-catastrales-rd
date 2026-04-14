import { ImpactFactor } from '@prisma/client';
import { prisma } from '../config/prisma';

// Haversine formula to calculate distance between two points in KM
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

export interface ValuationOutput {
  baseValue: number;
  projectedValue: number;
  totalAdjustment: number;
  appliedFactors: {
    name: string;
    type: string;
    distance: number;
    impact: number;
    latitude: number;
    longitude: number;
    impactScore: number;
  }[];
}

export const calculateProjectedValue = async (
  lat: number,
  lng: number,
  baseValue: number
): Promise<ValuationOutput> => {
  // Pre-filter with a bounding box (~50 km max radius) to avoid loading all factors
  const MAX_RADIUS_KM = 50;
  const KM_PER_DEG_LAT = 111.0;
  const kmPerDegLng = Math.cos((lat * Math.PI) / 180) * 111.0;
  const latDelta = MAX_RADIUS_KM / KM_PER_DEG_LAT;
  const lngDelta = MAX_RADIUS_KM / kmPerDegLng;

  const allFactors = await prisma.impactFactor.findMany({
    where: {
      latitude:  { gte: lat - latDelta, lte: lat + latDelta },
      longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
    },
  });

  const appliedFactors: any[] = [];
  let totalMultiplier = 1.0;

  for (const factor of allFactors) {
    if (factor.latitude === null || factor.longitude === null) continue;

    const distance = getDistance(lat, lng, factor.latitude, factor.longitude);

    if (distance <= factor.radiusKm) {
      // Calculate impact with a simple linear decay: closer means more impact
      // multiplier = 1 + (score - 1) * (1 - distance/radius)
      const intensity = 1 - (distance / factor.radiusKm);
      const factorImpact = 1 + (factor.impactScore - 1) * intensity;
      
      totalMultiplier *= factorImpact;
      
      appliedFactors.push({
        name: factor.name,
        type: factor.type,
        distance: Math.round(distance * 100) / 100,
        impact: Math.round((factorImpact - 1) * 100 * 100) / 100, // as percentage
        latitude: factor.latitude,
        longitude: factor.longitude,
        impactScore: factor.impactScore
      });
    }
  }

  const projectedValue = baseValue * totalMultiplier;

  return {
    baseValue,
    projectedValue: Math.round(projectedValue * 100) / 100,
    totalAdjustment: Math.round((totalMultiplier - 1) * 100 * 100) / 100,
    appliedFactors
  };
};
