import type { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { SuccessResponse } from '../utils/ApiResponse.js';
import * as caseStudiesService from '../services/caseStudies.service.js';
import { HTTP_STATUS } from '../constants/index.js';
import type { ListCaseStudiesQuery } from '../schemas/caseStudies.schema.js';

export const listCaseStudies = asyncHandler(async (req: Request, res: Response) => {
  const { page, limit } = req.body as ListCaseStudiesQuery;
  const result = await caseStudiesService.getPublishedCaseStudies(page, limit);
  res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, 'OK', result));
});

export const getCaseStudyById = asyncHandler(async (req: Request, res: Response) => {
  const caseStudyId = req.params.caseStudyId as string; // ← Add `as string`
  const caseStudy = await caseStudiesService.getPublishedCaseStudyById(caseStudyId);
  res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, 'OK', caseStudy));
});
