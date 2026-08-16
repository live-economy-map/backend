import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../src/config/db.js';
import { getLandingStats, getMethodologyContent } from '../../src/services/content.service.js';

vi.mock('../../src/config/db.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe.skip('content.service', () => {
  describe('getLandingStats', () => {
    it('resolves highlightStats with a nonzero count and a lastDataRefresh timestamp', async () => {
      (prisma.caseStudy.count as any).mockResolvedValue(3);
      (prisma.pipelineRun.findFirst as any).mockResolvedValue({ completedAt: new Date('2026-08-01T00:00:00Z') });

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
        expect.objectContaining({ where: { isPublished: true } })
      );
    });

    it('scopes lastDataRefresh to SUCCESS runs only', async () => {
      (prisma.caseStudy.count as any).mockResolvedValue(0);
      (prisma.pipelineRun.findFirst as any).mockResolvedValue(null);

      await getLandingStats();

      expect(prisma.pipelineRun.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ status: 'SUCCESS' }) })
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
});