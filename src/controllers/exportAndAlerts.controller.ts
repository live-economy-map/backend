import { Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { SuccessResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import { exportService } from '../services/export.service.js';
import { alertsService } from '../services/alerts.service.js';
import { AuthRequest } from '../types/index.js';

export const exportData = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await exportService.exportData(req.user!.id, req.query as any);

  if (result.format === 'CSV') {
    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.status(HTTP_STATUS.OK).send(result.data);
    return;
  }

  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Data exported successfully', result.data));
});

export const createAlertRule = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await alertsService.createAlertRule(req.user!.id, req.body, req.user!.role);
  res
    .status(HTTP_STATUS.CREATED)
    .json(new SuccessResponse(HTTP_STATUS.CREATED, 'Alert rule created successfully', result));
});

export const listAlertRules = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await alertsService.listAlertRules(req.user!.id);
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Alert rules retrieved successfully', result));
});

export const updateAlertRule = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await alertsService.updateAlertRule(
    req.user!.id,
    req.params.id as string,
    req.body,
  );
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Alert rule updated successfully', result));
});

export const deleteAlertRule = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await alertsService.deleteAlertRule(req.user!.id, req.params.id as string);
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Alert rule deleted successfully', result));
});

export const listNotifications = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await alertsService.listUserNotifications(req.user!.id, req.query as any);
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Notifications retrieved successfully', result));
});

export const markNotificationRead = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await alertsService.markNotificationRead(req.user!.id, req.params.id as string);
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Notification marked as read', result));
});
