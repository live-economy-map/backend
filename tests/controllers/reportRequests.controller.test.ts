import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as reportRequestsService from '../../src/services/reportRequests.service.js';
import * as reportRequestsController from '../../src/controllers/reportRequests.controller.js';
import * as adminReportRequestsController from '../../src/controllers/adminReportRequests.controller.js';
import { HTTP_STATUS } from '../../src/constants/index.js';

vi.mock('../../src/services/reportRequests.service.js', () => ({
  createReportRequest: vi.fn(),
  listUserReportRequests: vi.fn(),
  getUserReportRequest: vi.fn(),
  adminListReportRequests: vi.fn(),
  adminUpdateReportRequest: vi.fn(),
  adminAttachDeliverable: vi.fn(),
  getDemandMetrics: vi.fn(),
}));

describe('reportRequests.controllers', () => {
  let req: any;
  let res: any;

  beforeEach(() => {
    vi.clearAllMocks();
    req = {
      user: { id: 'user-1', role: 'USER' },
      params: {},
      query: {},
      body: {},
    };
    res = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn().mockReturnThis(),
    };
  });

  describe('user controller', () => {
    it('createReportRequest returns 201', async () => {
      vi.mocked(reportRequestsService.createReportRequest).mockResolvedValue({
        id: 'req-1',
      } as any);

      await reportRequestsController.createReportRequest(req, res, () => {});
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
    });

    it('listUserReportRequests returns 200', async () => {
      vi.mocked(reportRequestsService.listUserReportRequests).mockResolvedValue([]);

      await reportRequestsController.listUserReportRequests(req, res, () => {});
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    });

    it('getUserReportRequest returns 200', async () => {
      vi.mocked(reportRequestsService.getUserReportRequest).mockResolvedValue({
        id: 'req-1',
      } as any);
      req.params = { id: 'req-1' };

      await reportRequestsController.getUserReportRequest(req, res, () => {});
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    });
  });

  describe('admin controller', () => {
    it('adminListReportRequests returns 200', async () => {
      vi.mocked(reportRequestsService.adminListReportRequests).mockResolvedValue({
        items: [],
        page: 1,
        limit: 10,
        total: 0,
      });

      await adminReportRequestsController.adminListReportRequests(req, res, () => {});
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    });

    it('adminUpdateReportRequest returns 200', async () => {
      vi.mocked(reportRequestsService.adminUpdateReportRequest).mockResolvedValue({
        id: 'req-1',
        status: 'IN_PROGRESS',
      } as any);
      req.params = { id: 'req-1' };

      await adminReportRequestsController.adminUpdateReportRequest(req, res, () => {});
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    });

    it('adminAttachDeliverable returns 201', async () => {
      vi.mocked(reportRequestsService.adminAttachDeliverable).mockResolvedValue({
        id: 'del-1',
      } as any);
      req.params = { id: 'req-1' };

      await adminReportRequestsController.adminAttachDeliverable(req, res, () => {});
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.CREATED);
    });

    it('getDemandMetrics returns 200', async () => {
      vi.mocked(reportRequestsService.getDemandMetrics).mockResolvedValue({
        totalRequests: 12,
        distinctUsersCount: 6,
        statusBreakdown: {},
        gateThreshold: { minDistinctUsers: 5, minTotalRequests: 10 },
        isGateMet: true,
      });

      await adminReportRequestsController.getDemandMetrics(req, res, () => {});
      expect(res.status).toHaveBeenCalledWith(HTTP_STATUS.OK);
    });
  });
});
