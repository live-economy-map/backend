import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../src/services/reportDrafts.service.js', () => ({
  reportDraftsService: {
    generateDraft: vi.fn(),
    getDraft: vi.fn(),
    updateDraft: vi.fn(),
    deliverDraft: vi.fn(),
  },
}));

vi.mock('../../src/middlewares/auth.middleware.js', () => ({
  default: (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({
        statusCode: 401,
        success: false,
        message: 'Invalid or expired token',
        errors: [],
      });
    }

    if (authHeader.includes('admin-token')) {
      (req as any).user = {
        id: 'admin-123',
        email: 'admin@example.com',
        role: 'ADMIN',
        createdAt: '2026-01-01T00:00:00Z',
      };
    } else {
      (req as any).user = {
        id: 'user-123',
        email: 'user@example.com',
        role: 'USER',
        createdAt: '2026-01-10T00:00:00Z',
      };
    }
    next();
  },
}));

import { reportDraftsService } from '../../src/services/reportDrafts.service.js';
import adminReportDraftsRoutes from '../../src/routes/adminReportDrafts.routes.js';
import errorMiddleware from '../../src/middlewares/error.middleware.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/admin', adminReportDraftsRoutes);
  app.use(errorMiddleware);
  return app;
}

describe('adminReportDrafts.routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /admin/report-requests/:id/generate-draft', () => {
    it('rejects regular users with 403', async () => {
      const res = await request(buildApp())
        .post('/admin/report-requests/123e4567-e89b-12d3-a456-426614174000/generate-draft')
        .set('Authorization', 'Bearer user-token')
        .send({});

      expect(res.status).toBe(403);
    });

    it('generates an AI draft when called by an ADMIN', async () => {
      vi.mocked(reportDraftsService.generateDraft).mockResolvedValueOnce({
        id: 'draft-1',
        requestId: '123e4567-e89b-12d3-a456-426614174000',
        status: 'IN_REVIEW',
      } as any);

      const res = await request(buildApp())
        .post('/admin/report-requests/123e4567-e89b-12d3-a456-426614174000/generate-draft')
        .set('Authorization', 'Bearer admin-token')
        .send({ customPrompt: 'Focus on infrastructure' });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('draft-1');
    });
  });

  describe('GET /admin/report-drafts/:id', () => {
    it('retrieves draft for ADMIN', async () => {
      vi.mocked(reportDraftsService.getDraft).mockResolvedValueOnce({
        id: 'draft-1',
        status: 'IN_REVIEW',
      } as any);

      const res = await request(buildApp())
        .get('/admin/report-drafts/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('draft-1');
    });
  });

  describe('PATCH /admin/report-drafts/:id', () => {
    it('updates draft for ADMIN', async () => {
      vi.mocked(reportDraftsService.updateDraft).mockResolvedValueOnce({
        id: 'draft-1',
        status: 'APPROVED',
      } as any);

      const res = await request(buildApp())
        .patch('/admin/report-drafts/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', 'Bearer admin-token')
        .send({
          draftContent: 'Validated report content with sufficient length for review',
          status: 'APPROVED',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('APPROVED');
    });
  });

  describe('POST /admin/report-drafts/:id/deliver', () => {
    it('delivers report draft for ADMIN', async () => {
      vi.mocked(reportDraftsService.deliverDraft).mockResolvedValueOnce({
        deliverable: { id: 'del-1' },
        draft: { id: 'draft-1', status: 'DELIVERED' },
      } as any);

      const res = await request(buildApp())
        .post('/admin/report-drafts/123e4567-e89b-12d3-a456-426614174000/deliver')
        .set('Authorization', 'Bearer admin-token')
        .send({ finalNote: 'Approved for client delivery' });

      expect(res.status).toBe(200);
      expect(res.body.data.draft.status).toBe('DELIVERED');
    });
  });
});
