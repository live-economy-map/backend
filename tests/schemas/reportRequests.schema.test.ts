import { describe, it, expect } from 'vitest';
import {
  createReportRequestSchema,
  requestIdParamSchema,
  adminUpdateReportRequestSchema,
  adminUploadDeliverableSchema,
  adminReportRequestsQuerySchema,
} from '../../src/schemas/reportRequests.schema.js';

describe('reportRequests.schema', () => {
  describe('createReportRequestSchema', () => {
    it('accepts valid report request input', () => {
      const input = {
        body: {
          title: 'Addis Retail Expansion Analysis',
          questionPrompt: 'Investigate shadow economic footprint across Bole corridor',
          areaCellIds: ['123e4567-e89b-12d3-a456-426614174000'],
          orgType: 'Research NGO',
          contactPreference: 'EMAIL',
        },
      };

      const result = createReportRequestSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts optional phoneNumber and telegramHandle', () => {
      const input = {
        body: {
          title: 'Infrastructure Assessment',
          questionPrompt: 'Evaluate corridor freight logistics activity',
          areaCellIds: ['123e4567-e89b-12d3-a456-426614174000'],
          contactPreference: 'TELEGRAM',
          phoneNumber: '+251911223344',
          telegramHandle: '@tele_analyst',
        },
      };

      const result = createReportRequestSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body.phoneNumber).toBe('+251911223344');
        expect(result.data.body.telegramHandle).toBe('@tele_analyst');
      }
    });

    it('rejects short title or empty areaCellIds', () => {
      const input = {
        body: {
          title: 'Ab',
          questionPrompt: 'Too short prompt',
          areaCellIds: [],
        },
      };

      const result = createReportRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('requestIdParamSchema', () => {
    it('accepts valid UUID', () => {
      const input = { params: { id: '123e4567-e89b-12d3-a456-426614174000' } };
      const result = requestIdParamSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('adminUpdateReportRequestSchema', () => {
    it('accepts status change and internal notes', () => {
      const input = {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
        body: {
          status: 'IN_PROGRESS',
          internalNotes: 'Data extraction started',
        },
      };

      const result = adminUpdateReportRequestSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects invalid status', () => {
      const input = {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
        body: { status: 'INVALID_STATUS' },
      };

      const result = adminUpdateReportRequestSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('adminUploadDeliverableSchema', () => {
    it('accepts valid deliverable metadata', () => {
      const input = {
        params: { id: '123e4567-e89b-12d3-a456-426614174000' },
        body: {
          fileUrl: 'https://storage.example.com/reports/bole-report.pdf',
          fileName: 'bole-report.pdf',
          fileSizeBytes: 2048500,
          mimeType: 'application/pdf',
        },
      };

      const result = adminUploadDeliverableSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('adminReportRequestsQuerySchema', () => {
    it('parses and coerces pagination query', () => {
      const input = {
        query: {
          page: '2',
          limit: '10',
          status: 'SUBMITTED',
          priority: 'true',
        },
      };

      const result = adminReportRequestsQuerySchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query.page).toBe(2);
        expect(result.data.query.limit).toBe(10);
        expect(result.data.query.priority).toBe(true);
      }
    });
  });
});
