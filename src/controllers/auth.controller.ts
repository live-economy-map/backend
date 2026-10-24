import { Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { SuccessResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import * as authService from '../services/auth.service.js';
import { AuthRequest } from '../types/index.js';

export const register = asyncHandler(async (req, res: Response) => {
  const result = await authService.registerUser(req.body);
  res
    .status(HTTP_STATUS.CREATED)
    .json(new SuccessResponse(HTTP_STATUS.CREATED, 'Registration successful', result));
});

export const login = asyncHandler(async (req, res: Response) => {
  const result = await authService.loginUser(req.body);
  res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, 'Login successful', result));
});

export const logout = asyncHandler(async (_req: AuthRequest, res: Response) => {
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Logged out successfully', {}));
});

export const verifyEmail = asyncHandler(async (req, res: Response) => {
  const token = (req.body?.token || req.query?.token) as string;
  const result = await authService.verifyEmail(token);
  res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, result.message, {}));
});

export const forgotPassword = asyncHandler(async (req, res: Response) => {
  const result = await authService.requestPasswordReset(req.body.email);
  res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, result.message, {}));
});

export const resetPassword = asyncHandler(async (req, res: Response) => {
  const result = await authService.resetPassword(req.body.token, req.body.newPassword);
  res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, result.message, {}));
});

export const getMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const profile = await authService.getProfile(req.user!.id);
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'User profile retrieved', profile));
});

export const patchMe = asyncHandler(async (req: AuthRequest, res: Response) => {
  const updatedProfile = await authService.updateProfile(req.user!.id, req.body);
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Profile updated successfully', updatedProfile));
});
