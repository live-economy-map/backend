import { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { SuccessResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import { apiPlatformService } from '../services/apiPlatform.service.js';
import { AuthRequest } from '../types/index.js';

export const createApiKey = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await apiPlatformService.createApiKey(req.user!.id, req.body);
  res
    .status(HTTP_STATUS.CREATED)
    .json(new SuccessResponse(HTTP_STATUS.CREATED, 'API key created successfully', result));
});

export const listApiKeys = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await apiPlatformService.listApiKeys(
    req.user!.id,
    req.query.orgId as string | undefined,
  );
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'API keys retrieved successfully', result));
});

export const revokeApiKey = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await apiPlatformService.revokeApiKey(req.user!.id, req.params.id as string);
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'API key revoked successfully', result));
});

export const getPublicCells = asyncHandler(async (req: Request, res: Response) => {
  const result = await apiPlatformService.getPublicCells(req.query as any);
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Grid cells retrieved successfully', result));
});

export const getPublicScores = asyncHandler(async (req: Request, res: Response) => {
  const result = await apiPlatformService.getPublicScores(req.query as any);
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Composite scores retrieved successfully', result));
});

export const getPublicHistory = asyncHandler(async (req: Request, res: Response) => {
  const limit = req.query.limit ? Number(req.query.limit) : 24;
  const result = await apiPlatformService.getPublicHistory(req.params.cellId as string, limit);
  res
    .status(HTTP_STATUS.OK)
    .json(
      new SuccessResponse(
        HTTP_STATUS.OK,
        'Cell historical telemetry retrieved successfully',
        result,
      ),
    );
});
