import ee from '@google/earthengine';
import type { BoundingBox, PulledSignal } from '../../types/dataSourceClient.types.js';
import { getGridCellsInBoundingBox } from './gridCells.util.js';
import { reduceImagePerCell, getReadyEarthEngine } from './earthEngine.util.js';

export type { BoundingBox };
export type PulledCellValue = PulledSignal;

const VIIRS_COLLECTION = 'NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG';
const VIIRS_BAND = 'avg_rad';
// VIIRS DNB monthly composite native resolution is ~500m.
const VIIRS_SCALE_METERS = 500;

/**
 * Pulls mean night-time radiance (proxy for economic activity /
 * electrification) per grid cell for the given month.
 *
 * `period` follows the SignalValue convention: first day of the month
 * (e.g. "2026-06-01"). It's used as the start of a one-month EE date filter.
 */
export const pull = async (boundingBox: BoundingBox, period: string): Promise<PulledSignal[]> => {
  await getReadyEarthEngine();

  const cells = await getGridCellsInBoundingBox(boundingBox);
  if (cells.length === 0) return [];

  const start = ee.Date(period);
  const end = start.advance(1, 'month');

  const image = ee
    .ImageCollection(VIIRS_COLLECTION)
    .filterDate(start, end)
    .select(VIIRS_BAND)
    .mean();

  return reduceImagePerCell(image, cells, VIIRS_SCALE_METERS);
};
