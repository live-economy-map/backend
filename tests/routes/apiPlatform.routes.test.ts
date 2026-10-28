import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../src/services/apiPlatform.service.js', () => ({
  apiPlatformService: {
    createApiKey: vi.fn(),
    listApiKeys: vi.fn(),
    revokeApiKey: vi.fn(),
    getUsageSummary: vi.fn(),
    getPublicCells: vi.fn(),
    getPublicScores: vi.fn(),
    getPublicHistory: vi.fn(),
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

    (req as any).user = {
      id: 'user-123',
      email: 'user@example.com',
      role: 'USER',
      createdAt: '2026-01-10T00:00:00Z',
    };
    next();
  },
}));

vi.mock('../../src/middlewares/apiKey.middleware.js', () => ({
  requireApiKey: (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['x-api-key'];
    if (!key) {
      return res.status(401).json({
        statusCode: 401,
        success: false,
        message: 'API key required',
        errors: [],
      });
    }
    (req as any).apiKey = { id: 'key-1' };
    (req as any).user = { id: 'user-123', role: 'USER' };
    next();
  },
}));

import { apiPlatformService } from '../../src/services/apiPlatform.service.js';
import apiKeysRoutes from '../../src/routes/apiKeys.routes.js';
import publicApiRoutes from '../../src/routes/publicApi.routes.js';
import errorMiddleware from '../../src/middlewares/error.middleware.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api-keys', apiKeysRoutes);
  app.use('/public', publicApiRoutes);
  app.use(errorMiddleware);
  return app;
}

describe('apiPlatform.routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('API Keys Management', () => {
    it('creates an API key for authenticated user', async () => {
      vi.mocked(apiPlatformService.createApiKey).mockResolvedValueOnce({
        id: 'k-1',
        name: 'Backend Microservice',
        secretKey: 'lem_live_mock_secret_key',
        tier: 'COMMERCIAL',
      } as any);

      const res = await request(buildApp())
        .post('/api-keys')
        .set('Authorization', 'Bearer user-token')
        .send({
          name: 'Backend Microservice',
          tier: 'COMMERCIAL',
        });

      expect(res.status).toBe(201);
      expect(res.body.data.secretKey).toBe('lem_live_mock_secret_key');
    });

    it('lists user API keys', async () => {
      vi.mocked(apiPlatformService.listApiKeys).mockResolvedValueOnce([
        { id: 'k-1', name: 'Key 1' },
      ] as any);

      const res = await request(buildApp())
        .get('/api-keys')
        .set('Authorization', 'Bearer user-token');

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });

    it('returns API key usage metrics', async () => {
      vi.mocked(apiPlatformService.getUsageSummary).mockResolvedValueOnce({
        totalKeys: 1,
        totalCalls: 15,
        keys: [],
      } as any);

      const res = await request(buildApp())
        .get('/api-keys/usage')
        .set('Authorization', 'Bearer user-token');

      expect(res.status).toBe(200);
      expect(res.body.data.totalCalls).toBe(15);
    });
  });

  describe('Public API endpoints (gated by API key)', () => {
    it('rejects public endpoints without x-api-key with 401', async () => {
      const res = await request(buildApp()).get('/public/cells');
      expect(res.status).toBe(401);
    });

    it('returns grid cells when valid API key is supplied', async () => {
      vi.mocked(apiPlatformService.getPublicCells).mockResolvedValueOnce({
        cells: [{ id: 'cell-1' }],
        page: 1,
        limit: 50,
        total: 1,
        totalPages: 1,
        boundingBox: { minLat: 8.8, maxLat: 9.1, minLng: 38.6, maxLng: 38.95 },
      } as any);

      const res = await request(buildApp())
        .get('/public/cells')
        .set('x-api-key', 'lem_live_test_key');

      expect(res.status).toBe(200);
      expect(res.body.data.cells).toHaveLength(1);
    });

    it('returns historical scores for cell', async () => {
      vi.mocked(apiPlatformService.getPublicHistory).mockResolvedValueOnce({
        cell: { id: '123e4567-e89b-12d3-a456-426614174000' },
        history: [{ period: '2026-06-01', score: 80.0, isComplete: true }],
      } as any);

      const res = await request(buildApp())
        .get('/public/history/123e4567-e89b-12d3-a456-426614174000')
        .set('x-api-key', 'lem_live_test_key');

      expect(res.status).toBe(200);
      expect(res.body.data.history).toHaveLength(1);
    });
  });
});
