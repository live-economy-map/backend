import { describe, it, expect } from 'vitest';
import { EvidenceTier } from '@prisma/client';
import {
  createCaseStudySchema,
  updateCaseStudySchema,
  discoverBodySchema,
} from '../../src/schemas/adminCaseStudies.schema.js';

// Per 09-test-file-specification/backend/9-7-case-study-curation.md, section 9.2
// Per 08-function-level-specification/backend/8-7-case-study-curation.md, schema table

const validCreateBody = {
  name: 'Bole Rd Expansion',
  latitude: 9.01,
  longitude: 38.78,
  evidenceDescription: 'New commercial signage observed',
  scoreRiseDate: '2026-03-01',
  confirmedDate: '2026-05-01',
};

const validUuid = '3fa85f64-5717-4562-b3fc-2c963f66afa6';

describe('adminCaseStudies.schema', () => {
  describe('createCaseStudySchema', () => {
    it('requires name, coordinates, evidenceDescription, and both dates', () => {
      const result = createCaseStudySchema.safeParse({ body: {} });
      expect(result.success).toBe(false);
    });

    it('accepts the minimal valid shape', () => {
      const result = createCaseStudySchema.safeParse({ body: validCreateBody });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body.isPublished).toBe(false);
        expect(result.data.body.gridCellId).toBeUndefined();
        expect(result.data.body.evidenceUrl).toBeUndefined();
        expect(result.data.body.evidenceTier).toBeUndefined();
        expect(result.data.body.beforeImageUrl).toBeUndefined();
        expect(result.data.body.afterImageUrl).toBeUndefined();
      }
    });

    it('rejects an invalid evidenceUrl', () => {
      const result = createCaseStudySchema.safeParse({
        body: { ...validCreateBody, evidenceUrl: 'not-a-url' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a malformed gridCellId', () => {
      const result = createCaseStudySchema.safeParse({
        body: { ...validCreateBody, gridCellId: 'not-a-uuid' },
      });
      expect(result.success).toBe(false);
    });

    it('does not itself reject scoreRiseDate after confirmedDate (service-level warning, not a schema rejection)', () => {
      const result = createCaseStudySchema.safeParse({
        body: { ...validCreateBody, scoreRiseDate: '2026-06-01', confirmedDate: '2026-01-01' },
      });
      expect(result.success).toBe(true);
    });

    it('accepts a valid evidenceTier enum value', () => {
      const result = createCaseStudySchema.safeParse({
        body: { ...validCreateBody, evidenceTier: EvidenceTier.MARKET_REPORT },
      });
      expect(result.success).toBe(true);
    });

    it('rejects an invalid evidenceTier value', () => {
      const result = createCaseStudySchema.safeParse({
        body: { ...validCreateBody, evidenceTier: 'NOT_A_REAL_TIER' },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('updateCaseStudySchema', () => {
    it('treats all body fields as optional — confirms the partial-update shape', () => {
      const result = updateCaseStudySchema.safeParse({
        body: {},
        params: { caseStudyId: validUuid },
      });
      expect(result.success).toBe(true);
    });

    it('requires a valid uuid caseStudyId param', () => {
      const result = updateCaseStudySchema.safeParse({
        body: { name: 'New name' },
        params: { caseStudyId: 'not-a-uuid' },
      });
      expect(result.success).toBe(false);
    });

    it('accepts a partial body with a valid caseStudyId', () => {
      const result = updateCaseStudySchema.safeParse({
        body: { evidenceUrl: 'https://example.com/article' },
        params: { caseStudyId: validUuid },
      });
      expect(result.success).toBe(true);
    });
  });

  describe('discoverBodySchema', () => {
    it('requires a non-empty areaFocus', () => {
      const result = discoverBodySchema.safeParse({ body: { areaFocus: '' } });
      expect(result.success).toBe(false);
    });

    it('accepts a valid areaFocus', () => {
      const result = discoverBodySchema.safeParse({ body: { areaFocus: 'Bole subcity' } });
      expect(result.success).toBe(true);
    });
  });
});
