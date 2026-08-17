import ee from '@google/earthengine';
import type { BoundingBox, PulledSignal } from '../../types/dataSourceClient.types.js';
import { getGridCellsInBoundingBox } from './gridCells.util.js';
import { reduceImagePerCell, getReadyEarthEngine } from './earthEngine.util.js';

// GHSL epochs are published every 5 years (not monthly), so `period` here is
// mapped down to the nearest published epoch rather than used as an exact
// date filter — confirm against the exact GHSL product/epoch set in use.
const GHSL_IMAGE_COLLECTION = 'JRC/GHSL/P2023A/GHS_BUILT_S';
const GHSL_BAND = 'built_surface';
const GHSL_SCALE_METERS = 100;
const GHSL_EPOCHS = [1975, 1980, 1985, 1990, 1995, 2000, 2005, 2010, 2015, 2020, 2025];

const nearestEpoch = (period: string): number => {
  const year = new Date(period).getUTCFullYear();
  return GHSL_EPOCHS.reduce((closest, epoch) =>
    Math.abs(epoch - year) < Math.abs(closest - year) ? epoch : closest,
  );
};

/**
 * Pulls mean built-up surface density (proxy for physical urban expansion)
 * per grid cell for the GHSL epoch nearest to the given period.
 */
export const pull = async (boundingBox: BoundingBox, period: string): Promise<PulledSignal[]> => {
  await getReadyEarthEngine();

  const cells = await getGridCellsInBoundingBox(boundingBox);
  if (cells.length === 0) return [];

  const epoch = nearestEpoch(period);
  const image = ee
    .ImageCollection(GHSL_IMAGE_COLLECTION)
    .filter(ee.Filter.eq('system:index', String(epoch)))
    .select(GHSL_BAND)
    .mosaic();

  return reduceImagePerCell(image, cells, GHSL_SCALE_METERS);
};
