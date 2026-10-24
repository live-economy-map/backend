import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../src/services/export.service.js', () => ({
  exportService: {
    exportData: vi.fn(),
  },
}));

vi.mock('../../src/services/alerts.service.js', () => ({
  alertsService: {
    createAlertRule: vi.fn(),
    listAlertRules: vi.fn(),
    updateAlertRule: vi.fn(),
    deleteAlertRule: vi.fn(),
    listUserNotifications: vi.fn(),
    markNotificationRead: vi.fn(),
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

vi.mock('../../src/middlewares/entitlement.middleware.js', () => ({
  requireEntitlement: (key: string) => (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization || '';
    if (authHeader.includes('no-entitlement')) {
      return res.status(403).json({
        statusCode: 403,
        success: false,
        message: `Active subscription required with '${key}' entitlement`,
        errors: [],
      });
    }
    next();
  },
}));

import { exportService } from '../../src/services/export.service.js';
import { alertsService } from '../../src/services/alerts.service.js';
import meRoutes from '../../src/routes/me.routes.js';
import errorMiddleware from '../../src/middlewares/error.middleware.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/me', meRoutes);
  app.use(errorMiddleware);
  return app;
}

describe('exportAndAlerts.routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /me/export', () => {
    it('requires authentication (401 without token)', async () => {
      const res = await request(buildApp()).get('/me/export');
      expect(res.status).toBe(401);
    });

    it('rejects users without export entitlement with 403', async () => {
      const res = await request(buildApp())
        .get('/me/export')
        .set('Authorization', 'Bearer no-entitlement-token');
      expect(res.status).toBe(403);
    });

    it('returns CSV download stream when entitled', async () => {
      vi.mocked(exportService.exportData).mockResolvedValueOnce({
        format: 'CSV',
        contentType: 'text/csv',
        filename: 'export.csv',
        data: 'cell_id,composite_score\ncell-1,80',
      });

      const res = await request(buildApp())
        .get('/me/export?format=CSV')
        .set('Authorization', 'Bearer user-token');

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('text/csv');
      expect(res.text).toContain('cell_id,composite_score');
    });
  });

  describe('Alerts Routes', () => {
    it('creates alert rule when entitled', async () => {
      vi.mocked(alertsService.createAlertRule).mockResolvedValueOnce({
        id: 'rule-1',
        gridCellId: '123e4567-e89b-12d3-a456-426614174000',
        thresholdDelta: 0.15,
      } as any);

      const res = await request(buildApp())
        .post('/me/alerts')
        .set('Authorization', 'Bearer user-token')
        .send({
          gridCellId: '123e4567-e89b-12d3-a456-426614174000',
          thresholdDelta: 0.15,
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe('rule-1');
    });

    it('lists user alert rules', async () => {
      vi.mocked(alertsService.listAlertRules).mockResolvedValueOnce([
        { id: 'rule-1', thresholdDelta: 0.15 },
      ] as any);

      const res = await request(buildApp())
        .get('/me/alerts')
        .set('Authorization', 'Bearer user-token');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('deletes an alert rule', async () => {
      vi.mocked(alertsService.deleteAlertRule).mockResolvedValueOnce({ deleted: true });

      const res = await request(buildApp())
        .delete('/me/alerts/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', 'Bearer user-token');

      expect(res.status).toBe(200);
      expect(res.body.data.deleted).toBe(true);
    });
  });

  describe('Notifications Routes', () => {
    it('lists user in-app notifications', async () => {
      vi.mocked(alertsService.listUserNotifications).mockResolvedValueOnce({
        items: [{ id: 'n-1', title: 'Alert', message: 'Shift detected', isRead: false }],
        page: 1,
        limit: 20,
        total: 1,
        totalPages: 1,
        unreadCount: 1,
      } as any);

      const res = await request(buildApp())
        .get('/me/notifications')
        .set('Authorization', 'Bearer user-token');

      expect(res.status).toBe(200);
      expect(res.body.data.items).toHaveLength(1);
      expect(res.body.data.unreadCount).toBe(1);
    });

    it('marks a notification as read', async () => {
      vi.mocked(alertsService.markNotificationRead).mockResolvedValueOnce({
        id: '123e4567-e89b-12d3-a456-426614174000',
        isRead: true,
      } as any);

      const res = await request(buildApp())
        .patch('/me/notifications/123e4567-e89b-12d3-a456-426614174000/read')
        .set('Authorization', 'Bearer user-token');

      expect(res.status).toBe(200);
      expect(res.body.data.isRead).toBe(true);
    });
  });
});
