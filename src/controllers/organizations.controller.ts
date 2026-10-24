import { Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { SuccessResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import { organizationsService } from '../services/organizations.service.js';
import { AuthRequest } from '../types/index.js';

export const createOrg = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await organizationsService.createOrganization(req.user!.id, req.body);
  res
    .status(HTTP_STATUS.CREATED)
    .json(new SuccessResponse(HTTP_STATUS.CREATED, 'Organization created successfully', result));
});

export const getMyOrgs = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await organizationsService.getUserOrganizations(req.user!.id);
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Organizations retrieved successfully', result));
});

export const getOrg = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await organizationsService.getOrganization(req.params.id as string, req.user!.id);
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Organization details retrieved', result));
});

export const addMember = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await organizationsService.addMember(
    req.params.id as string,
    req.user!.id,
    req.body,
  );
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Member added to organization', result));
});

export const removeMember = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await organizationsService.removeMember(
    req.params.id as string,
    req.user!.id,
    req.params.userId as string,
  );
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Member removed from organization', result));
});
