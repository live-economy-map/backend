import { Response } from 'express';
import { AuthRequest } from '../types/index.js';
import asyncHandler from '../utils/asyncHandler.js';
import { SuccessResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import * as adminPipelineService from '../services/adminPipeline.service.js';
import { DataSourceKey } from '@prisma/client';

export const listSources = asyncHandler(async (req: AuthRequest, res: Response) => {
  const sources = await adminPipelineService.getSourcesWithHealth();
  res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, 'OK', { sources }));
});

export const triggerRefresh = asyncHandler(async (req: AuthRequest, res: Response) => {
  const sourceKey = req.params.sourceKey as DataSourceKey;
  const result = await adminPipelineService.startPipelineRun(sourceKey, req.user!.id);
  res
    .status(HTTP_STATUS.ACCEPTED)
    .json(new SuccessResponse(HTTP_STATUS.ACCEPTED, 'Refresh started', result));
});

export const listRuns = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { sourceKey, page, limit } = req.query as {
    sourceKey?: DataSourceKey;
    page?: string;
    limit?: string;
  };
  const result = await adminPipelineService.getPipelineRuns(sourceKey, page, limit);
  res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, 'OK', result));
});

export const triggerRecompute = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { period } = req.body;
  const result = await adminPipelineService.recomputeCompositeScores(period, req.user!.id);
  res
    .status(HTTP_STATUS.ACCEPTED)
    .json(new SuccessResponse(HTTP_STATUS.ACCEPTED, 'Recomputation started', result));
});

export const listWeightConfigs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const configs = await adminPipelineService.getWeightConfigs();
  res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, 'OK', { configs }));
});

export const createWeightConfig = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { weights } = req.body;
  const config = await adminPipelineService.createAndActivateWeightConfig(weights, req.user!.id);
  res
    .status(HTTP_STATUS.CREATED)
    .json(
      new SuccessResponse(
        HTTP_STATUS.CREATED,
        'Weight configuration created and activated',
        config,
      ),
    );
});
