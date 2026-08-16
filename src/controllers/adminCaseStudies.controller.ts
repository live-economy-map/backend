import type { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { SuccessResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import * as adminCaseStudiesService from '../services/adminCaseStudies.service.js';

export const listAllCaseStudies = asyncHandler(async (req: Request, res: Response) => {
  const { isPublished, page, limit } = req.query;
  const result = await adminCaseStudiesService.getAllCaseStudies(
    isPublished as any,
    page as any,
    limit as any,
  );
  res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, 'OK', result));
});

export const createCaseStudy = asyncHandler(async (req: Request, res: Response) => {
  const result = await adminCaseStudiesService.createCaseStudy(req.body, (req as any).user.id);
  const message = result.dateOrderWarning
    ? 'Case study created — note: scoreRiseDate is after confirmedDate, which is unexpected for a validation case study'
    : 'Case study created';
  res
    .status(HTTP_STATUS.CREATED)
    .json(new SuccessResponse(HTTP_STATUS.CREATED, message, result.caseStudy));
});

export const updateCaseStudy = asyncHandler(async (req: Request, res: Response) => {
  const caseStudyId = req.params.caseStudyId as string;
  const result = await adminCaseStudiesService.updateCaseStudy(caseStudyId, req.body);
  const message = result.dateOrderWarning
    ? 'Case study updated — note: scoreRiseDate is after confirmedDate, which is unexpected for a validation case study'
    : 'Case study updated';
  res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, message, result.caseStudy));
});

export const deleteCaseStudy = asyncHandler(async (req: Request, res: Response) => {
  const caseStudyId = req.params.caseStudyId as string;
  await adminCaseStudiesService.deleteCaseStudy(caseStudyId);
  res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, 'Case study deleted', {}));
});

export const discoverCandidates = asyncHandler(async (req: Request, res: Response) => {
  const { areaFocus } = req.body;
  const result = await adminCaseStudiesService.searchCaseStudyCandidates(areaFocus);
  const message = result.candidates.length > 0 ? 'OK' : 'No relevant candidates found';
  res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, message, result));
});
