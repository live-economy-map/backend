import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { pull } from '../../../src/utils/dataSourceClients/gdelt.client.js';
import { prisma } from '../../../src/config/db.js';

vi.mock('../../../src/config/db.js');

global.fetch = vi.fn();

const GRID_CELLS = [
  {
    id: 'cell-1',
    centroidLat: 9.0,
    centroidLng: 38.75,
    boundaryGeoJson: {
      type: 'Polygon',
      coordinates: [
        [
          [38.74, 8.99],
          [38.76, 8.99],
          [38.76, 9.01],
          [38.74, 9.01],
          [38.74, 8.99],
        ],
      ],
    },
  },
];

beforeEach(() => {
  vi.clearAllMocks();
  // Pin "now" so `period` below always falls inside GDELT's rolling
  // 7-day coverage window, regardless of the real calendar date the
  // suite happens to run on.
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-06-05T12:00:00Z'));
  (prisma.gridCell.findMany as any).mockResolvedValue(GRID_CELLS);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('gdelt.client', () => {
  const boundingBox = { minLat: 8.9, maxLat: 9.1, minLng: 38.6, maxLng: 38.9 };
  const period = '2026-06-01';

  it('resolves an array of {cellId, rawValue} mapped from the GDELT REST response', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        type: 'FeatureCollection',
        features: [
          { type: 'Feature', geometry: { type: 'Point', coordinates: [38.75, 9.0] } },
          { type: 'Feature', geometry: { type: 'Point', coordinates: [38.75, 9.0] } },
          // Outside every known cell — should not contribute to any cellId.
          { type: 'Feature', geometry: { type: 'Point', coordinates: [40.0, 20.0] } },
        ],
      }),
    } as unknown as Response);

    const result = await pull(boundingBox, period);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([{ cellId: 'cell-1', rawValue: 2 }]);
  });

  it('propagates (does not swallow) a failed external call', async () => {
    vi.mocked(fetch).mockRejectedValueOnce(new Error('network error'));
    await expect(pull(boundingBox, period)).rejects.toThrow();
  });

  it('handles a malformed/incomplete provider response distinguishably from an empty result', async () => {
    vi.mocked(fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ unexpectedShape: true }),
    } as unknown as Response);

    await expect(pull(boundingBox, period)).rejects.toThrow();
  });

  it('resolves [] for an empty bounding box / no data in range', async () => {
    (prisma.gridCell.findMany as any).mockResolvedValue([]);
    const result = await pull(boundingBox, period);
    expect(result).toEqual([]);
    expect(fetch).not.toHaveBeenCalled();
  });
});
