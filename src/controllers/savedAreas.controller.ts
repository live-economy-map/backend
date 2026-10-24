import { Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { SuccessResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import * as savedAreasService from '../services/savedAreas.service.js';
import { AuthRequest } from '../types/index.js';

export const listSavedAreas = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await savedAreasService.listSavedAreas(req.user!.id);
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Saved areas retrieved', result));
});

export const createSavedArea = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await savedAreasService.createSavedArea(req.user!.id, req.body);
  res
    .status(HTTP_STATUS.CREATED)
    .json(new SuccessResponse(HTTP_STATUS.CREATED, 'Grid cell bookmarked successfully', result));
});

export const updateSavedArea = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await savedAreasService.updateSavedArea(
    req.user!.id,
    req.params.id as string,
    req.body,
  );
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Bookmark updated successfully', result));
});

export const deleteSavedArea = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await savedAreasService.deleteSavedArea(req.user!.id, req.params.id as string);
  res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, result.message, {}));
});
