import type { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { SuccessResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import * as contentService from '../services/content.service.js';

export const getLandingContent = asyncHandler(async (req: Request, res: Response) => {
  const result = await contentService.getLandingStats();
  res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, 'OK', result));
});

export const getMethodologyContent = asyncHandler(async (req: Request, res: Response) => {
  const result = await contentService.getMethodologyContent();
  res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, 'OK', result));
});

export const getAboutContent = asyncHandler(async (req: Request, res: Response) => {
  const result = await contentService.getAboutPageContent();
  res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, 'OK', result));
});
