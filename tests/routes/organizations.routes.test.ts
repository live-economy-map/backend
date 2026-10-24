import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../src/services/organizations.service.js', () => ({
  organizationsService: {
    createOrganization: vi.fn(),
    getUserOrganizations: vi.fn(),
    getOrganization: vi.fn(),
    addMember: vi.fn(),
    removeMember: vi.fn(),
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

import { organizationsService } from '../../src/services/organizations.service.js';
import organizationsRoutes from '../../src/routes/organizations.routes.js';
import errorMiddleware from '../../src/middlewares/error.middleware.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/orgs', organizationsRoutes);
  app.use(errorMiddleware);
  return app;
}

describe('organizations.routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates an organization for authenticated user', async () => {
    vi.mocked(organizationsService.createOrganization).mockResolvedValueOnce({
      id: 'org-1',
      name: 'Addis Analytics',
      slug: 'addis-analytics',
    } as any);

    const res = await request(buildApp())
      .post('/orgs')
      .set('Authorization', 'Bearer user-token')
      .send({
        name: 'Addis Analytics',
        slug: 'addis-analytics',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.slug).toBe('addis-analytics');
  });

  it('retrieves user organizations', async () => {
    vi.mocked(organizationsService.getUserOrganizations).mockResolvedValueOnce([
      { id: 'org-1', name: 'Addis Analytics', userRole: 'OWNER' },
    ] as any);

    const res = await request(buildApp()).get('/orgs/my').set('Authorization', 'Bearer user-token');

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
  });

  it('adds a member to organization', async () => {
    vi.mocked(organizationsService.addMember).mockResolvedValueOnce({
      id: 'm-1',
      userId: '123e4567-e89b-12d3-a456-426614174000',
      role: 'MEMBER',
    } as any);

    const res = await request(buildApp())
      .post('/orgs/123e4567-e89b-12d3-a456-426614174001/members')
      .set('Authorization', 'Bearer user-token')
      .send({
        userId: '123e4567-e89b-12d3-a456-426614174000',
        role: 'MEMBER',
      });

    expect(res.status).toBe(200);
    expect(res.body.data.role).toBe('MEMBER');
  });
});
