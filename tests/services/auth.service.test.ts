import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/db.js', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    emailToken: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    $transaction: vi.fn((promises) => Promise.all(promises)),
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

vi.mock('../../src/utils/jwt.js', () => ({
  generateToken: vi.fn(),
  verifyToken: vi.fn(),
}));

vi.mock('../../src/services/email.service.js', () => ({
  sendVerificationEmail: vi.fn().mockResolvedValue(true),
  sendPasswordResetEmail: vi.fn().mockResolvedValue(true),
}));

import bcrypt from 'bcrypt';
import { prisma } from '../../src/config/db.js';
import { generateToken } from '../../src/utils/jwt.js';
import {
  registerUser,
  loginUser,
  verifyEmail,
  requestPasswordReset,
  resetPassword,
  getProfile,
  updateProfile,
} from '../../src/services/auth.service.js';
import ApiError from '../../src/utils/ApiError.js';

const mockedBcrypt = bcrypt as any;
const mockPrisma = prisma as any;

describe('auth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('registerUser', () => {
    it('creates new user and returns user profile with JWT', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockedBcrypt.hash.mockResolvedValue('hashedPassword');
      mockPrisma.user.create.mockResolvedValue({
        id: 'user-1',
        email: 'newuser@example.com',
        role: 'USER',
        fullName: 'New User',
        organizationName: null,
        isEmailVerified: false,
        createdAt: new Date(),
      });
      vi.mocked(generateToken).mockReturnValue('jwt-token-123');

      const result = await registerUser({
        email: 'newuser@example.com',
        password: 'password123',
        fullName: 'New User',
      });

      expect(result.token).toBe('jwt-token-123');
      expect(result.user.email).toBe('newuser@example.com');
      expect(mockPrisma.user.create).toHaveBeenCalled();
    });

    it('throws CONFLICT if email already registered', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ id: 'existing-1' });

      await expect(
        registerUser({
          email: 'duplicate@example.com',
          password: 'password123',
        }),
      ).rejects.toThrow(ApiError);
    });
  });

  describe('loginUser', () => {
    it('authenticates valid credentials and returns profile with token', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashedPassword',
        role: 'USER',
        fullName: 'Test User',
        organizationName: 'Org',
        isEmailVerified: true,
        createdAt: new Date(),
      });
      mockedBcrypt.compare.mockResolvedValue(true);
      vi.mocked(generateToken).mockReturnValue('jwt-token-abc');

      const result = await loginUser({
        email: 'test@example.com',
        password: 'password123',
      });

      expect(result.token).toBe('jwt-token-abc');
      expect(result.user.id).toBe('user-1');
    });

    it('rejects invalid password with 401', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'test@example.com',
        password: 'hashedPassword',
      });
      mockedBcrypt.compare.mockResolvedValue(false);

      await expect(
        loginUser({
          email: 'test@example.com',
          password: 'wrongPassword',
        }),
      ).rejects.toThrow(ApiError);
    });
  });

  describe('verifyEmail', () => {
    it('marks token used and activates isEmailVerified in transaction', async () => {
      mockPrisma.emailToken.findFirst.mockResolvedValue({
        id: 'token-1',
        userId: 'user-1',
        tokenHash: 'hash',
      });
      mockPrisma.emailToken.update.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});

      const result = await verifyEmail('valid-raw-token');
      expect(result.message).toBe('Email verified successfully');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });

    it('rejects expired or missing token', async () => {
      mockPrisma.emailToken.findFirst.mockResolvedValue(null);

      await expect(verifyEmail('invalid-token')).rejects.toThrow(ApiError);
    });
  });

  describe('requestPasswordReset & resetPassword', () => {
    it('creates reset token when user exists', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'user@example.com',
      });
      mockPrisma.emailToken.create.mockResolvedValue({});

      const result = await requestPasswordReset('user@example.com');
      expect(result.message).toContain('password reset link has been dispatched');
    });

    it('updates password when valid reset token provided', async () => {
      mockPrisma.emailToken.findFirst.mockResolvedValue({
        id: 'token-reset-1',
        userId: 'user-1',
      });
      mockedBcrypt.hash.mockResolvedValue('newHashedPass');
      mockPrisma.emailToken.update.mockResolvedValue({});
      mockPrisma.user.update.mockResolvedValue({});

      const result = await resetPassword('valid-reset-token', 'newPassword123');
      expect(result.message).toBe('Password reset successfully');
      expect(mockPrisma.$transaction).toHaveBeenCalled();
    });
  });

  describe('getProfile & updateProfile', () => {
    it('retrieves user profile', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-1',
        email: 'me@example.com',
        role: 'USER',
        fullName: 'Me',
        phoneNumber: '+251911223344',
        telegramHandle: '@me_analyst',
      });

      const profile = await getProfile('user-1');
      expect(profile.email).toBe('me@example.com');
      expect(profile.phoneNumber).toBe('+251911223344');
      expect(profile.telegramHandle).toBe('@me_analyst');
    });

    it('updates user profile fields', async () => {
      mockPrisma.user.update.mockResolvedValue({
        id: 'user-1',
        fullName: 'Updated Name',
        organizationName: 'New Org',
        phoneNumber: '+251911223344',
        telegramHandle: '@me_analyst',
      });

      const updated = await updateProfile('user-1', {
        fullName: 'Updated Name',
        organizationName: 'New Org',
        phoneNumber: '+251911223344',
        telegramHandle: '@me_analyst',
      });
      expect(updated.fullName).toBe('Updated Name');
      expect(updated.phoneNumber).toBe('+251911223344');
      expect(updated.telegramHandle).toBe('@me_analyst');
    });

    it('retrieves user profile with active subscription plan status', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 'user-2',
        email: 'analyst@example.com',
        role: 'USER',
        fullName: 'Analyst User',
        subscription: {
          id: 'sub-1',
          status: 'ACTIVE',
          plan: {
            id: 'plan-1',
            name: 'Analyst Pro',
          },
        },
      });

      const profile = await getProfile('user-2');
      expect(profile.plan).toBe('Analyst Pro');
      expect(profile.planTier).toBe('PRO');
      expect(profile.planStatus).toBe('ACTIVE');
      expect(profile.subscription?.plan?.name).toBe('Analyst Pro');
    });
  });
});
