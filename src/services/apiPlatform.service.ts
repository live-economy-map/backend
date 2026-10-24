import crypto from 'crypto';
import { prisma } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { DEFAULT_BOUNDING_BOX } from '../config/spatial.config.js';
import {
  CreateApiKeyInput,
  PublicCellsQuery,
  PublicScoresQuery,
} from '../schemas/apiPlatform.schema.js';

export class ApiPlatformService {
  /**
   * Provision a secure, rate-limited programmatic API Key.
   * Returns secretKey strictly once upon creation.
   */
  async createApiKey(userId: string, input: CreateApiKeyInput) {
    if (input.orgId) {
      const membership = await prisma.orgMember.findUnique({
        where: {
          orgId_userId: {
            orgId: input.orgId,
            userId,
          },
        },
      });

      if (!membership || (membership.role !== 'OWNER' && membership.role !== 'ADMIN')) {
        throw new ApiError(
          HTTP_STATUS.FORBIDDEN,
          'Only organization owners and admins can provision organization API keys',
        );
      }
    }

    const secretKey = `lem_live_${crypto.randomBytes(24).toString('hex')}`;
    const keyHash = crypto.createHash('sha256').update(secretKey).digest('hex');
    const keyPrefix = secretKey.slice(0, 16);
    const rateLimitRpm = input.tier === 'INSTITUTIONAL' ? 300 : 60;
    const expiresAt = input.expiresInDays
      ? new Date(Date.now() + input.expiresInDays * 24 * 60 * 60 * 1000)
      : null;

    const apiKey = await prisma.apiKey.create({
      data: {
        userId,
        orgId: input.orgId,
        name: input.name,
        keyHash,
        keyPrefix,
        tier: input.tier,
        rateLimitRpm,
        expiresAt,
      },
    });

    return {
      id: apiKey.id,
      name: apiKey.name,
      keyPrefix: apiKey.keyPrefix,
      keyPlaintext: secretKey,
      secretKey, // Unhashed secret returned strictly once
      tier: apiKey.tier,
      rateLimitRpm: apiKey.rateLimitRpm,
      rpmLimit: apiKey.rateLimitRpm,
      expiresAt: apiKey.expiresAt,
      createdAt: apiKey.createdAt,
    };
  }

