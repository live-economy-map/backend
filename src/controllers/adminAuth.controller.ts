import asyncHandler from '../utils/asyncHandler.js';
import { SuccessResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import * as adminAuthService from '../services/adminAuth.service.js';
import { AuthRequest } from '../types/index.js';
import { Request, Response } from 'express';

export const login = asyncHandler(async (req, res: Response) => {
  const { email, password } = req.body;
  const result = await adminAuthService.authenticateAdmin(email, password);
  res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, 'Login successful', result));
});

export const logout = asyncHandler(async (req: AuthRequest, res: Response) => {
  await adminAuthService.invalidateSession((req as any).token);
  res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, 'Logged out', {}));
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const { id, email, createdAt } = req.user!;
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'OK', { id, email, createdAt }));
});
