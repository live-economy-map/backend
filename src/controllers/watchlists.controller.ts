import { Response } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { SuccessResponse } from '../utils/ApiResponse.js';
import { HTTP_STATUS } from '../constants/index.js';
import { watchlistsService } from '../services/watchlists.service.js';
import { AuthRequest } from '../types/index.js';

export const createWatchlist = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = req.body.orgId || (req.headers['x-org-id'] as string) || undefined;
  const result = await watchlistsService.createWatchlist(req.user!.id, { ...req.body, orgId });
  res
    .status(HTTP_STATUS.CREATED)
    .json(new SuccessResponse(HTTP_STATUS.CREATED, 'Watchlist created successfully', result));
});

export const listWatchlists = asyncHandler(async (req: AuthRequest, res: Response) => {
  const orgId = (req.headers['x-org-id'] as string) || (req.query.orgId as string) || undefined;
  const result = await watchlistsService.listUserWatchlists(req.user!.id, orgId);
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Watchlists retrieved successfully', result));
});

export const getWatchlist = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await watchlistsService.getWatchlist(req.user!.id, req.params.id as string);
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Watchlist details retrieved', result));
});

export const addItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await watchlistsService.addItem(req.user!.id, req.params.id as string, req.body);
  res
    .status(HTTP_STATUS.CREATED)
    .json(new SuccessResponse(HTTP_STATUS.CREATED, 'Cell added to watchlist', result));
});

export const removeItem = asyncHandler(async (req: AuthRequest, res: Response) => {
  const result = await watchlistsService.removeItem(
    req.user!.id,
    req.params.id as string,
    req.params.cellId as string,
  );
  res
    .status(HTTP_STATUS.OK)
    .json(new SuccessResponse(HTTP_STATUS.OK, 'Cell removed from watchlist', result));
});
