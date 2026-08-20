import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import * as contentService from '../../src/services/content.service.js';
import {
  getLandingContent,
  getMethodologyContent,
  getAboutContent,
} from '../../src/controllers/content.controller.js';

vi.mock('../../src/services/content.service.js');

beforeEach(() => {
  vi.clearAllMocks();
});

const mockRes = () => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
};

describe('content.controller', () => {
  describe('getLandingContent', () => {
    it('delegates to getLandingStats with no arguments and responds 200', async () => {
      const result = {
        tagline: 'tag',
        intro: 'intro',
        highlightStats: { publishedCaseStudyCount: 3, lastDataRefresh: null },
      };
      (contentService.getLandingStats as any).mockResolvedValue(result);
      const req = {} as Request;
      const res = mockRes();

      await getLandingContent(req, res, vi.fn());

      expect(contentService.getLandingStats).toHaveBeenCalledWith();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 200, message: 'OK', data: result }),
      );
    });

    it('propagates an unexpected service error unchanged', async () => {
      (contentService.getLandingStats as any).mockRejectedValue(new Error('unexpected'));
      const req = {} as Request;
      const res = mockRes();
      const next = vi.fn();

      await getLandingContent(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getMethodologyContent', () => {
    it('delegates to getMethodologyContent with no arguments and responds 200', async () => {
      const result = {
        scoreExplanation: 'exp',
        dataSources: [],
        validationApproach: 'approach',
        limitations: [],
      };
      (contentService.getMethodologyContent as any).mockResolvedValue(result);
      const req = {} as Request;
      const res = mockRes();

      await getMethodologyContent(req, res, vi.fn());

      expect(contentService.getMethodologyContent).toHaveBeenCalledWith();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 200, message: 'OK', data: result }),
      );
    });

    it('propagates an unexpected service error unchanged', async () => {
      (contentService.getMethodologyContent as any).mockRejectedValue(new Error('unexpected'));
      const req = {} as Request;
      const res = mockRes();
      const next = vi.fn();

      await getMethodologyContent(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('getAboutContent', () => {
    it('delegates to getAboutPageContent with no arguments and responds 200', async () => {
      const result = {
        stats: {
          countriesMapped: 1,
          primarySourcesCount: 4,
          dataUpdateFrequency: 'Monthly / On-Demand',
          dataPointsAnalyzed: '7.9K+',
          totalDataPoints: 7854,
          gridCellsCount: 238,
          snapshotsCount: 3570,
          publishedCaseStudies: 1,
          lastDataRefresh: '2026-08-20T08:41:00.000Z',
        },
        summary: {
          solutionBullets: [
            'Objective, satellite-derived metrics.',
            'Granular resolution down to the city-block level.',
            'Continuous temporal analysis over years.',
          ],
        },
      };

      (contentService.getAboutPageContent as any).mockResolvedValue(result);
      const req = {} as Request;
      const res = mockRes();

      await getAboutContent(req, res, vi.fn());

      expect(contentService.getAboutPageContent).toHaveBeenCalledWith();
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 200, message: 'OK', data: result }),
      );
    });

    it('propagates an unexpected service error unchanged', async () => {
      (contentService.getAboutPageContent as any).mockRejectedValue(new Error('unexpected'));
      const req = {} as Request;
      const res = mockRes();
      const next = vi.fn();

      await getAboutContent(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });
});
