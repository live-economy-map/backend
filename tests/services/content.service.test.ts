import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../src/config/db.js';
import {
  getLandingStats,
  getMethodologyContent,
  getAboutPageContent,
} from '../../src/services/content.service.js';

vi.mock('../../src/config/db.js', () => ({
  prisma: {
    caseStudy: {
      count: vi.fn(),
    },
    pipelineRun: {
      findFirst: vi.fn(),
    },
    dataSource: {
      findMany: vi.fn(),
      count: vi.fn(),
    },
    signalValue: {
      count: vi.fn(),
    },
    compositeScoreSnapshot: {
      count: vi.fn(),
      findFirst: vi.fn(),
    },
    gridCell: {
      count: vi.fn(),
    },
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('content.service', () => {
  describe('getLandingStats', () => {
    it('resolves highlightStats with a nonzero count and a lastDataRefresh timestamp', async () => {
      (prisma.caseStudy.count as any).mockResolvedValue(3);
      (prisma.pipelineRun.findFirst as any).mockResolvedValue({
        completedAt: new Date('2026-08-01T00:00:00Z'),
      });

      const result = await getLandingStats();

      expect(result.highlightStats.publishedCaseStudyCount).toBe(3);
      expect(result.highlightStats.lastDataRefresh).toBe('2026-08-01T00:00:00.000Z');
    });

    it('resolves publishedCaseStudyCount: 0 when there are no published case studies yet', async () => {
      (prisma.caseStudy.count as any).mockResolvedValue(0);
      (prisma.pipelineRun.findFirst as any).mockResolvedValue(null);

      const result = await getLandingStats();

      expect(result.highlightStats.publishedCaseStudyCount).toBe(0);
    });

    it('resolves lastDataRefresh: null when no successful pipeline run has ever completed', async () => {
      (prisma.caseStudy.count as any).mockResolvedValue(0);
      (prisma.pipelineRun.findFirst as any).mockResolvedValue(null);

      const result = await getLandingStats();

      expect(result.highlightStats.lastDataRefresh).toBeNull();
    });

    it('counts only published case studies', async () => {
      (prisma.caseStudy.count as any).mockResolvedValue(1);
      (prisma.pipelineRun.findFirst as any).mockResolvedValue(null);

      await getLandingStats();

      expect(prisma.caseStudy.count).toHaveBeenCalledWith(
        expect.objectContaining({ where: { isPublished: true } }),
      );
    });

    it('scopes lastDataRefresh to SUCCESS runs only', async () => {
      (prisma.caseStudy.count as any).mockResolvedValue(0);
      (prisma.pipelineRun.findFirst as any).mockResolvedValue(null);

      await getLandingStats();

      expect(prisma.pipelineRun.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'SUCCESS' }) }),
      );
    });
  });

  describe('getMethodologyContent', () => {
    it('returns all data sources, including inactive ones', async () => {
      (prisma.dataSource.findMany as any).mockResolvedValue([
        { key: 'VIIRS', name: 'VIIRS Night-Time Lights', description: 'desc', isActive: true },
        { key: 'GDELT', name: 'GDELT', description: 'desc', isActive: false },
      ]);

      const result = await getMethodologyContent();

      expect(result.dataSources).toHaveLength(2);
      expect(result.dataSources.find((s: any) => s.key === 'GDELT')).toBeDefined();
    });

    it('does not query Prisma for the static scoreExplanation/validationApproach/limitations fields', async () => {
      (prisma.dataSource.findMany as any).mockResolvedValue([]);

      await getMethodologyContent();

      // Only dataSource.findMany should have been called on prisma for this service.
      expect(prisma.dataSource.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.caseStudy.count).not.toHaveBeenCalled();
      expect(prisma.pipelineRun.findFirst).not.toHaveBeenCalled();
    });

    it('resolves dataSources: [] without throwing when the DataSource table is empty', async () => {
      (prisma.dataSource.findMany as any).mockResolvedValue([]);

      const result = await getMethodologyContent();

      expect(result.dataSources).toEqual([]);
    });
  });

  describe('getAboutPageContent', () => {
    it('resolves about content with dynamic data source count, grid cells, signals, snapshots, and latest pipeline run timestamp', async () => {
      (prisma.dataSource.count as any).mockResolvedValue(4);
      (prisma.signalValue.count as any).mockResolvedValue(4284);
      (prisma.compositeScoreSnapshot.count as any).mockResolvedValue(3570);
      (prisma.gridCell.count as any).mockResolvedValue(238);
      (prisma.caseStudy.count as any).mockResolvedValue(1);
      (prisma.pipelineRun.findFirst as any).mockResolvedValue({
        completedAt: new Date('2026-08-15T10:00:00Z'),
      });
      (prisma.compositeScoreSnapshot.findFirst as any).mockResolvedValue(null);

      const result = await getAboutPageContent();

      expect(result.stats.primarySourcesCount).toBe(4);
      expect(result.stats.countriesMapped).toBe(1);
      expect(result.stats.gridCellsCount).toBe(238);
      expect(result.stats.snapshotsCount).toBe(3570);
      expect(result.stats.publishedCaseStudies).toBe(1);
      expect(result.stats.totalDataPoints).toBe(7854);
      expect(result.stats.dataPointsAnalyzed).toBe('7.9K+');
      expect(result.stats.dataUpdateFrequency).toBe('Monthly / On-Demand');
      expect(result.stats.lastDataRefresh).toBe('2026-08-15T10:00:00.000Z');
      expect(result.summary.solutionBullets).toHaveLength(3);
      expect(prisma.dataSource.count).toHaveBeenCalledWith({ where: { isActive: true } });
      expect(prisma.gridCell.count).toHaveBeenCalled();
      expect(prisma.signalValue.count).toHaveBeenCalled();
      expect(prisma.compositeScoreSnapshot.count).toHaveBeenCalled();
      expect(prisma.pipelineRun.findFirst).toHaveBeenCalledWith({
        where: { status: 'SUCCESS' },
        orderBy: { completedAt: 'desc' },
        select: { completedAt: true },
      });
    });

    it('falls back gracefully to snapshot timestamp or null when no pipeline run exists', async () => {
      (prisma.dataSource.count as any).mockResolvedValue(0);
      (prisma.signalValue.count as any).mockResolvedValue(100);
      (prisma.compositeScoreSnapshot.count as any).mockResolvedValue(50);
      (prisma.gridCell.count as any).mockResolvedValue(10);
      (prisma.caseStudy.count as any).mockResolvedValue(0);
      (prisma.pipelineRun.findFirst as any).mockResolvedValue(null);
      (prisma.compositeScoreSnapshot.findFirst as any).mockResolvedValue({
        period: new Date('2026-08-01T00:00:00Z'),
        createdAt: new Date('2026-08-01T05:00:00Z'),
      });

      const result = await getAboutPageContent();

      expect(result.stats.primarySourcesCount).toBe(4);
      expect(result.stats.countriesMapped).toBe(1);
      expect(result.stats.totalDataPoints).toBe(150);
      expect(result.stats.dataPointsAnalyzed).toBe('150');
      expect(result.stats.lastDataRefresh).toBe('2026-08-01T00:00:00.000Z');
      expect(result.summary.solutionBullets.length).toBeGreaterThan(0);
    });
  });
});
