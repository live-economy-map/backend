import type { Request, Response, NextFunction } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { SuccessResponse } from '../utils/ApiResponse.js';
import * as caseStudiesService from '../services/caseStudies.service.js';
import { HTTP_STATUS } from '../constants/index.js';

export const listCaseStudies = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const page = Number(req.query.page ?? 1);
    const limit = Number(req.query.limit ?? 20);

    const result = await caseStudiesService.getPublishedCaseStudies(page, limit);

    res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, 'OK', result));
  },
);

export const getCaseStudyById = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const caseStudyId = req.params.caseStudyId as string;

    const caseStudy = await caseStudiesService.getPublishedCaseStudyById(caseStudyId);

    res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, 'OK', caseStudy));
  },
);
