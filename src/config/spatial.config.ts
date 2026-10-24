import { BoundingBox } from '../types/dataSourceClient.types.js';

export interface SpatialRegionConfig {
  regionId: string;
  name: string;
  boundingBox: BoundingBox;
  nativeResolutionMeters: number;
  center: {
    lat: number;
    lng: number;
  };
}

const defaultMinLat = Number(process.env.SPATIAL_MIN_LAT || 8.8);
const defaultMinLng = Number(process.env.SPATIAL_MIN_LNG || 38.6);
const defaultMaxLat = Number(process.env.SPATIAL_MAX_LAT || 9.1);
const defaultMaxLng = Number(process.env.SPATIAL_MAX_LNG || 38.95);

export const DEFAULT_BOUNDING_BOX: BoundingBox = {
  minLat: defaultMinLat,
  minLng: defaultMinLng,
  maxLat: defaultMaxLat,
  maxLng: defaultMaxLng,
};

export const primaryRegionConfig: SpatialRegionConfig = {
  regionId: process.env.SPATIAL_REGION_ID || 'primary-study-zone',
  name: process.env.SPATIAL_REGION_NAME || 'Primary Metropolitan Area',
  boundingBox: DEFAULT_BOUNDING_BOX,
  nativeResolutionMeters: Number(process.env.SPATIAL_RESOLUTION_METERS || 2400),
  center: {
    lat: Number(((defaultMinLat + defaultMaxLat) / 2).toFixed(6)),
    lng: Number(((defaultMinLng + defaultMaxLng) / 2).toFixed(6)),
  },
};

/**
 * Checks whether coordinates fall within the configured region bounds.
 */
export const isPointWithinBounds = (
  lat: number,
  lng: number,
  box: BoundingBox = DEFAULT_BOUNDING_BOX,
): boolean => {
  return lat >= box.minLat && lat <= box.maxLat && lng >= box.minLng && lng <= box.maxLng;
};
