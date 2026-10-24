import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiPlatformService } from '../../src/services/apiPlatform.service.js';
import { prisma } from '../../src/config/db.js';

vi.mock('../../src/config/db.js');

describe('apiPlatform.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createApiKey', () => {
    it('generates a new hashed API key and returns secretKey once', async () => {
      vi.mocked(prisma.apiKey.create).mockResolvedValueOnce({
        id: 'k-1',
        name: 'Production Worker',
        keyPrefix: 'lem_live_12345678',
        tier: 'COMMERCIAL',
        rateLimitRpm: 60,
        expiresAt: null,
        createdAt: new Date(),
      } as any);

      const res = await apiPlatformService.createApiKey('u-1', {
        name: 'Production Worker',
        tier: 'COMMERCIAL',
      });

      expect(res.id).toBe('k-1');
      expect(res.secretKey).toMatch(/^lem_live_[a-f0-9]{48}$/);
      expect(prisma.apiKey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 'u-1',
            rateLimitRpm: 60,
          }),
        }),
      );
    });

    it('sets 300 RPM for INSTITUTIONAL tier', async () => {
      vi.mocked(prisma.apiKey.create).mockResolvedValueOnce({
        id: 'k-inst',
        name: 'Bank Partner',
        keyPrefix: 'lem_live_87654321',
        tier: 'INSTITUTIONAL',
        rateLimitRpm: 300,
        expiresAt: null,
        createdAt: new Date(),
      } as any);

      const res = await apiPlatformService.createApiKey('u-1', {
        name: 'Bank Partner',
        tier: 'INSTITUTIONAL',
      });

      expect(prisma.apiKey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            rateLimitRpm: 300,
          }),
        }),
      );
    });
  });

  describe('getPublicCells', () => {
    it('returns paginated grid cells within bounding box', async () => {
      const mockCells = [
        { id: 'c-1', cellRow: 0, cellCol: 0, centroidLat: 8.9, centroidLng: 38.7 },
      ];
      vi.mocked(prisma.gridCell.findMany).mockResolvedValueOnce(mockCells as any);
      vi.mocked(prisma.gridCell.count).mockResolvedValueOnce(1);

      const res = await apiPlatformService.getPublicCells({ page: 1, limit: 10 });
      expect(res.cells).toEqual(mockCells);
      expect(res.total).toBe(1);
    });
  });

  describe('getPublicHistory', () => {
    it('returns historical scores for cell', async () => {
      vi.mocked(prisma.gridCell.findUnique).mockResolvedValueOnce({
        id: 'cell-1',
        cellRow: 5,
        cellCol: 5,
        centroidLat: 8.9,
        centroidLng: 38.7,
        areaLabel: 'Test Cell',
      } as any);

      vi.mocked(prisma.compositeScoreSnapshot.findMany).mockResolvedValueOnce([
        {
          period: new Date('2026-06-01T00:00:00Z'),
          compositeScore: 75.2,
          isComplete: true,
        },
      ] as any);

      const res = await apiPlatformService.getPublicHistory('cell-1', 12);
      expect(res.cell.id).toBe('cell-1');
      expect(res.history).toHaveLength(1);
      expect(res.history[0].score).toBe(75.2);
    });
  });

  describe('getUsageSummary', () => {
    it('returns aggregated call counts and key details for a user', async () => {
      vi.mocked(prisma.apiKey.findMany).mockResolvedValueOnce([
        {
          id: 'k-1',
          name: 'App 1',
          keyPrefix: 'lem_live_123',
          tier: 'COMMERCIAL',
          rateLimitRpm: 60,
          isActive: true,
        },
      ] as any);
      vi.mocked(prisma.apiUsage.count).mockResolvedValueOnce(42);

      const res = await apiPlatformService.getUsageSummary('user-1');
      expect(res.totalKeys).toBe(1);
      expect(res.totalCalls).toBe(42);
      expect(res.keys[0].name).toBe('App 1');
    });
  });
});
