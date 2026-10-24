import { describe, it, expect } from 'vitest';
import {
  checkoutSchema,
  verifyPaymentParamsSchema,
  adminCreatePlanSchema,
  adminUpdateSubscriptionSchema,
  adminListPaymentsQuerySchema,
} from '../../src/schemas/billing.schema.js';

describe('billing.schema', () => {
  describe('checkoutSchema', () => {
    it('validates a valid checkout payload', () => {
      const valid = {
        body: {
          planId: '123e4567-e89b-12d3-a456-426614174000',
          returnUrl: 'https://example.com/checkout/success',
        },
      };
      const result = checkoutSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects an invalid planId UUID', () => {
      const invalid = {
        body: {
          planId: 'not-a-uuid',
        },
      };
      const result = checkoutSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe('verifyPaymentParamsSchema', () => {
    it('accepts non-empty txRef', () => {
      const result = verifyPaymentParamsSchema.safeParse({
        params: { txRef: 'LEM-12345' },
      });
      expect(result.success).toBe(true);
    });

    it('rejects empty txRef', () => {
      const result = verifyPaymentParamsSchema.safeParse({
        params: { txRef: '' },
      });
      expect(result.success).toBe(false);
    });
  });

  describe('adminCreatePlanSchema', () => {
    it('validates valid plan data with default values', () => {
      const data = {
        body: {
          name: 'Pro Tier',
          priceEtb: 150000,
          interval: 'MONTHLY' as const,
          canExport: true,
          canAlert: true,
          maxAlerts: 10,
          priorityReports: true,
        },
      };
      const result = adminCreatePlanSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body.isActive).toBe(true);
      }
    });

    it('rejects non-positive priceEtb', () => {
      const data = {
        body: {
          name: 'Pro Tier',
          priceEtb: -500,
        },
      };
      const result = adminCreatePlanSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('adminUpdateSubscriptionSchema', () => {
    it('validates status update', () => {
      const data = {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
        body: { status: 'CANCELED' as const },
      };
      const result = adminUpdateSubscriptionSchema.safeParse(data);
      expect(result.success).toBe(true);
    });

    it('rejects empty body', () => {
      const data = {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
        body: {},
      };
      const result = adminUpdateSubscriptionSchema.safeParse(data);
      expect(result.success).toBe(false);
    });
  });

  describe('adminListPaymentsQuerySchema', () => {
    it('applies default pagination values', () => {
      const result = adminListPaymentsQuerySchema.safeParse({ query: {} });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query.page).toBe(1);
        expect(result.data.query.limit).toBe(20);
      }
    });
  });
});
