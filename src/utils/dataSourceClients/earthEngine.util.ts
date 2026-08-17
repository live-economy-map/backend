import ee from '@google/earthengine';
import { env } from '../../config/env.js';
import type { GridCellRow } from './gridCells.util.js';

let readyPromise: Promise<void> | null = null;

/**
 * Authenticates + initializes the Earth Engine client exactly once per
 * process, then reuses the same connection for every subsequent pull.
 * GOOGLE_EARTH_ENGINE_CREDENTIALS is expected to hold a service-account
 * JSON key (as a string) — confirm against the actual credential format
 * used in deployment; a raw API token would need a different auth call.
 */
export const getReadyEarthEngine = (): Promise<void> => {
  if (!readyPromise) {
    readyPromise = new Promise<void>((resolve, reject) => {
      let privateKey: object;
      let projectId: string;
      try {
        const parsed = JSON.parse(env.GOOGLE_EARTH_ENGINE_CREDENTIALS) as {
          project_id?: string;
          [key: string]: unknown;
        };
        if (!parsed.project_id) {
          reject(new Error('GOOGLE_EARTH_ENGINE_CREDENTIALS is missing project_id'));
          return;
        }
        privateKey = parsed;
        projectId = parsed.project_id;
      } catch {
        reject(new Error('GOOGLE_EARTH_ENGINE_CREDENTIALS is not valid service-account JSON'));
        return;
      }

      ee.data.authenticateViaPrivateKey(
        privateKey,
        () => {
          ee.initialize(
            null,
            null,
            () => resolve(),
            (err: unknown) => reject(err instanceof Error ? err : new Error(String(err))),
            null,
            projectId,
          );
        },
        (err: unknown) => reject(err instanceof Error ? err : new Error(String(err))),
      );
    }).catch((err) => {
      // Don't cache a failed init — the next pull should retry rather than
      // permanently fail every call for the lifetime of the process.
      readyPromise = null;
      throw err;
    });
  }
  return readyPromise;
};

/**
 * Reduces one EE image down to a single mean value per grid cell, using
 * each cell's own polygon (not the whole bounding box) as the reduction
 * region so results reflect the cell's actual footprint.
 */
export const reduceImagePerCell = async (
  image: ee.Image,
  cells: GridCellRow[],
  scaleMeters: number,
): Promise<{ cellId: string; rawValue: number }[]> => {
  await getReadyEarthEngine();

  const evaluations = cells.map(
    (cell) =>
      new Promise<{ cellId: string; rawValue: number } | null>((resolve, reject) => {
        const geometry = ee.Geometry(cell.boundaryGeoJson);
        const reduced = image.reduceRegion({
          reducer: ee.Reducer.mean(),
          geometry,
          scale: scaleMeters,
          maxPixels: 1e9,
        });

        reduced.evaluate((result: Record<string, number | null> | null, error?: string) => {
          if (error) {
            reject(new Error(error));
            return;
          }
          if (!result || typeof result !== 'object') {
            reject(new Error('Malformed Earth Engine reduceRegion response'));
            return;
          }
          const [value] = Object.values(result);
          // No band value at all (vs. a band value of 0) means this cell had
          // no coverage for the period — omit it rather than fabricate a 0.
          if (value === null || value === undefined) {
            resolve(null);
            return;
          }
          resolve({ cellId: cell.id, rawValue: value });
        });
      }),
  );

  const settled = await Promise.all(evaluations);
  return settled.filter((v): v is { cellId: string; rawValue: number } => v !== null);
};
