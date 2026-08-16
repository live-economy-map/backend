import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../src/config/db.js', () => ({
  prisma: {
    admin: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
  },
}));

vi.mock('../../src/utils/jwt.js', () => ({
  generateToken: vi.fn(),
  verifyToken: vi.fn(),
}));

import bcrypt from 'bcrypt';
import { prisma } from '../../src/config/db.js';
import { generateToken } from '../../src/utils/jwt.js';
import { authenticateAdmin, invalidateSession } from '../../src/services/adminAuth.service.js';

// @types/bcrypt declares compare() with an overload (Promise-returning vs
// callback/void-returning); TS resolves it to the void overload here.
// Sidestep the overload entirely with an `any` handle, same pattern as
// mockPrisma in the adminCaseStudies suite.
const mockedCompare = bcrypt.compare as any;

const validAdminRow = {
  id: 'admin-1',
  email: 'admin@example.com',
  password: '$2b$10$hashedpasswordvalue',
  createdAt: new Date('2026-01-10T00:00:00Z'),
  updatedAt: new Date('2026-01-10T00:00:00Z'),
};

describe.skip('adminAuth.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authenticateAdmin', () => {
    it('resolves { token, admin: { id, email } } on valid credentials', async () => {
      vi.mocked(prisma.admin.findUnique).mockResolvedValue(validAdminRow);
      mockedCompare.mockResolvedValue(true);
      vi.mocked(generateToken).mockReturnValue('signed-jwt-token');

      const result = await authenticateAdmin('admin@example.com', 'validpassword123');

      expect(result.token).toBe('signed-jwt-token');
      expect(result.admin).toEqual({ id: validAdminRow.id, email: validAdminRow.email });
    });

    it('throws ApiError(401, "Invalid email or password") when the email does not exist', async () => {
      vi.mocked(prisma.admin.findUnique).mockResolvedValue(null);
      mockedCompare.mockResolvedValue(false);

      await expect(authenticateAdmin('nobody@example.com', 'anypassword')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid email or password',
      });
    });

    it('throws the IDENTICAL ApiError when the password is wrong', async () => {
      vi.mocked(prisma.admin.findUnique).mockResolvedValue(validAdminRow);
      mockedCompare.mockResolvedValue(false);

      await expect(authenticateAdmin('admin@example.com', 'wrongpassword')).rejects.toMatchObject({
        statusCode: 401,
        message: 'Invalid email or password',
      });
    });

    it('still calls bcrypt.compare against a dummy hash when the email is not found (timing hardening)', async () => {
      vi.mocked(prisma.admin.findUnique).mockResolvedValue(null);
      mockedCompare.mockResolvedValue(false);

      await expect(authenticateAdmin('nobody@example.com', 'anypassword')).rejects.toThrow();

      expect(bcrypt.compare).toHaveBeenCalled();
    });

    it('issues a token signed with the correct admin id', async () => {
      vi.mocked(prisma.admin.findUnique).mockResolvedValue(validAdminRow);
      mockedCompare.mockResolvedValue(true);
      vi.mocked(generateToken).mockReturnValue('signed-jwt-token');

      await authenticateAdmin('admin@example.com', 'validpassword123');

      const payloadArg = vi.mocked(generateToken).mock.calls[0][0];
      expect(payloadArg).toMatchObject({ id: validAdminRow.id });
    });

    it('never includes the password/hash field in the resolved admin object', async () => {
      vi.mocked(prisma.admin.findUnique).mockResolvedValue(validAdminRow);
      mockedCompare.mockResolvedValue(true);
      vi.mocked(generateToken).mockReturnValue('signed-jwt-token');

      const result = await authenticateAdmin('admin@example.com', 'validpassword123');

      expect(result.admin).not.toHaveProperty('password');
      expect(Object.keys(result.admin).sort()).toEqual(['email', 'id']);
    });
  });

  describe('invalidateSession', () => {
    it('resolves without error for a valid token', async () => {
      await expect(invalidateSession('some-valid-token')).resolves.toBeUndefined();
    });

    // OPEN ITEM (Doc 8-5): whether this is a true no-op or writes a short-lived
    // denylist entry is explicitly undecided. Do NOT add a case asserting either
    // implementation until that decision is made — see Doc 9-5, section 9.2.
  });
});
