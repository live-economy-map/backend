import type { BoundingBox, PulledSignal } from '../../types/dataSourceClient.types.js';
import { getGridCellsInBoundingBox, isPointInGeoJsonPolygon } from './gridCells.util.js';

const GDELT_GEO_ENDPOINT = 'https://api.gdeltproject.org/api/v2/geo/geo';

// GDELT GEO 2.0 is a live-monitoring feed, not a historical archive — it
// can only ever query a window ending "now", going back at most 7 days
// (enforced via the TIMESPAN parameter, not STARTDATETIME/ENDDATETIME —
// those belong to a different GDELT API with different semantics).
const GDELT_MAX_LOOKBACK_DAYS = 7;

interface GdeltGeoJsonResponse {
  type: string;
  features: Array<{
    type: string;
    geometry: { type: string; coordinates: [number, number] };
    properties?: Record<string, unknown>;
  }>;
}

const isGdeltGeoJsonResponse = (value: unknown): value is GdeltGeoJsonResponse =>
  typeof value === 'object' &&
  value !== null &&
  Array.isArray((value as { features?: unknown }).features);

/**
 * GDELT GEO can only ever answer "what's happened in the last N days up to
 * right now" — there's no way to query an arbitrary past window that
 * doesn't end at the current moment. Returns how many days back to search
 * (capped at GDELT_MAX_LOOKBACK_DAYS), or null if the requested period
 * doesn't overlap the fixed [now - 7d, now] window at all.
 */
const resolveTimespanDays = (period: string): number | null => {
  const requestedStart = new Date(`${period}T00:00:00Z`);
  const requestedEnd = new Date(
    Date.UTC(requestedStart.getUTCFullYear(), requestedStart.getUTCMonth() + 1, 1),
  );

  const now = new Date();
  const coverageStart = new Date(now.getTime() - GDELT_MAX_LOOKBACK_DAYS * 24 * 60 * 60 * 1000);

  if (requestedEnd <= coverageStart || requestedStart > now) return null;

  const effectiveStart = requestedStart > coverageStart ? requestedStart : coverageStart;
  const daysBack = Math.ceil((now.getTime() - effectiveStart.getTime()) / (24 * 60 * 60 * 1000));
  return Math.min(Math.max(daysBack, 1), GDELT_MAX_LOOKBACK_DAYS);
};

const buildUrl = (timespanDays: number): string => {
  const params = new URLSearchParams({
    // Spatial filtering happens client-side via isPointInGeoJsonPolygon
    // below — GEO 2.0's query language has no native bbox/lat-lng filter,
    // only keyword/phrase/domain/sourcelang/theme/etc operators.
    query: 'sourcelang:eng',
    format: 'geojson',
    mode: 'PointData',
    timespan: `${timespanDays}d`,
    // Restrict to precise city/landmark-level coordinates, excluding
    // vague country/ADM1-level mentions that would false-match onto
    // whichever grid cell happens to contain that broad centroid.
    geores: '2',
    maxpoints: '1000',
  });

  return `${GDELT_GEO_ENDPOINT}?${params.toString()}`;
};

/**
 * Pulls GDELT event/location density per grid cell — used only as
 * reference/corroborating evidence (never part of the composite score;
 * see Doc 4). Cells with zero matching events are omitted rather than
 * reported as 0, since GDELT coverage is inherently sparse and "no data"
 * is meaningfully different from "confirmed zero activity".
 *
 * Returns [] immediately, without any network call, if the requested
 * period falls entirely outside GDELT's rolling coverage window — GDELT
 * simply has no data for that period, this isn't an error condition.
 * This is a free, keyless public endpoint — no API key is sent or needed.
 */
export const pull = async (boundingBox: BoundingBox, period: string): Promise<PulledSignal[]> => {
  const cells = await getGridCellsInBoundingBox(boundingBox);
  if (cells.length === 0) return [];

  const timespanDays = resolveTimespanDays(period);
  if (timespanDays === null) return [];

  const response = await fetch(buildUrl(timespanDays));

  if (!response.ok) {
    throw new Error(`GDELT request failed with status ${response.status}`);
  }

  const body: unknown = await response.json();
  if (!isGdeltGeoJsonResponse(body)) {
    throw new Error('Malformed GDELT response: expected a GeoJSON FeatureCollection');
  }

  const counts = new Map<string, number>();
  for (const feature of body.features) {
    const coords = feature.geometry?.coordinates;
    if (!Array.isArray(coords) || coords.length !== 2) continue;
    const [lng, lat] = coords;

    const cell = cells.find((c) => isPointInGeoJsonPolygon(lat, lng, c.boundaryGeoJson));
    if (!cell) continue;

    counts.set(cell.id, (counts.get(cell.id) ?? 0) + 1);
  }

  return Array.from(counts.entries()).map(([cellId, rawValue]) => ({ cellId, rawValue }));
};
