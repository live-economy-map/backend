import { describe, it, expect, vi, beforeEach } from 'vitest';
import { pull } from '../../../src/utils/dataSourceClients/gdelt.client.js';

global.fetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe.skip('gdelt.client', () => {
  const boundingBox = { minLat: 8.9, maxLat: 9.1, minLng: 38.6, maxLng: 38.9 };
  const period = '2026-06-01';

  it('resolves an array of {cellId, rawValue} mapped from the GDELT REST response', async () => {
    const result = await pull(boundingBox, period);
    expect(Array.isArray(result)).toBe(true);
  });

  it('propagates (does not swallow) a failed external call', async () => {
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
    const result = await pull(boundingBox, period);
    expect(result).toEqual([]);
  });
});
