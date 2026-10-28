import { describe, it, expect, vi, beforeEach } from 'vitest';
import crypto from 'crypto';
import { requireApiKey } from '../../src/middlewares/apiKey.middleware.js';
import { prisma } from '../../src/config/db.js';
import { HTTP_STATUS } from '../../src/constants/index.js';

vi.mock('../../src/config/db.js');

describe('requireApiKey middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejects request without API key with 401', async () => {
    const req: any = { headers: {} };
    const res: any = {};
    const next = vi.fn();

    await requireApiKey(req, res, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HTTP_STATUS.UNAUTHORIZED,
      }),
    );
  });

  it('rejects invalid or inactive API key with 401', async () => {
    vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce(null);

    const req: any = {
      headers: { 'x-api-key': 'lem_live_invalid_secret_key' },
    };
    const res: any = {};
    const next = vi.fn();

    await requireApiKey(req, res, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HTTP_STATUS.UNAUTHORIZED,
      }),
    );
  });

  it('rejects expired API key with 401', async () => {
    const rawKey = 'lem_live_expired_key';
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce({
      id: 'key-1',
      keyHash,
      isActive: true,
      expiresAt: new Date(Date.now() - 10000), // in the past
      rateLimitRpm: 60,
      user: { id: 'u-1', email: 'user@example.com', role: 'USER' },
    } as any);

    const req: any = {
      headers: { 'x-api-key': rawKey },
    };
    const res: any = {};
    const next = vi.fn();

    await requireApiKey(req, res, next);
    expect(next).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: HTTP_STATUS.UNAUTHORIZED,
        message: 'API key has expired',
      }),
    );
  });

  it('authenticates valid active API key and attaches identity to req', async () => {
    const rawKey = 'lem_live_valid_key_123';
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    vi.mocked(prisma.apiKey.findUnique).mockResolvedValueOnce({
      id: 'key-1',
      keyHash,
      isActive: true,
      expiresAt: null,
      rateLimitRpm: 60,
      tier: 'COMMERCIAL',
      user: { id: 'u-1', email: 'user@example.com', role: 'USER' },
    } as any);

    const req: any = {
      headers: { 'x-api-key': rawKey },
    };
    const res: any = {
      on: vi.fn(),
    };
    const next = vi.fn();

    await requireApiKey(req, res, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.apiKey.id).toBe('key-1');
    expect(req.user.id).toBe('u-1');
  });
});
