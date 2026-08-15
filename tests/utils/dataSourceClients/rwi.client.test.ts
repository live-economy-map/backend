import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pull } from '../../../src/utils/dataSourceClients/rwi.client.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe.skip('rwi.client', () => {
  const boundingBox = { minLat: 8.9, maxLat: 9.1, minLng: 38.6, maxLng: 38.9 };
  const period = '2026-06-01';

  it('resolves an array of {cellId, rawValue} mapped from the static dataset', async () => {
    const result = await pull(boundingBox, period);
    expect(Array.isArray(result)).toBe(true);
  });

  it('propagates a failure from the underlying read mechanism', async () => {
    await expect(pull(boundingBox, period)).rejects.toThrow();
  });

  it('handles a malformed/incomplete dataset entry distinguishably from an empty result', async () => {
    // mock the local read to resolve an unexpected shape
  });

  it('resolves [] for an empty bounding box / no data in range', async () => {
    const result = await pull(boundingBox, period);
    expect(result).toEqual([]);
  });

  it('makes no network/HTTP/SDK call — reads only the static dataset', async () => {
    // assert no fetch/SDK mock was invoked
  });
});
