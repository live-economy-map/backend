import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  updateProfileSchema,
} from '../../src/schemas/auth.schema.js';

describe('auth.schema', () => {
  describe('registerSchema', () => {
    it('accepts valid registration input', () => {
      const input = {
        body: {
          email: 'Test.User@Example.com',
          password: 'strongPassword123',
          fullName: 'Test User',
          organizationName: 'Acme Corp',
        },
      };

      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.body.email).toBe('test.user@example.com');
      }
    });

    it('rejects passwords shorter than 8 characters', () => {
      const input = {
        body: {
          email: 'valid@example.com',
          password: 'short',
        },
      };

      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });

    it('rejects invalid email addresses', () => {
      const input = {
        body: {
          email: 'not-an-email',
          password: 'strongPassword123',
        },
      };

      const result = registerSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('accepts valid credentials', () => {
      const input = {
        body: {
          email: 'user@example.com',
          password: 'password123',
        },
      };

      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects missing password', () => {
      const input = {
        body: {
          email: 'user@example.com',
          password: '',
        },
      };

      const result = loginSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('verifyEmailSchema', () => {
    it('accepts non-empty verification token', () => {
      const input = { body: { token: 'valid-token-123' } };
      const result = verifyEmailSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects empty verification token', () => {
      const input = { body: { token: '' } };
      const result = verifyEmailSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });

  describe('forgotPasswordSchema & resetPasswordSchema', () => {
    it('accepts valid email for forgot password', () => {
      const input = { body: { email: 'reset@example.com' } };
      const result = forgotPasswordSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('accepts valid reset password input', () => {
      const input = {
        body: {
          token: 'token-abc',
          newPassword: 'newStrongPassword456',
        },
      };
      const result = resetPasswordSchema.safeParse(input);
      expect(result.success).toBe(true);
    });
  });

  describe('updateProfileSchema', () => {
    it('accepts fullName or organizationName update', () => {
      const input = { body: { fullName: 'New Name' } };
      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(true);
    });

    it('rejects when both fields are empty/omitted', () => {
      const input = { body: {} };
      const result = updateProfileSchema.safeParse(input);
      expect(result.success).toBe(false);
    });
  });
});
