import { describe, it, expect } from 'vitest';
import {
  generateDraftSchema,
  getDraftParamsSchema,
  updateDraftSchema,
  deliverDraftSchema,
} from '../../src/schemas/reportDrafts.schema.js';

describe('reportDrafts.schema', () => {
  describe('generateDraftSchema', () => {
    it('validates request UUID and sets default model', () => {
      const valid = {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
        body: {},
      };
      const result = generateDraftSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body.model).toBe('llama-3.3-70b-versatile');
      }
    });

    it('rejects invalid request UUID', () => {
      const invalid = {
        params: { id: 'invalid-uuid' },
        body: {},
      };
      expect(generateDraftSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('getDraftParamsSchema', () => {
    it('accepts valid draft UUID', () => {
      const valid = { params: { id: '123e4567-e89b-12d3-a456-426614174000' } };
      expect(getDraftParamsSchema.safeParse(valid).success).toBe(true);
    });
  });

  describe('updateDraftSchema', () => {
    it('validates draftContent and status', () => {
      const valid = {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
        body: {
          draftContent: 'This is an updated draft report content that exceeds 20 characters.',
          status: 'APPROVED' as const,
        },
      };
      expect(updateDraftSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects empty update body', () => {
      const invalid = {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
        body: {},
      };
      expect(updateDraftSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('deliverDraftSchema', () => {
    it('validates deliver payload', () => {
      const valid = {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
        body: { finalNote: 'Deliver immediately' },
      };
      expect(deliverDraftSchema.safeParse(valid).success).toBe(true);
    });
  });
});
