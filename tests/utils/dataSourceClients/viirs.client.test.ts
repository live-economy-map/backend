import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pull } from '../../../src/utils/dataSourceClients/viirs.client.js';

vi.mock('@google-cloud/earthengine');

beforeEach(() => {
  vi.clearAllMocks();
});

describe.skip('viirs.client', () => {
  const boundingBox = { minLat: 8.9, maxLat: 9.1, minLng: 38.6, maxLng: 38.9 };
  const period = '2026-06-01';

  it('resolves an array of {cellId, rawValue} mapped from the Earth Engine response', async () => {
    // mock the Earth Engine SDK call to resolve valid raw data
    const result = await pull(boundingBox, period);
    expect(Array.isArray(result)).toBe(true);
  });

  it('propagates (does not swallow) a failed external call', async () => {
    // mock the Earth Engine SDK call to reject
    await expect(pull(boundingBox, period)).rejects.toThrow();
  });

  it('handles a malformed/incomplete provider response distinguishably from an empty result', async () => {
    // mock the Earth Engine SDK call to resolve an unexpected shape
    // either throws, or resolves something distinguishable from []
  });

  it('resolves [] for an empty bounding box / no data in range', async () => {
    // mock the Earth Engine SDK call to resolve genuinely empty data
    const result = await pull(boundingBox, period);
    expect(result).toEqual([]);
  });
});
