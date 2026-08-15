import type { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { SuccessResponse } from '../utils/ApiResponse.js';
import * as adminPipelineService from '../services/adminPipeline.service.js';

export const listSources = asyncHandler(async (req: Request, res: Response) => {
  throw new Error('not implemented');
});

export const triggerRefresh = asyncHandler(async (req: Request, res: Response) => {
  throw new Error('not implemented');
});

export const listRuns = asyncHandler(async (req: Request, res: Response) => {
  throw new Error('not implemented');
});

export const triggerRecompute = asyncHandler(async (req: Request, res: Response) => {
  throw new Error('not implemented');
});

export const listWeightConfigs = asyncHandler(async (req: Request, res: Response) => {
  throw new Error('not implemented');
});

export const createWeightConfig = asyncHandler(async (req: Request, res: Response) => {
  throw new Error('not implemented');
});
