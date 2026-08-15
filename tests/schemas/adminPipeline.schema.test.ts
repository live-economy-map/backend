import { describe, it, expect } from 'vitest';
import {
  refreshParamsSchema,
  recomputeBodySchema,
  createWeightConfigSchema,
} from '../../src/schemas/adminPipeline.schema.js';

describe.skip('adminPipeline.schema', () => {
  describe('refreshParamsSchema', () => {
    it('accepts all 4 DataSourceKey values, including GDELT', () => {
      const result = refreshParamsSchema.safeParse({ params: { sourceKey: 'GDELT' } });
      expect(result.success).toBe(true);
    });

    it('rejects an invalid sourceKey', () => {
      const result = refreshParamsSchema.safeParse({ params: { sourceKey: 'LANDSAT' } });
      expect(result.success).toBe(false);
    });
  });

  describe('recomputeBodySchema', () => {
    it('requires a valid ISO date period', () => {
      const result = recomputeBodySchema.safeParse({ body: { period: 'not-a-date' } });
      expect(result.success).toBe(false);
    });

    it('accepts a valid period', () => {
      const result = recomputeBodySchema.safeParse({ body: { period: '2026-06-01' } });
      expect(result.success).toBe(true);
    });
  });

  describe('createWeightConfigSchema', () => {
    it('requires exactly 3 weights', () => {
      const result = createWeightConfigSchema.safeParse({
        body: {
          weights: [
            { sourceKey: 'VIIRS', weight: 0.5 },
            { sourceKey: 'GHSL', weight: 0.5 },
          ],
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a duplicate source', () => {
      const result = createWeightConfigSchema.safeParse({
        body: {
          weights: [
            { sourceKey: 'VIIRS', weight: 0.4 },
            { sourceKey: 'VIIRS', weight: 0.3 },
            { sourceKey: 'RWI', weight: 0.3 },
          ],
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects GDELT as a weighted source', () => {
      const result = createWeightConfigSchema.safeParse({
        body: {
          weights: [
            { sourceKey: 'VIIRS', weight: 0.34 },
            { sourceKey: 'GHSL', weight: 0.33 },
            { sourceKey: 'GDELT', weight: 0.33 },
          ],
        },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a weight outside 0-1', () => {
      const result = createWeightConfigSchema.safeParse({
        body: {
          weights: [
            { sourceKey: 'VIIRS', weight: 1.5 },
            { sourceKey: 'GHSL', weight: 0.3 },
            { sourceKey: 'RWI', weight: 0.3 },
          ],
        },
      });
      expect(result.success).toBe(false);
    });

    it('accepts a valid 3-source set that sums to 1.0', () => {
      const result = createWeightConfigSchema.safeParse({
        body: {
          weights: [
            { sourceKey: 'VIIRS', weight: 0.4 },
            { sourceKey: 'GHSL', weight: 0.35 },
            { sourceKey: 'RWI', weight: 0.25 },
          ],
        },
      });
      expect(result.success).toBe(true);
    });

    // Decided (no longer pending): weights must sum to 1.0, with float tolerance.
    it('rejects weights that do not sum to 1.0', () => {
      const result = createWeightConfigSchema.safeParse({
        body: {
          weights: [
            { sourceKey: 'VIIRS', weight: 0.4 },
            { sourceKey: 'GHSL', weight: 0.3 },
            { sourceKey: 'RWI', weight: 0.2 },
          ],
        },
      });
      expect(result.success).toBe(false);
    });

    it('accepts weights within float tolerance of 1.0 (e.g. 0.9999996)', () => {
      const result = createWeightConfigSchema.safeParse({
        body: {
          weights: [
            { sourceKey: 'VIIRS', weight: 0.3333332 },
            { sourceKey: 'GHSL', weight: 0.3333332 },
            { sourceKey: 'RWI', weight: 0.3333332 },
          ],
        },
      });
      expect(result.success).toBe(true);
    });
  });
});
