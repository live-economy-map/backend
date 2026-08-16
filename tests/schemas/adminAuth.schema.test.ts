import { describe, it, expect } from 'vitest';
import { loginSchema } from '../../src/schemas/adminAuth.schema.js';

// Per 09-test-file-specification/backend/9-5-admin-access.md, section 9.2

describe('adminAuth.schema', () => {
  describe('loginSchema', () => {
    it('rejects an invalid email format', () => {
      const result = loginSchema.safeParse({
        body: { email: 'not-an-email', password: 'somepassword' },
      });
      expect(result.success).toBe(false);
    });

    it('rejects a password under 8 characters', () => {
      const result = loginSchema.safeParse({
        body: { email: 'admin@example.com', password: 'short' },
      });
      expect(result.success).toBe(false);
    });

    it('accepts a valid credentials shape', () => {
      const result = loginSchema.safeParse({
        body: { email: 'admin@example.com', password: 'validpassword123' },
      });
      expect(result.success).toBe(true);
    });
  });

  // Per Doc 8-5: logout and getMe have no schema — no body/params/query beyond
  // authMiddleware-attached req.user, so no corresponding schema test cases.
});
