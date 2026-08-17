import { prisma } from '../../config/db.js';
import type { BoundingBox } from '../../types/dataSourceClient.types.js';

export interface GridCellRow {
  id: string;
  centroidLat: number;
  centroidLng: number;
  boundaryGeoJson: unknown;
}

/**
 * Grid cells are generated/seeded elsewhere (fixed Addis Ababa grid — see
 * schema.prisma GridCell comment / Doc 4). This helper never creates cells;
 * it only resolves the ones that already exist within a bounding box, which
 * is why an empty/unseeded grid correctly yields [] rather than an error.
 */
export const getGridCellsInBoundingBox = async (
  boundingBox: BoundingBox,
): Promise<GridCellRow[]> => {
  return prisma.gridCell.findMany({
    where: {
      centroidLat: { gte: boundingBox.minLat, lte: boundingBox.maxLat },
      centroidLng: { gte: boundingBox.minLng, lte: boundingBox.maxLng },
    },
    select: { id: true, centroidLat: true, centroidLng: true, boundaryGeoJson: true },
  });
};

/**
 * Ray-casting point-in-polygon test for a plain GeoJSON Polygon
 * ([[ [lng, lat], ... ]], first ring only — GridCell stores "no PostGIS in
 * V1" plain JSON, so there are no holes to account for). Returns false for
 * anything that isn't a well-formed Polygon, rather than throwing, so a
 * malformed boundary degrades to "point not in cell" instead of crashing
 * the whole pull.
 */
export const isPointInGeoJsonPolygon = (lat: number, lng: number, geoJson: unknown): boolean => {
  const ring = (geoJson as { coordinates?: number[][][] } | null)?.coordinates?.[0];
  if (!Array.isArray(ring) || ring.length < 3) return false;

  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersects = yi > lat !== yj > lat && lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersects) inside = !inside;
  }
  return inside;
};

/** Great-circle-ish flat-earth approximation, good enough at city scale for nearest-point lookups. */
export const squaredDistance = (aLat: number, aLng: number, bLat: number, bLng: number): number =>
  (aLat - bLat) ** 2 + (aLng - bLng) ** 2;
