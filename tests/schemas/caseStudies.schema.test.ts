import { describe, it, expect } from 'vitest';
import { listCaseStudiesQuerySchema } from '../../src/schemas/caseStudies.schema.js';

describe('caseStudies.schema', () => {
  describe('listCaseStudiesQuerySchema', () => {
    it('should default page to 1 and limit to 20 when omitted', () => {
      const result = listCaseStudiesQuerySchema.safeParse({ query: {} });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.query).toEqual({ page: 1, limit: 20 });
    });

    it('should coerce string "2" to number 2 for page', () => {
      const result = listCaseStudiesQuerySchema.safeParse({ query: { page: '2' } });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query.page).toBe(2);
        expect(typeof result.data.query.page).toBe('number');
      }
    });

    it('should coerce string "10" to number 10 for limit', () => {
      const result = listCaseStudiesQuerySchema.safeParse({ query: { limit: '10' } });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query.limit).toBe(10);
        expect(typeof result.data.query.limit).toBe('number');
      }
    });

    it('should reject limit > 100', () => {
      const result = listCaseStudiesQuerySchema.safeParse({ query: { limit: 101 } });
      expect(result.success).toBe(false);
    });

    it('should accept limit = 100 as valid (boundary)', () => {
      const result = listCaseStudiesQuerySchema.safeParse({ query: { limit: 100 } });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.query.limit).toBe(100);
    });

    it('should reject page = 0 (non-positive)', () => {
      const result = listCaseStudiesQuerySchema.safeParse({ query: { page: 0 } });
      expect(result.success).toBe(false);
    });

    it('should reject negative page', () => {
      const result = listCaseStudiesQuerySchema.safeParse({ query: { page: -1 } });
      expect(result.success).toBe(false);
    });

    it('should accept valid page and limit', () => {
      const result = listCaseStudiesQuerySchema.safeParse({ query: { page: 2, limit: 50 } });
      expect(result.success).toBe(true);
      if (result.success) expect(result.data.query).toEqual({ page: 2, limit: 50 });
    });
  });
});
