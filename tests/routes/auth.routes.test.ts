import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import type { Request, Response, NextFunction } from 'express';

vi.mock('../../src/services/auth.service.js', () => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  verifyEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
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

import * as authService from '../../src/services/auth.service.js';
import authRouter from '../../src/routes/auth.routes.js';
import meRouter from '../../src/routes/me.routes.js';
import errorMiddleware from '../../src/middlewares/error.middleware.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/auth', authRouter);
  app.use('/me', meRouter);
  app.use(errorMiddleware);
  return app;
}

describe('auth.routes', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  describe('POST /auth/register', () => {
    it('returns 201 on valid registration', async () => {
      vi.mocked(authService.registerUser).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', role: 'USER' } as any,
        token: 'token-abc',
      });

      const res = await request(app).post('/auth/register').send({
        email: 'test@example.com',
        password: 'strongPassword123',
        fullName: 'Test User',
      });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe('user-123');
    });

    it('returns 400 when email is invalid', async () => {
      const res = await request(app).post('/auth/register').send({
        email: 'invalid-email',
        password: 'strongPassword123',
      });

      expect(res.status).toBe(400);
    });
  });

  describe('POST /auth/login', () => {
    it('returns 200 on valid credentials', async () => {
      vi.mocked(authService.loginUser).mockResolvedValue({
        user: { id: 'user-123', email: 'test@example.com', role: 'USER' } as any,
        token: 'token-abc',
      });

      const res = await request(app).post('/auth/login').send({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(res.status).toBe(200);
      expect(res.body.data.token).toBe('token-abc');
    });
  });

  describe('POST /auth/verify-email', () => {
    it('returns 200 on valid token', async () => {
      vi.mocked(authService.verifyEmail).mockResolvedValue({
        message: 'Email verified successfully',
      });

      const res = await request(app).post('/auth/verify-email').send({ token: 'valid-token' });

      expect(res.status).toBe(200);
    });
  });

  describe('GET /me', () => {
    it('returns 401 without authorization header', async () => {
      const res = await request(app).get('/me');
      expect(res.status).toBe(401);
    });

    it('returns 200 with profile when authorized', async () => {
      vi.mocked(authService.getProfile).mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        role: 'USER',
      } as any);

      const res = await request(app).get('/me').set('Authorization', 'Bearer valid-jwt');

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe('user-123');
    });
  });
});
