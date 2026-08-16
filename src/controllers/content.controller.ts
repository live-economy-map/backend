import type { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import * as contentService from '../services/content.service.js';

export const getLandingContent = asyncHandler(async (req: Request, res: Response) => {
  throw new Error('not implemented');
});

export const getMethodologyContent = asyncHandler(async (req: Request, res: Response) => {
  throw new Error('not implemented');
});