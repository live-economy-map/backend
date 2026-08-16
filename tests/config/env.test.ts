import { describe, it, expect } from 'vitest';
import { envSchema } from '../../src/config/env.js';

describe('env schema validation', () => {
  const validEnv = {
    NODE_ENV: 'test' as const,
    PORT: '3000',
    DATABASE_URL: 'postgresql://user:pass@localhost:5432/test_db',
    JWT_SECRET: 'test_jwt_secret_very_long_string',
    JWT_EXPIRES_IN: '7d',
    BCRYPT_SALT_ROUNDS: '10',
    CLIENT_URL: 'http://localhost:3000',
    GOOGLE_EARTH_ENGINE_CREDENTIALS: 'gee_creds_json',
    GDELT_API_KEY: 'gdelt_key_123',
    LLM_API_KEY: 'llm_key_123',
    ADMIN_SEED_EMAIL: 'admin@example.com',
    ADMIN_SEED_PASSWORD: 'seed_password_123',
  };

  it('passes when all required vars are present', () => {
    const result = envSchema.safeParse(validEnv);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.DATABASE_URL).toBe(validEnv.DATABASE_URL);
      expect(result.data.GOOGLE_EARTH_ENGINE_CREDENTIALS).toBe(
        validEnv.GOOGLE_EARTH_ENGINE_CREDENTIALS,
      );
      expect(result.data.GDELT_API_KEY).toBe(validEnv.GDELT_API_KEY);
      expect(result.data.LLM_API_KEY).toBe(validEnv.LLM_API_KEY);
      expect(result.data.ADMIN_SEED_EMAIL).toBe(validEnv.ADMIN_SEED_EMAIL);
      expect(result.data.ADMIN_SEED_PASSWORD).toBe(validEnv.ADMIN_SEED_PASSWORD);
    }
  });

  it('fails when GOOGLE_EARTH_ENGINE_CREDENTIALS is missing', () => {
    const incomplete = { ...validEnv };
    (incomplete as Partial<typeof validEnv>).GOOGLE_EARTH_ENGINE_CREDENTIALS = undefined;

    const result = envSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it('fails when LLM_API_KEY is missing', () => {
    const incomplete = { ...validEnv };
    (incomplete as Partial<typeof validEnv>).LLM_API_KEY = undefined;

    const result = envSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  // OPEN ITEM (Doc 9-1, 9.2): GDELT_API_KEY's required-ness is explicitly "pending
  // confirmation" — some GDELT endpoints are keyless. Doc 9-1 says not to guess this in the
  // test suite. Whoever implements gdelt.client.ts (Doc 8-6) settles this first; then either
  // merge this case into the fail-fast tests above (if a key is required) or assert
  // `result.success` is `true` with `GDELT_API_KEY` omitted (if the chosen endpoint is keyless).
  it.todo('GDELT_API_KEY requirement — pending confirmation, see Doc 9-1 section 9.2 and Doc 8-6');

  it('fails when ADMIN_SEED_EMAIL is missing', () => {
    const incomplete = { ...validEnv };
    (incomplete as Partial<typeof validEnv>).ADMIN_SEED_EMAIL = undefined;

    const result = envSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it('fails when ADMIN_SEED_PASSWORD is missing', () => {
    const incomplete = { ...validEnv };
    (incomplete as Partial<typeof validEnv>).ADMIN_SEED_PASSWORD = undefined;

    const result = envSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });

  it('fails when JWT_SECRET is missing (regression check)', () => {
    const incomplete = { ...validEnv };
    (incomplete as Partial<typeof validEnv>).JWT_SECRET = undefined;

    const result = envSchema.safeParse(incomplete);
    expect(result.success).toBe(false);
  });
});
