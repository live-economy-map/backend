import { Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { SuccessResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import * as reportRequestsService from '../services/reportRequests.service.js';
import { AuthRequest } from '../types/index.js';

export const createReportRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await reportRequestsService.createReportRequest(req.user!.id, req.body);
  res
    .status(HTTP_STATUS.CREATED)
    .json(
      new SuccessResponse(
        HTTP_STATUS.CREATED,
        'Custom report request submitted successfully',
        result,
      ),
    );
});

export const listUserReportRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await reportRequestsService.listUserReportRequests(req.user!.id);
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'User report requests retrieved', result));
});

export const getUserReportRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await reportRequestsService.getUserReportRequest(
    req.user!.id,
    req.params.id as string,
    req.user!.role,
  );
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Report request details retrieved', result));
});
