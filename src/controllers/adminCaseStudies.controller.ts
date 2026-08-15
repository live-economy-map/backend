import type { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { SuccessResponse } from '../utils/ApiResponse.js';
import * as adminCaseStudiesService from '../services/adminCaseStudies.service.js';

export const listAllCaseStudies = asyncHandler(async (req: Request, res: Response) => {
  throw new Error('not implemented');
});

export const createCaseStudy = asyncHandler(async (req: Request, res: Response) => {
  throw new Error('not implemented');
});

export const updateCaseStudy = asyncHandler(async (req: Request, res: Response) => {
  throw new Error('not implemented');
});

export const deleteCaseStudy = asyncHandler(async (req: Request, res: Response) => {
  throw new Error('not implemented');
});

export const discoverCandidates = asyncHandler(async (req: Request, res: Response) => {
  throw new Error('not implemented');
});
