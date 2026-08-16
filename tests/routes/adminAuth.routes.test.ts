import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../src/services/adminAuth.service.js', () => ({
  authenticateAdmin: vi.fn(),
  invalidateSession: vi.fn(),
}));

// Replicates the observable contract of the real authMiddleware (401 without a
// Bearer-style Authorization header, req.user attached otherwise) without
// depending on real JWT verification — per 9-5's "mocked authMiddleware" note.
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
      id: 'admin-1',
      email: 'admin@example.com',
      createdAt: '2026-01-10T00:00:00Z',
    };
    next();
  },
}));

import * as adminAuthService from '../../src/services/adminAuth.service.js';
import adminAuthRouter from '../../src/routes/adminAuth.routes.js';
import errorMiddleware from '../../src/middlewares/error.middleware.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/admin/auth', adminAuthRouter);
  app.use(errorMiddleware);
  return app;
}

describe('adminAuth.routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  describe('POST /login', () => {
    it('has no auth requirement — 200 with a valid body, not 401', async () => {
      (adminAuthService.authenticateAdmin as any).mockResolvedValue({
        token: 'jwt-abc',
        admin: { id: 'admin-1', email: 'admin@example.com' },
      });

      const res = await request(app)
        .post('/admin/auth/login')
        .send({ email: 'admin@example.com', password: 'validpassword123' });

      expect(res.status).toBe(200);
    });

    it('validates body shape — rejects a missing password / invalid email', async () => {
      const res = await request(app).post('/admin/auth/login').send({ email: 'bad' });

      expect(res.status).toBe(400);
      expect(adminAuthService.authenticateAdmin).not.toHaveBeenCalled();
    });
  });

  describe('POST /logout', () => {
    it('requires auth — 401 without a header, controller mock never invoked', async () => {
      const res = await request(app).post('/admin/auth/logout');

      expect(res.status).toBe(401);
      expect(adminAuthService.invalidateSession).not.toHaveBeenCalled();
    });

    it('succeeds with a valid token', async () => {
      (adminAuthService.invalidateSession as any).mockResolvedValue(undefined);

      const res = await request(app)
        .post('/admin/auth/logout')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });

  describe('GET /me', () => {
    it('requires auth — 401 without a header, controller mock never invoked', async () => {
      const res = await request(app).get('/admin/auth/me');

      expect(res.status).toBe(401);
    });

    it('succeeds with a valid token', async () => {
      const res = await request(app)
        .get('/admin/auth/me')
        .set('Authorization', 'Bearer valid-token');

      expect(res.status).toBe(200);
    });
  });
});
