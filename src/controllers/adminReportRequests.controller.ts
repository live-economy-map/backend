import { Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { SuccessResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import * as reportRequestsService from '../services/reportRequests.service.js';
import { AuthRequest } from '../types/index.js';
import { AdminReportRequestsQuery } from '../schemas/reportRequests.schema.js';

export const adminListReportRequests = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await reportRequestsService.adminListReportRequests(
    req.query as unknown as AdminReportRequestsQuery,
  );
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Admin report requests queue retrieved', result));
});

export const adminUpdateReportRequest = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await reportRequestsService.adminUpdateReportRequest(
    req.user!.id,
    req.params.id as string,
    req.body,
  );
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Report request updated successfully', result));
});

export const adminAttachDeliverable = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await reportRequestsService.adminAttachDeliverable(
    req.user!.id,
    req.params.id as string,
    req.body,
  );
  res
    .status(HTTP_STATUS.CREATED)
    .json(
      new SuccessResponse(
        HTTP_STATUS.CREATED,
        'Deliverable attached successfully and status marked DELIVERED',
        result,
      ),
    );
});

export const getDemandMetrics = asyncHandler(async (_req: AuthRequest, res: Response) => {
  const metrics = await reportRequestsService.getDemandMetrics();
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'V2 demand metrics retrieved', metrics));
});
