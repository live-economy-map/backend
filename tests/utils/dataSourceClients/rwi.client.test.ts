import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pull } from '../../../src/utils/dataSourceClients/rwi.client.js';
import { prisma } from '../../../src/config/db.js';
import { readFile } from 'node:fs/promises';

vi.mock('../../../src/config/db.js');

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
}));

global.fetch = vi.fn();

const GOOD_CSV = [
  'quadkey,latitude,longitude,rwi,error',
  'q1,8.98,38.76,0.42,0.1',
  'q2,9.05,38.68,-0.12,0.1',
].join('\n');

// cell-1's polygon contains q1 (8.98, 38.76) but not q2.
const CELL_WITH_POINT_INSIDE = {
  id: 'cell-1',
  centroidLat: 8.98,
  centroidLng: 38.76,
  boundaryGeoJson: {
    type: 'Polygon',
    coordinates: [
      [
        [38.75, 8.97],
        [38.77, 8.97],
        [38.77, 8.99],
        [38.75, 8.99],
        [38.75, 8.97],
      ],
    ],
  },
};

// cell-2's polygon contains neither point — q2 is the nearer of the two to
// its centroid, so the nearest-point fallback should kick in.
const CELL_WITH_NO_POINT_INSIDE = {
  id: 'cell-2',
  centroidLat: 9.06,
  centroidLng: 38.56,
  boundaryGeoJson: {
    type: 'Polygon',
    coordinates: [
      [
        [38.55, 9.05],
        [38.57, 9.05],
        [38.57, 9.07],
        [38.55, 9.07],
        [38.55, 9.05],
      ],
    ],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
  (readFile as any).mockResolvedValue(GOOD_CSV);
});

describe('rwi.client', () => {
  const boundingBox = { minLat: 8.9, maxLat: 9.1, minLng: 38.5, maxLng: 38.9 };
  const period = '2026-06-01';

  it('resolves an array of {cellId, rawValue} mapped from the static dataset', async () => {
    (prisma.gridCell.findMany as any).mockResolvedValue([CELL_WITH_POINT_INSIDE]);

    const result = await pull(boundingBox, period);
    expect(Array.isArray(result)).toBe(true);
    expect(result).toEqual([{ cellId: 'cell-1', rawValue: 0.42 }]);
  });

  it('falls back to the nearest dataset point when none fall inside the cell polygon', async () => {
    (prisma.gridCell.findMany as any).mockResolvedValue([CELL_WITH_NO_POINT_INSIDE]);

    const result = await pull(boundingBox, period);
    expect(result).toEqual([{ cellId: 'cell-2', rawValue: -0.12 }]);
  });

  it('propagates a failure from the underlying read mechanism', async () => {
    (prisma.gridCell.findMany as any).mockResolvedValue([CELL_WITH_POINT_INSIDE]);
    (readFile as any).mockRejectedValue(new Error('ENOENT: dataset file not found'));

    await expect(pull(boundingBox, period)).rejects.toThrow();
  });

  it('skips a malformed dataset row rather than failing the whole pull', async () => {
    (prisma.gridCell.findMany as any).mockResolvedValue([CELL_WITH_POINT_INSIDE]);
    (readFile as any).mockResolvedValue(
      [
        'quadkey,latitude,longitude,rwi,error',
        'bad,not-a-number,38.76,0.42,0.1',
        'q1,8.98,38.76,0.42,0.1',
      ].join('\n'),
    );

    const result = await pull(boundingBox, period);
    expect(result).toEqual([{ cellId: 'cell-1', rawValue: 0.42 }]);
  });

  it('throws for a dataset missing its required columns entirely', async () => {
    (prisma.gridCell.findMany as any).mockResolvedValue([CELL_WITH_POINT_INSIDE]);
    (readFile as any).mockResolvedValue(['some,other,columns', '1,2,3'].join('\n'));

    await expect(pull(boundingBox, period)).rejects.toThrow();
  });

  it('resolves [] for an empty bounding box / no data in range', async () => {
    (prisma.gridCell.findMany as any).mockResolvedValue([]);
    const result = await pull(boundingBox, period);
    expect(result).toEqual([]);
  });

  it('makes no network/HTTP/SDK call — reads only the static dataset', async () => {
    (prisma.gridCell.findMany as any).mockResolvedValue([CELL_WITH_POINT_INSIDE]);
    await pull(boundingBox, period);
    expect(fetch).not.toHaveBeenCalled();
  });
});
