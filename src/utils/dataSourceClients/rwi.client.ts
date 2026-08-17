import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import logger from '../logger.js';
import type { BoundingBox, PulledSignal } from '../../types/dataSourceClient.types.js';
import {
  getGridCellsInBoundingBox,
  isPointInGeoJsonPolygon,
  squaredDistance,
  type GridCellRow,
} from './gridCells.util.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// RWI is a static, versioned download (Meta / Humanitarian Data Exchange),
// not a live API — bundling it locally instead of fetching it means pulls
// are deterministic and offline. `period` is accepted for interface
// consistency with the other clients but unused: RWI has no time dimension
// upstream, so every period reads the same snapshot (confirm this against
// Doc 8-6 once a versioned-by-period RWI release strategy is decided).
const DATASET_PATH = path.join(__dirname, '../../data/rwi/eth_relative_wealth_index_addis.csv');

interface RwiPoint {
  latitude: number;
  longitude: number;
  rwi: number;
}

const parseCsv = (raw: string): RwiPoint[] => {
  const lines = raw.trim().split('\n');
  const [header, ...rows] = lines;
  const columns = header.split(',').map((c) => c.trim());
  const latIdx = columns.indexOf('latitude');
  const lngIdx = columns.indexOf('longitude');
  const rwiIdx = columns.indexOf('rwi');

  if (latIdx === -1 || lngIdx === -1 || rwiIdx === -1) {
    throw new Error('Malformed RWI dataset: missing required columns');
  }

  const points: RwiPoint[] = [];
  for (const row of rows) {
    if (!row.trim()) continue;
    const fields = row.split(',');
    const latitude = Number(fields[latIdx]);
    const longitude = Number(fields[lngIdx]);
    const rwi = Number(fields[rwiIdx]);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude) || !Number.isFinite(rwi)) {
      // Skip an individual bad row rather than fail the whole pull — one
      // corrupt line in a large static file shouldn't take down every cell.
      logger.warn({ row }, 'Skipping malformed RWI dataset row');
      continue;
    }
    points.push({ latitude, longitude, rwi });
  }
  return points;
};

const valueForCell = (cell: GridCellRow, points: RwiPoint[]): number | null => {
  const inside = points.filter((p) =>
    isPointInGeoJsonPolygon(p.latitude, p.longitude, cell.boundaryGeoJson),
  );
  if (inside.length > 0) {
    return inside.reduce((sum, p) => sum + p.rwi, 0) / inside.length;
  }

  // Fall back to the nearest RWI point when none fall exactly inside the
  // cell's polygon (RWI's native ~2.4km tiles won't always align with the
  // fixed grid's cell boundaries).
  let nearest: RwiPoint | null = null;
  let nearestDistSq = Infinity;
  for (const p of points) {
    const distSq = squaredDistance(cell.centroidLat, cell.centroidLng, p.latitude, p.longitude);
    if (distSq < nearestDistSq) {
      nearestDistSq = distSq;
      nearest = p;
    }
  }
  return nearest ? nearest.rwi : null;
};

export const pull = async (boundingBox: BoundingBox, _period: string): Promise<PulledSignal[]> => {
  const cells = await getGridCellsInBoundingBox(boundingBox);
  if (cells.length === 0) return [];

  const raw = await readFile(DATASET_PATH, 'utf-8');
  const points = parseCsv(raw);
  if (points.length === 0) return [];

  const results: PulledSignal[] = [];
  for (const cell of cells) {
    const rawValue = valueForCell(cell, points);
    if (rawValue !== null) {
      results.push({ cellId: cell.id, rawValue });
    }
  }
  return results;
};
