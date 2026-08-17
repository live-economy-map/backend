import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { HTTP_STATUS } from '../../src/constants/index.js';
import ApiError from '../../src/utils/ApiError.js';

vi.mock('../../src/services/adminAuth.service.js', () => ({
  authenticateAdmin: vi.fn(),
  invalidateSession: vi.fn(),
}));

import * as adminAuthService from '../../src/services/adminAuth.service.js';
import { login, logout, getMe } from '../../src/controllers/adminAuth.controller.js';

function mockRes(): Response {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('adminAuth.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('login', () => {
    it('delegates to authenticateAdmin with email and password, responds 200', async () => {
      const req = {
        body: { email: 'admin@example.com', password: 'validpassword123' },
      } as unknown as Request;
      const res = mockRes();
      const next: NextFunction = vi.fn();
      const serviceResult = {
        token: 'jwt-abc',
        admin: { id: 'admin-1', email: 'admin@example.com' },
      };
      vi.mocked(adminAuthService.authenticateAdmin).mockResolvedValue(serviceResult);

      await login(req, res, next);

      expect(adminAuthService.authenticateAdmin).toHaveBeenCalledWith(
        req.body.email,
        req.body.password,
      );
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 200,
          message: 'Login successful',
          data: serviceResult,
        }),
      );
    });

    it('propagates a 401 error via next, unchanged', async () => {
      const req = {
        body: { email: 'admin@example.com', password: 'wrongpassword' },
      } as unknown as Request;
      const res = mockRes();
      const next: NextFunction = vi.fn();
      const error = new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid email or password');
      vi.mocked(adminAuthService.authenticateAdmin).mockRejectedValue(error);

      await login(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('logout', () => {
    it('delegates the request token to invalidateSession, responds 200 with empty data', async () => {
      const req = { token: 'jwt-abc' } as unknown as Request;
      const res = mockRes();
      const next: NextFunction = vi.fn();
      vi.mocked(adminAuthService.invalidateSession).mockResolvedValue(undefined);

      await logout(req, res, next);

      expect(adminAuthService.invalidateSession).toHaveBeenCalledWith((req as any).token);
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 200, message: 'Logged out', data: {} }),
      );
    });
  });

  describe('getMe', () => {
    it('responds 200 with { id, email, createdAt } derived from req.user alone', async () => {
      const req = {
        user: { id: 'admin-1', email: 'admin@example.com', createdAt: '2026-01-10T00:00:00Z' },
      } as unknown as Request;
      const res = mockRes();
      const next: NextFunction = vi.fn();

      await getMe(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 200,
          message: 'OK',
          data: {
            id: (req as any).user.id,
            email: (req as any).user.email,
            createdAt: (req as any).user.createdAt,
          },
        }),
      );
    });

    it('skips the service layer entirely — no adminAuthService function is called', async () => {
      const req = {
        user: { id: 'admin-1', email: 'admin@example.com', createdAt: '2026-01-10T00:00:00Z' },
      } as unknown as Request;
      const res = mockRes();
      const next: NextFunction = vi.fn();

      await getMe(req, res, next);

      expect(adminAuthService.authenticateAdmin).not.toHaveBeenCalled();
      expect(adminAuthService.invalidateSession).not.toHaveBeenCalled();
    });
  });
});
