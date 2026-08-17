import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import * as adminPipelineService from '../../src/services/adminPipeline.service.js';
import ApiError from '../../src/utils/ApiError.js';
import {
  listSources,
  triggerRefresh,
  listRuns,
  triggerRecompute,
  listWeightConfigs,
  createWeightConfig,
} from '../../src/controllers/adminPipeline.controller.js';

vi.mock('../../src/services/adminPipeline.service.js');

beforeEach(() => {
  vi.clearAllMocks();
});

const mockRes = () => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
};

describe('adminPipeline.controller', () => {
  describe('listSources', () => {
    it('delegates to getSourcesWithHealth and responds 200', async () => {
      const sources = [{ key: 'VIIRS' }];
      (adminPipelineService.getSourcesWithHealth as any).mockResolvedValue(sources);
      const req = {} as Request;
      const res = mockRes();

      await listSources(req, res, vi.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 200, message: 'OK', data: { sources } }),
      );
    });
  });

  describe('triggerRefresh', () => {
    it('calls startPipelineRun with sourceKey + user id, and responds 202', async () => {
      const result = { pipelineRunId: 'run-1', status: 'RUNNING' };
      (adminPipelineService.startPipelineRun as any).mockResolvedValue(result);
      const req = {
        params: { sourceKey: 'VIIRS' },
        user: { id: 'admin-1' },
      } as unknown as Request;
      const res = mockRes();

      await triggerRefresh(req, res, vi.fn());

      expect(adminPipelineService.startPipelineRun).toHaveBeenCalledWith('VIIRS', 'admin-1');
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 202, message: 'Refresh started', data: result }),
      );
    });

    it('propagates a 409 conflict unchanged via asyncHandler', async () => {
      (adminPipelineService.startPipelineRun as any).mockRejectedValue(
        new ApiError(409, 'A refresh for this source is already in progress'),
      );
      const req = {
        params: { sourceKey: 'VIIRS' },
        user: { id: 'admin-1' },
      } as unknown as Request;
      const res = mockRes();
      const next = vi.fn();

      await triggerRefresh(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });

  describe('listRuns', () => {
    it('delegates to getPipelineRuns with query params and responds 200', async () => {
      const result = { items: [], page: 1, limit: 20, total: 0 };
      (adminPipelineService.getPipelineRuns as any).mockResolvedValue(result);
      const req = { query: { sourceKey: 'GHSL', page: '1', limit: '20' } } as unknown as Request;
      const res = mockRes();

      await listRuns(req, res, vi.fn());

      expect(adminPipelineService.getPipelineRuns).toHaveBeenCalledWith('GHSL', '1', '20');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('triggerRecompute', () => {
    it('calls recomputeCompositeScores with period + user id, and responds 202', async () => {
      const result = { period: '2026-06-01', scoreWeightConfigId: 'cfg-1' };
      (adminPipelineService.recomputeCompositeScores as any).mockResolvedValue(result);
      const req = {
        body: { period: '2026-06-01' },
        user: { id: 'admin-1' },
      } as unknown as Request;
      const res = mockRes();

      await triggerRecompute(req, res, vi.fn());

      expect(adminPipelineService.recomputeCompositeScores).toHaveBeenCalledWith(
        '2026-06-01',
        'admin-1',
      );
      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 202,
          message: 'Recomputation started',
          data: result,
        }),
      );
    });

    it('propagates a 409 no-active-config error unchanged', async () => {
      (adminPipelineService.recomputeCompositeScores as any).mockRejectedValue(
        new ApiError(409, 'No active weight configuration — create one first'),
      );
      const req = {
        body: { period: '2026-06-01' },
        user: { id: 'admin-1' },
      } as unknown as Request;
      const res = mockRes();
      const next = vi.fn();

      await triggerRecompute(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(ApiError));
    });
  });

  describe('listWeightConfigs', () => {
    it('delegates to getWeightConfigs and responds 200', async () => {
      const configs = [{ id: 'cfg-1' }];
      (adminPipelineService.getWeightConfigs as any).mockResolvedValue(configs);
      const req = {} as Request;
      const res = mockRes();

      await listWeightConfigs(req, res, vi.fn());

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 200, message: 'OK', data: { configs } }),
      );
    });
  });

  describe('createWeightConfig', () => {
    it('calls createAndActivateWeightConfig with weights + user id, and responds 201', async () => {
      const config = { id: 'cfg-new', isActive: true, weights: [] };
      (adminPipelineService.createAndActivateWeightConfig as any).mockResolvedValue(config);
      const weights = [
        { sourceKey: 'VIIRS', weight: 0.4 },
        { sourceKey: 'GHSL', weight: 0.35 },
        { sourceKey: 'RWI', weight: 0.25 },
      ];
      const req = {
        body: { weights },
        user: { id: 'admin-1' },
      } as unknown as Request;
      const res = mockRes();

      await createWeightConfig(req, res, vi.fn());

      expect(adminPipelineService.createAndActivateWeightConfig).toHaveBeenCalledWith(
        weights,
        'admin-1',
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          statusCode: 201,
          message: 'Weight configuration created and activated',
          data: config,
        }),
      );
    });
  });
});
