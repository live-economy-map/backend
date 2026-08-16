import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as caseStudiesService from '../../src/services/caseStudies.service.js';
import ApiError from '../../src/utils/ApiError.js';
import { HTTP_STATUS } from '../../src/constants/index.js';
import { prisma } from '../../src/config/db.js';
import type { CaseStudySummaryDTO, CaseStudyDetailDTO } from '../../src/types/index.js';

// Don't use vi.mock() — manually set up spies instead
vi.spyOn(prisma.caseStudy, 'findMany');
vi.spyOn(prisma.caseStudy, 'findUnique');
vi.spyOn(prisma.caseStudy, 'count');

describe.skip('caseStudies.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getPublishedCaseStudies', () => {
    it('should use default pagination (page=1, limit=20)', async () => {
      const mockCaseStudies: CaseStudySummaryDTO[] = [
        {
          id: '1',
          name: 'Study 1',
          latitude: 9.03,
          longitude: 38.74,
          beforeImageUrl: null,
          afterImageUrl: null,
        },
      ];

      vi.mocked(prisma.caseStudy.findMany).mockResolvedValueOnce(
        mockCaseStudies as unknown as Awaited<ReturnType<typeof prisma.caseStudy.findMany>>,
      );
      vi.mocked(prisma.caseStudy.count).mockResolvedValueOnce(1);

      await caseStudiesService.getPublishedCaseStudies();

      expect(prisma.caseStudy.findMany).toHaveBeenCalledWith({
        where: { isPublished: true },
        select: {
          id: true,
          name: true,
          latitude: true,
          longitude: true,
          beforeImageUrl: true,
          afterImageUrl: true,
        },
        skip: 0,
        take: 20,
      });
    });

    it('should pass explicit pagination (skip/take) to Prisma', async () => {
      const mockCaseStudies: CaseStudySummaryDTO[] = [];

      vi.mocked(prisma.caseStudy.findMany).mockResolvedValueOnce(
        mockCaseStudies as unknown as Awaited<ReturnType<typeof prisma.caseStudy.findMany>>,
      );
      vi.mocked(prisma.caseStudy.count).mockResolvedValueOnce(0);

      await caseStudiesService.getPublishedCaseStudies(3, 50);

      expect(prisma.caseStudy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 100,
          take: 50,
        }),
      );
    });

    it('should filter by isPublished: true in Prisma call args', async () => {
      const mockCaseStudies: CaseStudySummaryDTO[] = [];

      vi.mocked(prisma.caseStudy.findMany).mockResolvedValueOnce(
        mockCaseStudies as unknown as Awaited<ReturnType<typeof prisma.caseStudy.findMany>>,
      );
      vi.mocked(prisma.caseStudy.count).mockResolvedValueOnce(0);

      await caseStudiesService.getPublishedCaseStudies();

      expect(prisma.caseStudy.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { isPublished: true },
        }),
      );
    });

    it('should return empty items and total=0 when no published case studies exist', async () => {
      const mockCaseStudies: CaseStudySummaryDTO[] = [];

      vi.mocked(prisma.caseStudy.findMany).mockResolvedValueOnce(
        mockCaseStudies as unknown as Awaited<ReturnType<typeof prisma.caseStudy.findMany>>,
      );
      vi.mocked(prisma.caseStudy.count).mockResolvedValueOnce(0);

      const result = await caseStudiesService.getPublishedCaseStudies(1, 20);

      expect(result).toEqual({
        items: [],
        page: 1,
        limit: 20,
        total: 0,
      });
    });

    it('should return empty items when page is beyond last page', async () => {
      const mockCaseStudies: CaseStudySummaryDTO[] = [];

      vi.mocked(prisma.caseStudy.findMany).mockResolvedValueOnce(
        mockCaseStudies as unknown as Awaited<ReturnType<typeof prisma.caseStudy.findMany>>,
      );
      vi.mocked(prisma.caseStudy.count).mockResolvedValueOnce(5);

      const result = await caseStudiesService.getPublishedCaseStudies(10, 20);

      expect(result.items).toEqual([]);
      expect(result.total).toBe(5);
    });

    it('should include metadata (page, limit, total) in response', async () => {
      const mockCaseStudies: CaseStudySummaryDTO[] = [];

      vi.mocked(prisma.caseStudy.findMany).mockResolvedValueOnce(
        mockCaseStudies as unknown as Awaited<ReturnType<typeof prisma.caseStudy.findMany>>,
      );
      vi.mocked(prisma.caseStudy.count).mockResolvedValueOnce(100);

      const result = await caseStudiesService.getPublishedCaseStudies(2, 25);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(25);
      expect(result.total).toBe(100);
    });
  });

  describe('getPublishedCaseStudyById', () => {
    it('should return full detail DTO for published case study', async () => {
      const mockCaseStudy: CaseStudyDetailDTO = {
        id: 'cs-1',
        name: 'CMC Growth',
        latitude: 9.03,
        longitude: 38.74,
        beforeImageUrl: 'http://example.com/before.jpg',
        afterImageUrl: 'http://example.com/after.jpg',
        evidenceDescription: 'Rapid construction activity',
        evidenceUrl: 'http://example.com/evidence',
        evidenceTier: 'MARKET_REPORT',
        scoreRiseDate: new Date('2023-01-01'),
        confirmedDate: new Date('2023-02-01'),
      };

      vi.mocked(prisma.caseStudy.findUnique).mockResolvedValueOnce(
        mockCaseStudy as unknown as Awaited<ReturnType<typeof prisma.caseStudy.findUnique>>,
      );

      const result = await caseStudiesService.getPublishedCaseStudyById('cs-1');

      expect(result).toEqual(mockCaseStudy);
    });

    it('should throw 404 when case study does not exist', async () => {
      vi.mocked(prisma.caseStudy.findUnique).mockResolvedValueOnce(null);

      await expect(caseStudiesService.getPublishedCaseStudyById('nonexistent')).rejects.toThrow(
        new ApiError(HTTP_STATUS.NOT_FOUND, 'Case study not found'),
      );
    });

    it('should throw identical 404 for unpublished case study (privacy)', async () => {
      const mockUnpublished = {
        id: 'cs-draft',
        name: 'Draft Study',
        latitude: 9.03,
        longitude: 38.74,
        beforeImageUrl: null,
        afterImageUrl: null,
        evidenceDescription: 'Not ready',
        evidenceUrl: null,
        evidenceTier: null,
        scoreRiseDate: new Date('2023-01-01'),
        confirmedDate: new Date('2023-02-01'),
        isPublished: false,
      };

      vi.mocked(prisma.caseStudy.findUnique).mockResolvedValueOnce(
        mockUnpublished as unknown as Awaited<ReturnType<typeof prisma.caseStudy.findUnique>>,
      );

      await expect(caseStudiesService.getPublishedCaseStudyById('cs-draft')).rejects.toThrow(
        new ApiError(HTTP_STATUS.NOT_FOUND, 'Case study not found'),
      );
    });

    it('should return detail with both image URLs as null', async () => {
      const mockCaseStudy: CaseStudyDetailDTO = {
        id: 'cs-2',
        name: 'Study',
        latitude: 9.0,
        longitude: 38.0,
        beforeImageUrl: null,
        afterImageUrl: null,
        evidenceDescription: 'Description',
        evidenceUrl: null,
        evidenceTier: null,
        scoreRiseDate: new Date('2023-01-01'),
        confirmedDate: new Date('2023-02-01'),
      };

      vi.mocked(prisma.caseStudy.findUnique).mockResolvedValueOnce(
        mockCaseStudy as unknown as Awaited<ReturnType<typeof prisma.caseStudy.findUnique>>,
      );

      const result = await caseStudiesService.getPublishedCaseStudyById('cs-2');

      expect(result.beforeImageUrl).toBeNull();
      expect(result.afterImageUrl).toBeNull();
    });

    it('should return detail with only one image URL present (beforeImageUrl)', async () => {
      const mockCaseStudy: CaseStudyDetailDTO = {
        id: 'cs-3',
        name: 'Study',
        latitude: 9.0,
        longitude: 38.0,
        beforeImageUrl: 'http://example.com/before.jpg',
        afterImageUrl: null,
        evidenceDescription: 'Description',
        evidenceUrl: null,
        evidenceTier: null,
        scoreRiseDate: new Date('2023-01-01'),
        confirmedDate: new Date('2023-02-01'),
      };

      vi.mocked(prisma.caseStudy.findUnique).mockResolvedValueOnce(
        mockCaseStudy as unknown as Awaited<ReturnType<typeof prisma.caseStudy.findUnique>>,
      );

      const result = await caseStudiesService.getPublishedCaseStudyById('cs-3');

      expect(result.beforeImageUrl).toBe('http://example.com/before.jpg');
      expect(result.afterImageUrl).toBeNull();
    });

    it('should return detail with only one image URL present (afterImageUrl)', async () => {
      const mockCaseStudy: CaseStudyDetailDTO = {
        id: 'cs-4',
        name: 'Study',
        latitude: 9.0,
        longitude: 38.0,
        beforeImageUrl: null,
        afterImageUrl: 'http://example.com/after.jpg',
        evidenceDescription: 'Description',
        evidenceUrl: null,
        evidenceTier: null,
        scoreRiseDate: new Date('2023-01-01'),
        confirmedDate: new Date('2023-02-01'),
      };

      vi.mocked(prisma.caseStudy.findUnique).mockResolvedValueOnce(
        mockCaseStudy as unknown as Awaited<ReturnType<typeof prisma.caseStudy.findUnique>>,
      );

      const result = await caseStudiesService.getPublishedCaseStudyById('cs-4');

      expect(result.beforeImageUrl).toBeNull();
      expect(result.afterImageUrl).toBe('http://example.com/after.jpg');
    });
  });
});
