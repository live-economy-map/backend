import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { HTTP_STATUS } from '../../src/constants/index.js';
import ApiError from '../../src/utils/ApiError.js';

vi.mock('../../src/services/adminCaseStudies.service.js', () => ({
  getAllCaseStudies: vi.fn(),
  createCaseStudy: vi.fn(),
  updateCaseStudy: vi.fn(),
  deleteCaseStudy: vi.fn(),
  searchCaseStudyCandidates: vi.fn(),
}));

import * as adminCaseStudiesService from '../../src/services/adminCaseStudies.service.js';
import {
  listAllCaseStudies,
  createCaseStudy,
  updateCaseStudy,
  deleteCaseStudy,
  discoverCandidates,
} from '../../src/controllers/adminCaseStudies.controller.js';

function mockRes(): Response {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('adminCaseStudies.controller', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('listAllCaseStudies', () => {
    it('delegates to getAllCaseStudies with query params and responds 200', async () => {
      const req = {
        query: { isPublished: 'false', page: '1', limit: '20' },
        user: { id: 'admin-1' },
      } as unknown as Request;
      const res = mockRes();
      const next = vi.fn();
      const serviceResult = { items: [], page: 1, limit: 20, total: 0 };
      (adminCaseStudiesService.getAllCaseStudies as any).mockResolvedValue(serviceResult);

      await listAllCaseStudies(req, res, next);

      expect(adminCaseStudiesService.getAllCaseStudies).toHaveBeenCalledWith(
        req.query.isPublished,
        req.query.page,
        req.query.limit,
      );
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 200, message: 'OK', data: serviceResult }),
      );
    });
  });

  describe('createCaseStudy', () => {
    it('responds 201 with "Case study created" when there is no date-order warning', async () => {
      const req = { body: { name: 'Bole' }, user: { id: 'admin-1' } } as unknown as Request;
      const res = mockRes();
      const next = vi.fn();
      (adminCaseStudiesService.createCaseStudy as any).mockResolvedValue({
        caseStudy: { id: '1' },
        dateOrderWarning: false,
      });

      await createCaseStudy(req, res, next);

      expect(adminCaseStudiesService.createCaseStudy).toHaveBeenCalledWith(
        req.body,
        (req as any).user.id,
      );
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 201, message: 'Case study created' }),
      );
    });

    it('responds 201 with the date-order-warning message when dateOrderWarning is true', async () => {
      const req = { body: { name: 'Bole' }, user: { id: 'admin-1' } } as unknown as Request;
      const res = mockRes();
      const next = vi.fn();
      (adminCaseStudiesService.createCaseStudy as any).mockResolvedValue({
        caseStudy: { id: '1' },
        dateOrderWarning: true,
      });

      await createCaseStudy(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
      const jsonArg = (res.json as any).mock.calls[0][0];
      expect(jsonArg.message).toMatch(/scoreRiseDate is after confirmedDate/i);
    });

    it('propagates a 404 grid-cell-not-found error via next, unchanged', async () => {
      const req = { body: { gridCellId: 'bad-id' }, user: { id: 'admin-1' } } as unknown as Request;
      const res = mockRes();
      const next = vi.fn();
      const error = new ApiError(HTTP_STATUS.NOT_FOUND, 'Grid cell not found');
      (adminCaseStudiesService.createCaseStudy as any).mockRejectedValue(error);

      await createCaseStudy(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
      expect(res.json).not.toHaveBeenCalled();
    });
  });

  describe('updateCaseStudy', () => {
    it('responds 200 with the warning-branch message when dateOrderWarning is true', async () => {
      const req = {
        params: { caseStudyId: '1' },
        body: { evidenceUrl: 'https://x.com' },
        user: { id: 'admin-1' },
      } as unknown as Request;
      const res = mockRes();
      const next = vi.fn();
      (adminCaseStudiesService.updateCaseStudy as any).mockResolvedValue({
        caseStudy: { id: '1' },
        dateOrderWarning: true,
      });

      await updateCaseStudy(req, res, next);

      expect(adminCaseStudiesService.updateCaseStudy).toHaveBeenCalledWith(
        req.params.caseStudyId,
        req.body,
      );
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      const jsonArg = (res.json as any).mock.calls[0][0];
      expect(jsonArg.message).toMatch(/scoreRiseDate is after confirmedDate/i);
    });

    it('responds 200 with the normal (non-warning) message when dateOrderWarning is false', async () => {
      const req = {
        params: { caseStudyId: '1' },
        body: { evidenceUrl: 'https://x.com' },
        user: { id: 'admin-1' },
      } as unknown as Request;
      const res = mockRes();
      const next = vi.fn();
      (adminCaseStudiesService.updateCaseStudy as any).mockResolvedValue({
        caseStudy: { id: '1' },
        dateOrderWarning: false,
      });

      await updateCaseStudy(req, res, next);

      const jsonArg = (res.json as any).mock.calls[0][0];
      expect(jsonArg.message).not.toMatch(/scoreRiseDate is after confirmedDate/i);
    });

    it('propagates a 404 case-study-not-found error via next, unchanged', async () => {
      const req = {
        params: { caseStudyId: 'bad-id' },
        body: {},
        user: { id: 'admin-1' },
      } as unknown as Request;
      const res = mockRes();
      const next = vi.fn();
      const error = new ApiError(HTTP_STATUS.NOT_FOUND, 'Case study not found');
      (adminCaseStudiesService.updateCaseStudy as any).mockRejectedValue(error);

      await updateCaseStudy(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });

  describe('deleteCaseStudy', () => {
    it('delegates to deleteCaseStudy and responds 200 with an empty data payload', async () => {
      const req = { params: { caseStudyId: '1' } } as unknown as Request;
      const res = mockRes();
      const next = vi.fn();
      (adminCaseStudiesService.deleteCaseStudy as any).mockResolvedValue(undefined);

      await deleteCaseStudy(req, res, next);

      expect(adminCaseStudiesService.deleteCaseStudy).toHaveBeenCalledWith(req.params.caseStudyId);
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 200, message: 'Case study deleted', data: {} }),
      );
    });
  });

  describe('discoverCandidates', () => {
    it('responds 200 with message "OK" when candidates are found', async () => {
      const req = { body: { areaFocus: 'Ayat' } } as unknown as Request;
      const res = mockRes();
      const next = vi.fn();
      (adminCaseStudiesService.searchCaseStudyCandidates as any).mockResolvedValue({
        candidates: [
          {
            summary: 'x',
            sourceUrl: 'https://x.com',
            suggestedEvidenceTier: 'LOCAL_NEWS',
            mentionedDate: '2026-07-20',
          },
        ],
      });

      await discoverCandidates(req, res, next);

      expect(adminCaseStudiesService.searchCaseStudyCandidates).toHaveBeenCalledWith(
        req.body.areaFocus,
      );
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      const jsonArg = (res.json as any).mock.calls[0][0];
      expect(jsonArg.message).toBe('OK');
    });

    it('responds 200 (not an error status) with "No relevant candidates found" when candidates is empty', async () => {
      const req = { body: { areaFocus: 'Nowhere' } } as unknown as Request;
      const res = mockRes();
      const next = vi.fn();
      (adminCaseStudiesService.searchCaseStudyCandidates as any).mockResolvedValue({
        candidates: [],
      });

      await discoverCandidates(req, res, next);

      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
      const jsonArg = (res.json as any).mock.calls[0][0];
      expect(jsonArg.message).toBe('No relevant candidates found');
    });

    it('propagates the 400 discovery-unavailable error via next, unchanged', async () => {
      const req = { body: { areaFocus: 'Ayat' } } as unknown as Request;
      const res = mockRes();
      const next = vi.fn();
      const error = new ApiError(
        HTTP_STATUS.BAD_REQUEST,
        'Discovery search is temporarily unavailable',
      );
      (adminCaseStudiesService.searchCaseStudyCandidates as any).mockRejectedValue(error);

      await discoverCandidates(req, res, next);

      expect(next).toHaveBeenCalledWith(error);
    });
  });
});
