import { describe, it, expect } from 'vitest';
import {
  getCellsQuerySchema,
  getCellDetailParamsSchema,
  getRawLayerParamsSchema,
  searchMapBodySchema,
} from '../../src/schemas/map.schema.js';

describe('map.schema', () => {
  describe('getCellsQuerySchema', () => {
    it('accepts a valid ISO date period', () => {
      const result = getCellsQuerySchema.safeParse({ query: { period: '2026-06-01' } });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.query.period).toBe('2026-06-01');
    });

    it('accepts an omitted period', () => {
      const result = getCellsQuerySchema.safeParse({ query: {} });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.query.period).toBeUndefined();
    });

    it('rejects a malformed period', () => {
      const result = getCellsQuerySchema.safeParse({ query: { period: 'not-a-date' } });
      expect(result.success).toBe(false);
    });
  });

  describe('getCellDetailParamsSchema', () => {
    it('requires cellId as uuid', () => {
      const result = getCellDetailParamsSchema.safeParse({
        params: { cellId: 'not-a-uuid' },
        query: {},
      });
      expect(result.success).toBe(false);
    });
  });

  describe('getRawLayerParamsSchema', () => {
    it('accepts VIIRS/GHSL/RWI', () => {
      for (const sourceKey of ['VIIRS', 'GHSL', 'RWI']) {
        const result = getRawLayerParamsSchema.safeParse({ params: { sourceKey }, query: {} });
        expect(result.success).toBe(true);
      }
    });

    it('rejects GDELT', () => {
      const result = getRawLayerParamsSchema.safeParse({
        params: { sourceKey: 'GDELT' },
        query: {},
      });
      expect(result.success).toBe(false);
    });

    it('rejects an unknown sourceKey', () => {
      const result = getRawLayerParamsSchema.safeParse({
        params: { sourceKey: 'LANDSAT' },
        query: {},
      });
      expect(result.success).toBe(false);
    });
  });

  describe('searchMapBodySchema', () => {
    it('rejects a query under 3 chars', () => {
      const result = searchMapBodySchema.safeParse({ body: { query: 'hi' } });
      expect(result.success).toBe(false);
    });

    it('rejects a query over 200 chars', () => {
      const result = searchMapBodySchema.safeParse({ body: { query: 'a'.repeat(201) } });
      expect(result.success).toBe(false);
    });

    it('accepts a valid query', () => {
      const result = searchMapBodySchema.safeParse({
        body: { query: 'areas near Bole with rising construction' },
      });
      expect(result.success).toBe(true);
    });
  });
});
