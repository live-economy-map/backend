import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../src/services/reportRequests.service.js', () => ({
  createReportRequest: vi.fn(),
  listUserReportRequests: vi.fn(),
  getUserReportRequest: vi.fn(),
}));

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
      id: 'user-123',
      email: 'user@example.com',
      role: 'USER',
      createdAt: '2026-01-10T00:00:00Z',
    };
    next();
  },
}));

import * as reportRequestsService from '../../src/services/reportRequests.service.js';
import meRouter from '../../src/routes/me.routes.js';
import errorMiddleware from '../../src/middlewares/error.middleware.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/me', meRouter);
  app.use(errorMiddleware);
  return app;
}

describe('reportRequests.routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  describe('POST /me/report-requests', () => {
    it('returns 201 when valid request submitted', async () => {
      vi.mocked(reportRequestsService.createReportRequest).mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Addis Growth Analysis',
      } as any);

      const res = await request(app)
        .post('/me/report-requests')
        .set('Authorization', 'Bearer token')
        .send({
          title: 'Addis Growth Analysis',
          questionPrompt: 'Investigate shadow retail activity in Bole',
          areaCellIds: ['123e4567-e89b-12d3-a456-426614174000'],
          contactPreference: 'EMAIL',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 when title is too short', async () => {
      const res = await request(app)
        .post('/me/report-requests')
        .set('Authorization', 'Bearer token')
        .send({
          title: 'Hi',
          questionPrompt: 'Investigate shadow retail activity',
          areaCellIds: ['123e4567-e89b-12d3-a456-426614174000'],
        });

      expect(res.status).toBe(400);
    });
  });

  describe('GET /me/report-requests', () => {
    it('returns 200 with user requests list', async () => {
      vi.mocked(reportRequestsService.listUserReportRequests).mockResolvedValue([
        { id: 'req-1', title: 'Request 1' } as any,
      ]);

      const res = await request(app)
        .get('/me/report-requests')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('GET /me/report-requests/:id', () => {
    it('returns 200 with request detail', async () => {
      vi.mocked(reportRequestsService.getUserReportRequest).mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        title: 'Detail',
      } as any);

      const res = await request(app)
        .get('/me/report-requests/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });
  });
});
