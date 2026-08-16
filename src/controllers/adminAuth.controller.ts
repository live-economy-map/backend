import type { Request, Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { SuccessResponse } from '../utils/ApiResponse.js';
import * as adminAuthService from '../services/adminAuth.service.js';

export const login = asyncHandler(async (req: Request, res: Response) => {
  throw new Error('not implemented');
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  throw new Error('not implemented');
});

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  throw new Error('not implemented');
});
