import { Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { SuccessResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import { reportDraftsService } from '../services/reportDrafts.service.js';
import { AuthRequest } from '../types/index.js';

export const generateDraft = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await reportDraftsService.generateDraft(
    req.params.id as string,
    req.user!.id,
    req.body,
  );
  res
    .status(HTTP_STATUS.CREATED)
    .json(
      new SuccessResponse(HTTP_STATUS.CREATED, 'AI report draft generated successfully', result),
    );
});

export const getDraft = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await reportDraftsService.getDraft(req.params.id as string);
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Report draft retrieved successfully', result));
});

export const updateDraft = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await reportDraftsService.updateDraft(
    req.params.id as string,
    req.user!.id,
    req.body,
  );
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Report draft updated successfully', result));
});

export const deliverDraft = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await reportDraftsService.deliverDraft(
    req.params.id as string,
    req.user!.id,
    req.body,
  );
  res
    .status(HTTP_STATUS.OK)
    .json(
      new SuccessResponse(HTTP_STATUS.OK, 'Report draft approved and delivered to user', result),
    );
});
