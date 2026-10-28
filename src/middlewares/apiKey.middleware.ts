import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';

// In-memory sliding window rate limiter state
const rateLimitMap = new Map<string, { count: number; windowStart: number }>();

export interface ApiKeyRequest extends Request {
  apiKey?: {
    id: string;
    orgId: string | null;
    userId: string;
    tier: string;
    rateLimitRpm: number;
    organization?: any;
    user?: any;
  };
  user?: any;
}

export const requireApiKey = async (req: ApiKeyRequest, res: Response, next: NextFunction) => {
  const startTime = Date.now();

  try {
    const rawKey =
      (req.headers['x-api-key'] as string) ||
      (req.headers.authorization?.startsWith('Bearer lem_')
        ? req.headers.authorization.slice(7)
        : null);

    if (!rawKey) {
      return next(
        new ApiError(
          HTTP_STATUS.UNAUTHORIZED,
          'API key required. Provide via X-API-Key header or Bearer lem_... token',
        ),
      );
    }

    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      include: {
        organization: true,
        user: { select: { id: true, email: true, role: true } },
      },
    });

    if (!apiKey || !apiKey.isActive) {
      return next(new ApiError(HTTP_STATUS.UNAUTHORIZED, 'Invalid or inactive API key'));
    }

    if (apiKey.expiresAt && new Date(apiKey.expiresAt) < new Date()) {
      return next(new ApiError(HTTP_STATUS.UNAUTHORIZED, 'API key has expired'));
    }

    // Rate limiting check (per minute sliding window)
    const now = Date.now();
    const windowMs = 60 * 1000;
    const clientState = rateLimitMap.get(apiKey.id) || { count: 0, windowStart: now };

    if (now - clientState.windowStart > windowMs) {
      clientState.count = 1;
      clientState.windowStart = now;
    } else {
      clientState.count += 1;
      if (clientState.count > apiKey.rateLimitRpm) {
        res.setHeader('Retry-After', '60');
        return next(
          new ApiError(
            HTTP_STATUS.TOO_MANY_REQUESTS,
            `Rate limit exceeded: your tier allows ${apiKey.rateLimitRpm} requests per minute`,
          ),
        );
      }
    }
    rateLimitMap.set(apiKey.id, clientState);

    // Attach contextual identity
    req.apiKey = apiKey as any;
    req.user = apiKey.user as any;

    // Async record usage and update lastUsedAt
    res.on('finish', () => {
      const responseTimeMs = Date.now() - startTime;
      prisma.apiUsage
        .create({
          data: {
            apiKeyId: apiKey.id,
            endpoint: req.originalUrl || req.path,
            method: req.method,
            statusCode: res.statusCode,
            responseTimeMs,
          },
        })
        .catch(() => {});

      prisma.apiKey
        .update({
          where: { id: apiKey.id },
          data: { lastUsedAt: new Date() },
        })
        .catch(() => {});
    });

    next();
  } catch (err) {
    next(err);
  }
};
