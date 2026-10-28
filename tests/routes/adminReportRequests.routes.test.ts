import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../src/services/reportRequests.service.js', () => ({
  adminListReportRequests: vi.fn(),
  adminUpdateReportRequest: vi.fn(),
  adminAttachDeliverable: vi.fn(),
  getDemandMetrics: vi.fn(),
}));

let mockUserRole: 'USER' | 'ADMIN' = 'ADMIN';

vi.mock('../../src/middlewares/auth.middleware.js', () => ({
  default: (req: Request, res: Response, next: NextFunction) => {
    if (!req.headers.authorization) {
      return res.status(401).json({
        statusCode: 401,
        success: false,
        message: 'Invalid or expired token',
        errors: [],
      });
    }
    (req as any).user = {
      id: 'admin-123',
      email: 'admin@example.com',
      role: mockUserRole,
      createdAt: '2026-01-10T00:00:00Z',
    };
    next();
  },
}));

import * as reportRequestsService from '../../src/services/reportRequests.service.js';
import adminReportRequestsRouter from '../../src/routes/adminReportRequests.routes.js';
import errorMiddleware from '../../src/middlewares/error.middleware.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/admin', adminReportRequestsRouter);
  app.use(errorMiddleware);
  return app;
}

describe('adminReportRequests.routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    mockUserRole = 'ADMIN';
    app = buildApp();
  });

  describe('RBAC enforcement', () => {
    it('returns 403 when user with role USER accesses admin queue', async () => {
      mockUserRole = 'USER';
      const res = await request(app)
        .get('/admin/report-requests')
        .set('Authorization', 'Bearer user-token');

      expect(res.status).toBe(403);
    });
  });

  describe('GET /admin/report-requests', () => {
    it('returns 200 with paginated queue for admin', async () => {
      vi.mocked(reportRequestsService.adminListReportRequests).mockResolvedValue({
        items: [{ id: 'req-1', status: 'SUBMITTED' } as any],
        page: 1,
        limit: 20,
        total: 1,
      });

      const res = await request(app)
        .get('/admin/report-requests?status=SUBMITTED')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
    });

    it('returns 200 with empty query string filters (?status=&priority=&search=)', async () => {
      vi.mocked(reportRequestsService.adminListReportRequests).mockResolvedValue({
        items: [{ id: 'req-1', status: 'SUBMITTED' } as any],
        page: 1,
        limit: 20,
        total: 1,
      });

      const res = await request(app)
        .get('/admin/report-requests?page=1&limit=10&status=&priority=&search=')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(reportRequestsService.adminListReportRequests).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10 }),
      );
    });

    it('returns 200 with priority enum and search query (?priority=HIGH&search=Bole)', async () => {
      vi.mocked(reportRequestsService.adminListReportRequests).mockResolvedValue({
        items: [{ id: 'req-2', status: 'IN_REVIEW' } as any],
        page: 1,
        limit: 10,
        total: 1,
      });

      const res = await request(app)
        .get('/admin/report-requests?page=1&limit=10&priority=HIGH&search=Bole')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(reportRequestsService.adminListReportRequests).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10, priority: true, search: 'Bole' }),
      );
    });
  });

  describe('PATCH /admin/report-requests/:id', () => {
    it('returns 200 on valid status update', async () => {
      vi.mocked(reportRequestsService.adminUpdateReportRequest).mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        status: 'IN_PROGRESS',
      } as any);

      const res = await request(app)
        .patch('/admin/report-requests/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', 'Bearer admin-token')
        .send({
          status: 'IN_PROGRESS',
          statusChangeNote: 'Beginning data analysis',
        });

      expect(res.status).toBe(200);
      expect(res.body.data.status).toBe('IN_PROGRESS');
    });

    it('returns 200 when updating priority with string enum (HIGH)', async () => {
      vi.mocked(reportRequestsService.adminUpdateReportRequest).mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        priority: true,
      } as any);

      const res = await request(app)
        .patch('/admin/report-requests/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', 'Bearer admin-token')
        .send({
          priority: 'HIGH',
        });

      expect(res.status).toBe(200);
      expect(reportRequestsService.adminUpdateReportRequest).toHaveBeenCalledWith(
        'admin-123',
        '123e4567-e89b-12d3-a456-426614174000',
        expect.objectContaining({ priority: true }),
      );
    });
  });

  describe('POST /admin/report-requests/:id/deliverable', () => {
    it('returns 201 when deliverable is attached', async () => {
      vi.mocked(reportRequestsService.adminAttachDeliverable).mockResolvedValue({
        id: 'del-1',
        fileName: 'report.pdf',
      } as any);

      const res = await request(app)
        .post('/admin/report-requests/123e4567-e89b-12d3-a456-426614174000/deliverable')
        .set('Authorization', 'Bearer admin-token')
        .send({
          fileUrl: 'https://storage.example.com/reports/report.pdf',
          fileName: 'report.pdf',
          fileSizeBytes: 1048576,
          mimeType: 'application/pdf',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.fileName).toBe('report.pdf');
    });
  });

  describe('GET /admin/metrics/demand', () => {
    it('returns 200 with demand metrics and gate evaluation', async () => {
      vi.mocked(reportRequestsService.getDemandMetrics).mockResolvedValue({
        totalRequests: 15,
        distinctUsersCount: 7,
        statusBreakdown: { SUBMITTED: 10, DELIVERED: 5 },
        gateThreshold: { minDistinctUsers: 5, minTotalRequests: 10 },
        isGateMet: true,
      });

      const res = await request(app)
        .get('/admin/metrics/demand')
        .set('Authorization', 'Bearer admin-token');

      expect(res.status).toBe(200);
      expect(res.body.data.isGateMet).toBe(true);
      expect(res.body.data.totalRequests).toBe(15);
      expect(res.body.data.distinctUsersCount).toBe(7);
    });
  });
});
