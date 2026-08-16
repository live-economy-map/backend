import { describe, it, expect } from 'vitest';
import { listCaseStudiesQuerySchema } from '../../src/schemas/caseStudies.schema.js';
import { ZodError } from 'zod';

describe.skip('caseStudies.schema', () => {
  describe('listCaseStudiesQuerySchema', () => {
    it('should default page to 1 and limit to 20 when omitted', () => {
      const result = listCaseStudiesQuerySchema.parse({});
      expect(result).toEqual({ page: 1, limit: 20 });
    });

    it('should coerce string "2" to number 2 for page', () => {
      const result = listCaseStudiesQuerySchema.parse({ page: '2' });
      expect(result.page).toBe(2);
      expect(typeof result.page).toBe('number');
    });

    it('should coerce string "10" to number 10 for limit', () => {
      const result = listCaseStudiesQuerySchema.parse({ limit: '10' });
      expect(result.limit).toBe(10);
      expect(typeof result.limit).toBe('number');
    });

    it('should reject limit > 100', () => {
      expect(() => listCaseStudiesQuerySchema.parse({ limit: 101 })).toThrow(ZodError);
    });

    it('should reject limit = 100 as valid (boundary)', () => {
      const result = listCaseStudiesQuerySchema.parse({ limit: 100 });
      expect(result.limit).toBe(100);
    });

    it('should reject page = 0 (non-positive)', () => {
      expect(() => listCaseStudiesQuerySchema.parse({ page: 0 })).toThrow(ZodError);
    });

    it('should reject negative page', () => {
      expect(() => listCaseStudiesQuerySchema.parse({ page: -1 })).toThrow(ZodError);
    });

    it('should accept valid page and limit', () => {
      const result = listCaseStudiesQuerySchema.parse({ page: 2, limit: 50 });
      expect(result).toEqual({ page: 2, limit: 50 });
    });
  });
});