  /**
   * List API keys belonging to user or organization (without exposing secret keys).
   */
  async listApiKeys(userId: string, orgId?: string) {
    const where: any = orgId ? { orgId } : { userId };

    const keys = await prisma.apiKey.findMany({
      where,
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        tier: true,
        rateLimitRpm: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        organization: { select: { id: true, name: true, slug: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return keys.map((k) => ({
      ...k,
      rpmLimit: k.rateLimitRpm,
    }));
  }

  /**
   * Revoke an active API key.
   */
  async revokeApiKey(userId: string, keyId: string) {
    const key = await prisma.apiKey.findUnique({
      where: { id: keyId },
    });

    if (!key || key.userId !== userId) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'API key not found');
    }

    return prisma.apiKey.update({
      where: { id: keyId },
      data: { isActive: false },
    });
  }

  /**
   * Public API: Paginated grid cells with spatial boundaries.
   */
  async getPublicCells(query: PublicCellsQuery) {
    const page = query.page || 1;
    const limit = query.limit || 50;
    const skip = (page - 1) * limit;

    const minLat = query.minLat ?? DEFAULT_BOUNDING_BOX.minLat;
    const maxLat = query.maxLat ?? DEFAULT_BOUNDING_BOX.maxLat;
    const minLng = query.minLng ?? DEFAULT_BOUNDING_BOX.minLng;
    const maxLng = query.maxLng ?? DEFAULT_BOUNDING_BOX.maxLng;

    const where = {
      centroidLat: { gte: minLat, lte: maxLat },
      centroidLng: { gte: minLng, lte: maxLng },
    };

    const [cells, total] = await Promise.all([
      prisma.gridCell.findMany({
        where,
        skip,
        take: limit,
        orderBy: [{ cellRow: 'asc' }, { cellCol: 'asc' }],
      }),
      prisma.gridCell.count({ where }),
    ]);

    return {
      cells,
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      boundingBox: { minLat, maxLat, minLng, maxLng },
    };
  }

  /**
   * Public API: Current or period-specific composite activity scores.
   */
  async getPublicScores(query: PublicScoresQuery) {
    const where: any = {};

    if (query.period) {
      where.period = new Date(query.period);
    } else {
      // Find latest computed period
      const latestSnapshot = await prisma.compositeScoreSnapshot.findFirst({
        orderBy: { period: 'desc' },
        select: { period: true },
      });
      if (latestSnapshot) {
        where.period = latestSnapshot.period;
      }
    }

    if (query.cellIds) {
      const ids = query.cellIds
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      if (ids.length > 0) {
        where.gridCellId = { in: ids };
      }
    }

    const scores = await prisma.compositeScoreSnapshot.findMany({
      where,
      include: {
        gridCell: {
          select: {
            id: true,
            cellRow: true,
            cellCol: true,
            centroidLat: true,
            centroidLng: true,
            areaLabel: true,
          },
        },
      },
      orderBy: { compositeScore: 'desc' },
      take: 2000,
    });

    return {
      period: where.period ? new Date(where.period).toISOString().split('T')[0] : null,
      count: scores.length,
      scores: scores.map((s) => ({
        cellId: s.gridCellId,
        areaLabel: s.gridCell.areaLabel,
        row: s.gridCell.cellRow,
        col: s.gridCell.cellCol,
        centroid: { lat: s.gridCell.centroidLat, lng: s.gridCell.centroidLng },
        score: s.compositeScore,
        isComplete: s.isComplete,
      })),
    };
  }

  /**
   * Public API: Historical time-series of scores for a single cell.
   */
  async getPublicHistory(cellId: string, limit = 24) {
    const cell = await prisma.gridCell.findUnique({
      where: { id: cellId },
    });

    if (!cell) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Grid cell not found');
    }

    const snapshots = await prisma.compositeScoreSnapshot.findMany({
      where: { gridCellId: cellId },
      orderBy: { period: 'desc' },
      take: limit,
      select: {
        period: true,
        compositeScore: true,
        isComplete: true,
      },
    });

    return {
      cell: {
        id: cell.id,
        cellRow: cell.cellRow,
        cellCol: cell.cellCol,
        centroidLat: cell.centroidLat,
        centroidLng: cell.centroidLng,
        areaLabel: cell.areaLabel,
      },
      history: snapshots.map((s) => ({
        period: s.period.toISOString().split('T')[0],
        score: s.compositeScore,
        isComplete: s.isComplete,
      })),
    };
  }

  /**
   * Get metered usage summary for a user's API keys matching frontend ApiUsage contract.
   */
  async getUsageSummary(userId: string) {
    const keys = await prisma.apiKey.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
        keyPrefix: true,
        tier: true,
        rateLimitRpm: true,
        isActive: true,
      },
    });

    const keyIds = keys.map((k) => k.id);
    const activeKeys = keys.filter((k) => k.isActive);
    const rpmLimit =
      activeKeys.length > 0 ? Math.max(...activeKeys.map((k) => k.rateLimitRpm)) : 60;

    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
    const [totalCalls, recentCalls] = await Promise.all([
      prisma.apiUsage.count({
        where: { apiKeyId: { in: keyIds } },
      }),
      prisma.apiUsage.count({
        where: {
          apiKeyId: { in: keyIds },
          createdAt: { gte: oneMinuteAgo },
        },
      }),
    ]);

    const remainingRpm = Math.max(0, rpmLimit - recentCalls);

    // Compute last 7 days daily usage
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentUsages =
      (await prisma.apiUsage.findMany({
        where: {
          apiKeyId: { in: keyIds },
          createdAt: { gte: sevenDaysAgo },
        },
        select: { createdAt: true },
      })) || [];

    const dailyMap = new Map<string, number>();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      const dateKey = d.toISOString().split('T')[0];
      dailyMap.set(dateKey, 0);
    }

    for (const u of recentUsages) {
      const dateKey = u.createdAt.toISOString().split('T')[0];
      dailyMap.set(dateKey, (dailyMap.get(dateKey) || 0) + 1);
    }

    const dailyUsage = Array.from(dailyMap.entries()).map(([date, count]) => ({
      date,
      count,
    }));

    return {
      totalRequests: totalCalls,
      totalCalls,
      remainingRpm,
      rpmLimit,
      dailyUsage,
      totalKeys: keys.length,
      keys: keys.map((k) => ({
        ...k,
        rpmLimit: k.rateLimitRpm,
      })),
    };
  }
}

export const apiPlatformService = new ApiPlatformService();
