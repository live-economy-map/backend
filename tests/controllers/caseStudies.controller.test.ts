import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import * as caseStudiesController from '../../src/controllers/caseStudies.controller.js';
import * as caseStudiesService from '../../src/services/caseStudies.service.js';
import ApiError from '../../src/utils/ApiError.js';
import { HTTP_STATUS } from '../../src/constants/index.js';

vi.mock('../../src/services/caseStudies.service.js');

describe.skip('caseStudies.controller', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    vi.clearAllMocks();

    mockNext = vi.fn();

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };

    mockReq = {
      body: {},
      params: {},
      query: {},
    };
  });

  describe('listCaseStudies', () => {
    it('should delegate to service with query params', async () => {
      const mockResult = {
        items: [
          {
            id: '1',
            name: 'Study',
            latitude: 9.03,
            longitude: 38.74,
            beforeImageUrl: null,
            afterImageUrl: null,
          },
        ],
        page: 1,
        limit: 20,
        total: 1,
      };

      mockReq.query = { page: '1', limit: '20' };
      vi.mocked(caseStudiesService.getPublishedCaseStudies).mockResolvedValue(mockResult);

      await caseStudiesController.listCaseStudies(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(caseStudiesService.getPublishedCaseStudies).toHaveBeenCalledWith(1, 20);
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: HTTP_STATUS.OK,
          success: true,
          data: mockResult,
        }),
      );
    });

    it('should return 200 with SuccessResponse', async () => {
      mockReq.query = { page: '1', limit: '20' };
      vi.mocked(caseStudiesService.getPublishedCaseStudies).mockResolvedValue({
        items: [],
        page: 1,
        limit: 20,
        total: 0,
      });

      await caseStudiesController.listCaseStudies(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockRes.status).toHaveBeenCalledWith(200);
    });
  });

  describe('getCaseStudyById', () => {
    it('should delegate to service with path param', async () => {
      const mockCaseStudy = {
        id: 'cs-1',
        name: 'Study',
        latitude: 9.03,
        longitude: 38.74,
        beforeImageUrl: null,
        afterImageUrl: null,
        evidenceDescription: 'Evidence',
        evidenceUrl: null,
        evidenceTier: null,
        scoreRiseDate: new Date('2023-01-01'),
        confirmedDate: new Date('2023-02-01'),
      };

      mockReq.params = { caseStudyId: 'cs-1' };
      vi.mocked(caseStudiesService.getPublishedCaseStudyById).mockResolvedValue(mockCaseStudy);

      await caseStudiesController.getCaseStudyById(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(caseStudiesService.getPublishedCaseStudyById).toHaveBeenCalledWith('cs-1');
      expect(mockRes.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    });

    it('should propagate 404 error unchanged via next, controller call resolves normally', async () => {
      mockReq.params = { caseStudyId: 'nonexistent' };
      const notFoundError = new ApiError(HTTP_STATUS.NOT_FOUND, 'Case study not found');

      vi.mocked(caseStudiesService.getPublishedCaseStudyById).mockRejectedValue(notFoundError);

      await caseStudiesController.getCaseStudyById(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockNext).toHaveBeenCalledWith(notFoundError);
      expect(mockRes.json).not.toHaveBeenCalled();
    });

    it('should return 200 with SuccessResponse on success', async () => {
      const mockCaseStudy = {
        id: 'cs-1',
        name: 'Study',
        latitude: 9.03,
        longitude: 38.74,
        beforeImageUrl: 'http://example.com/before.jpg',
        afterImageUrl: 'http://example.com/after.jpg',
        evidenceDescription: 'Evidence',
        evidenceUrl: 'http://example.com',
        evidenceTier: 'MARKET_REPORT',
        scoreRiseDate: new Date('2023-01-01'),
        confirmedDate: new Date('2023-02-01'),
      };

      mockReq.params = { caseStudyId: 'cs-1' };
      vi.mocked(caseStudiesService.getPublishedCaseStudyById).mockResolvedValue(mockCaseStudy);

      await caseStudiesController.getCaseStudyById(
        mockReq as Request,
        mockRes as Response,
        mockNext,
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 200,
          success: true,
          data: mockCaseStudy,
        }),
      );
    });
  });
});
