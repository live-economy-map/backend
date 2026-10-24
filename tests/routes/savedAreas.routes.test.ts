import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../src/services/savedAreas.service.js', () => ({
  listSavedAreas: vi.fn(),
  createSavedArea: vi.fn(),
  updateSavedArea: vi.fn(),
  deleteSavedArea: vi.fn(),
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

import * as savedAreasService from '../../src/services/savedAreas.service.js';
import meRouter from '../../src/routes/me.routes.js';
import errorMiddleware from '../../src/middlewares/error.middleware.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/me', meRouter);
  app.use(errorMiddleware);
  return app;
}

describe('savedAreas.routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  describe('GET /me/saved-areas', () => {
    it('returns 401 when not authenticated', async () => {
      const res = await request(app).get('/me/saved-areas');
      expect(res.status).toBe(401);
    });

    it('returns 200 with saved areas when authenticated', async () => {
      vi.mocked(savedAreasService.listSavedAreas).mockResolvedValue([
        { id: 'area-1', customName: 'Saved Cell' } as any,
      ]);

      const res = await request(app).get('/me/saved-areas').set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('POST /me/saved-areas', () => {
    it('returns 201 when bookmarked with valid gridCellId', async () => {
      vi.mocked(savedAreasService.createSavedArea).mockResolvedValue({
        id: 'area-1',
        gridCellId: '123e4567-e89b-12d3-a456-426614174000',
      } as any);

      const res = await request(app)
        .post('/me/saved-areas')
        .set('Authorization', 'Bearer token')
        .send({
          gridCellId: '123e4567-e89b-12d3-a456-426614174000',
          customName: 'Label',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    });

    it('returns 400 when gridCellId is not a valid UUID', async () => {
      const res = await request(app)
        .post('/me/saved-areas')
        .set('Authorization', 'Bearer token')
        .send({
          gridCellId: 'invalid-uuid',
        });

      expect(res.status).toBe(400);
    });
  });

  describe('PATCH /me/saved-areas/:id', () => {
    it('returns 200 with updated saved area', async () => {
      vi.mocked(savedAreasService.updateSavedArea).mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        customName: 'Updated Name',
      } as any);

      const res = await request(app)
        .patch('/me/saved-areas/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', 'Bearer token')
        .send({ customName: 'Updated Name' });

      expect(res.status).toBe(200);
      expect(res.body.data.customName).toBe('Updated Name');
    });
  });

  describe('DELETE /me/saved-areas/:id', () => {
    it('returns 200 on delete', async () => {
      vi.mocked(savedAreasService.deleteSavedArea).mockResolvedValue({
        message: 'Saved area deleted successfully',
      });

      const res = await request(app)
        .delete('/me/saved-areas/123e4567-e89b-12d3-a456-426614174000')
        .set('Authorization', 'Bearer token');

      expect(res.status).toBe(200);
    });
  });
});
