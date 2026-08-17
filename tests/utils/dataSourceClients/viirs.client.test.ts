import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pull } from '../../../src/utils/dataSourceClients/viirs.client.js';
import { prisma } from '../../../src/config/db.js';
import ee from '@google/earthengine';

vi.mock('../../../src/config/db.js');

vi.mock('../../../src/config/env.js', () => ({
  env: {
    GOOGLE_EARTH_ENGINE_CREDENTIALS: JSON.stringify({
      type: 'service_account',
      project_id: 'test-project',
      client_email: 'test@example.com',
      private_key: 'test-key',
    }),
    GDELT_API_KEY: 'test',
  },
}));

vi.mock('@google/earthengine', () => {
  const chain: any = {
    filterDate: vi.fn(() => chain),
    filter: vi.fn(() => chain),
    select: vi.fn(() => chain),
    mean: vi.fn(() => chain),
    mosaic: vi.fn(() => chain),
    reduceRegion: vi.fn(),
  };
  const ee = {
    data: {
      authenticateViaPrivateKey: vi.fn((_key: unknown, onSuccess: () => void) => onSuccess()),
    },
    initialize: vi.fn((_a: unknown, _b: unknown, onSuccess: () => void) => onSuccess()),
    Date: vi.fn(() => ({ advance: vi.fn(() => 'end-date') })),
    Geometry: vi.fn((g: unknown) => g),
    ImageCollection: vi.fn(() => chain),
    Reducer: { mean: vi.fn() },
    Filter: { eq: vi.fn() },
  };
  return { default: ee };
});

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

const getChain = () => (ee as any).ImageCollection();

beforeEach(() => {
  vi.clearAllMocks();
  (prisma.gridCell.findMany as any).mockResolvedValue(GRID_CELLS);
  getChain().reduceRegion.mockReturnValue({
    evaluate: (cb: (result: unknown, error?: string) => void) => cb({ avg_rad: 12.3 }),
  });
});

describe('viirs.client', () => {
  const boundingBox = { minLat: 8.9, maxLat: 9.1, minLng: 38.6, maxLng: 38.9 };
  const period = '2026-06-01';

  it('resolves an array of {cellId, rawValue} mapped from the Earth Engine response', async () => {
    const result = await pull(boundingBox, period);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([{ cellId: 'cell-1', rawValue: 12.3 }]);
  });

  it('propagates (does not swallow) a failed external call', async () => {
    getChain().reduceRegion.mockReturnValue({
      evaluate: (cb: (result: unknown, error?: string) => void) => cb(null, 'Earth Engine error'),
    });
    await expect(pull(boundingBox, period)).rejects.toThrow();
  });

  it('handles a malformed/incomplete provider response distinguishably from an empty result', async () => {
    // A non-object/absent result (as opposed to an object with a null band
    // value, which means "no coverage at this cell" and is treated as a
    // valid empty signal) is treated as malformed and rejects.
    getChain().reduceRegion.mockReturnValue({
      evaluate: (cb: (result: unknown, error?: string) => void) => cb(undefined),
    });
    await expect(pull(boundingBox, period)).rejects.toThrow();
  });

  it('resolves [] for an empty bounding box / no data in range', async () => {
    (prisma.gridCell.findMany as any).mockResolvedValue([]);
    const result = await pull(boundingBox, period);
    expect(result).toEqual([]);
  });
});
