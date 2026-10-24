import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as authService from '../../src/services/auth.service.js';
import * as authController from '../../src/controllers/auth.controller.js';
import { HTTP_STATUS } from '../../src/constants/index.js';

vi.mock('../../src/services/auth.service.js', () => ({
  registerUser: vi.fn(),
  loginUser: vi.fn(),
  verifyEmail: vi.fn(),
  requestPasswordReset: vi.fn(),
  resetPassword: vi.fn(),
  getProfile: vi.fn(),
  updateProfile: vi.fn(),
}));

describe('auth.controller', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = { body: {}, user: { id: 'user-1' } };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  it('register returns 201 with created profile & token', async () => {
    const mockResult = { user: { id: 'user-1' }, token: 'jwt' };
    vi.mocked(authService.registerUser).mockResolvedValue(mockResult as any);

    await authController.register(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HTTP_STATUS.CREATED,
        data: mockResult,
      }),
    );
  });

  it('login returns 200 with profile & token', async () => {
    const mockResult = { user: { id: 'user-1' }, token: 'jwt' };
    vi.mocked(authService.loginUser).mockResolvedValue(mockResult as any);

    await authController.login(req, res, () => {});

    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HTTP_STATUS.OK,
        data: mockResult,
      }),
    );
  });

  it('logout returns 200', async () => {
    await authController.logout(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
  });

  it('verifyEmail returns 200 with confirmation message', async () => {
    vi.mocked(authService.verifyEmail).mockResolvedValue({
      message: 'Email verified successfully',
    });
    req.body = { token: 'tok' };

    await authController.verifyEmail(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
  });

  it('getMe returns 200 with current user profile', async () => {
    const mockProfile = { id: 'user-1', email: 'test@example.com' };
    vi.mocked(authService.getProfile).mockResolvedValue(mockProfile as any);

    await authController.getMe(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: mockProfile }));
  });

  it('patchMe returns 200 with updated profile', async () => {
    const updatedProfile = { id: 'user-1', fullName: 'Updated' };
    vi.mocked(authService.updateProfile).mockResolvedValue(updatedProfile as any);

    await authController.patchMe(req, res, () => {});
    expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ data: updatedProfile }));
  });
});
