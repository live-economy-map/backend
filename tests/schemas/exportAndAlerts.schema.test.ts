import { describe, it, expect } from 'vitest';
import {
  exportDataQuerySchema,
  createAlertRuleSchema,
  updateAlertRuleSchema,
  deleteAlertRuleSchema,
  listNotificationsQuerySchema,
  markNotificationReadParamsSchema,
} from '../../src/schemas/exportAndAlerts.schema.js';

describe('exportAndAlerts.schema', () => {
  describe('exportDataQuerySchema', () => {
    it('accepts valid export query params and applies CSV default', () => {
      const result = exportDataQuerySchema.safeParse({ query: {} });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query.format).toBe('CSV');
      }
    });

    it('accepts JSON format and valid ISO dates', () => {
      const result = exportDataQuerySchema.safeParse({
        query: {
          format: 'JSON',
          periodStart: '2026-01-01',
          periodEnd: '2026-06-01',
          cellIds: '123e4567-e89b-12d3-a456-426614174000',
        },
      });
      expect(result.success).toBe(true);
    });

    it('rejects invalid date format', () => {
      const result = exportDataQuerySchema.safeParse({
        query: {
          periodStart: '01-01-2026',
        },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('createAlertRuleSchema', () => {
    it('validates a valid alert rule creation', () => {
      const valid = {
        body: {
          gridCellId: '123e4567-e89b-12d3-a456-426614174000',
          thresholdDelta: 0.15,
        },
      };
      const result = createAlertRuleSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects delta outside [0.01, 1.0]', () => {
      const tooLow = {
        body: {
          gridCellId: '123e4567-e89b-12d3-a456-426614174000',
          thresholdDelta: 0.001,
        },
      };
      expect(createAlertRuleSchema.safeParse(tooLow).success).toBe(false);

      const tooHigh = {
        body: {
          gridCellId: '123e4567-e89b-12d3-a456-426614174000',
          thresholdDelta: 1.5,
        },
      };
      expect(createAlertRuleSchema.safeParse(tooHigh).success).toBe(false);
    });
  });

  describe('updateAlertRuleSchema', () => {
    it('accepts thresholdDelta update', () => {
      const valid = {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
        body: { thresholdDelta: 0.2 },
      };
      expect(updateAlertRuleSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects empty update body', () => {
      const invalid = {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
        body: {},
      };
      expect(updateAlertRuleSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('deleteAlertRuleSchema', () => {
    it('validates valid uuid param', () => {
      const valid = { params: { id: '123e4567-e89b-12d3-a456-426614174000' } };
      expect(deleteAlertRuleSchema.safeParse(valid).success).toBe(true);
    });
  });

  describe('listNotificationsQuerySchema', () => {
    it('applies pagination defaults', () => {
      const result = listNotificationsQuerySchema.safeParse({ query: {} });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query.page).toBe(1);
        expect(result.data.query.limit).toBe(20);
      }
    });
  });

  describe('markNotificationReadParamsSchema', () => {
    it('validates notification uuid param', () => {
      const valid = { params: { id: '123e4567-e89b-12d3-a456-426614174000' } };
      expect(markNotificationReadParamsSchema.safeParse(valid).success).toBe(true);
    });
  });
});
