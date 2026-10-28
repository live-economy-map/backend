import { describe, it, expect } from 'vitest';
import {
  createSavedAreaSchema,
  updateSavedAreaSchema,
  savedAreaIdParamSchema,
} from '../../src/schemas/savedAreas.schema.js';

describe('savedAreas.schema', () => {
  describe('createSavedAreaSchema', () => {
    it('accepts valid gridCellId and optional customName/notes', () => {
      const input = {
        body: {
          gridCellId: '123e4567-e89b-12d3-a456-426614174000',
          customName: 'My Favorite Market',
          notes: 'High commercial density area',
        },
      };

      const result = createSavedAreaSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects invalid UUID for gridCellId', () => {
      const input = {
        body: {
          gridCellId: 'not-a-valid-uuid',
        },
      };

      const result = createSavedAreaSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('updateSavedAreaSchema', () => {
    it('accepts valid ID and at least one field to update', () => {
      const input = {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
        body: { customName: 'Renamed Area' },
      };

      const result = updateSavedAreaSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects update with empty body', () => {
      const input = {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
        body: {},
      };

      const result = updateSavedAreaSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('savedAreaIdParamSchema', () => {
    it('accepts valid UUID param', () => {
      const input = { params: { id: '123e4567-e89b-12d3-a456-426614174000' } };
      const result = savedAreaIdParamSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects non-UUID param', () => {
      const input = { params: { id: '123' } };
      const result = savedAreaIdParamSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
