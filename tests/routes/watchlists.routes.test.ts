import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../src/services/watchlists.service.js', () => ({
  watchlistsService: {
    createWatchlist: vi.fn(),
    listUserWatchlists: vi.fn(),
    getWatchlist: vi.fn(),
    addItem: vi.fn(),
    removeItem: vi.fn(),
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

import { watchlistsService } from '../../src/services/watchlists.service.js';
import watchlistsRoutes from '../../src/routes/watchlists.routes.js';
import errorMiddleware from '../../src/middlewares/error.middleware.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/watchlists', watchlistsRoutes);
  app.use(errorMiddleware);
  return app;
}

describe('watchlists.routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a watchlist for authenticated user', async () => {
    vi.mocked(watchlistsService.createWatchlist).mockResolvedValueOnce({
      id: 'wl-1',
      name: 'Growth Zones',
    } as any);

    const res = await request(buildApp())
      .post('/watchlists')
      .set('Authorization', 'Bearer user-token')
      .send({
        name: 'Growth Zones',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.name).toBe('Growth Zones');
  });

  it('lists watchlists', async () => {
    vi.mocked(watchlistsService.listUserWatchlists).mockResolvedValueOnce([
      { id: 'wl-1', name: 'Growth Zones' },
    ] as any);

    const res = await request(buildApp())
      .get('/watchlists')
      .set('Authorization', 'Bearer user-token');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('adds a cell item to watchlist', async () => {
    vi.mocked(watchlistsService.addItem).mockResolvedValueOnce({
      id: 'item-1',
      gridCellId: '123e4567-e89b-12d3-a456-426614174000',
    } as any);

    const res = await request(buildApp())
      .post('/watchlists/123e4567-e89b-12d3-a456-426614174001/items')
      .set('Authorization', 'Bearer user-token')
      .send({
        gridCellId: '123e4567-e89b-12d3-a456-426614174000',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.gridCellId).toBe('123e4567-e89b-12d3-a456-426614174000');
  });

  it('removes a cell item from watchlist', async () => {
    vi.mocked(watchlistsService.removeItem).mockResolvedValueOnce({ removed: true });

    const res = await request(buildApp())
      .delete(
        '/watchlists/123e4567-e89b-12d3-a456-426614174001/items/123e4567-e89b-12d3-a456-426614174000',
      )
      .set('Authorization', 'Bearer user-token');

    expect(res.status).toBe(200);
    expect(res.body.data.removed).toBe(true);
  });
});
