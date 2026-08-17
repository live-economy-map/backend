import type { Request, Response, NextFunction } from 'express';
import asyncHandler from '../utils/asyncHandler.js';
import { SuccessResponse } from '../utils/ApiResponse.js';
import * as mapService from '../services/map.service.js';
import { MAP_SEARCH_LOW_CONFIDENCE_MESSAGE, HTTP_STATUS } from '../constants/index.js';

export const getCells = asyncHandler(async (req: Request, res: Response, _next: NextFunction) => {
  const { period } = req.query as any;
  const result = await mapService.getCompositeScoreLayer(period);
  res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, 'OK', result));
});

export const getCellDetail = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const { cellId } = req.params as any;
    const { period } = req.query as any;
    try {
      const result = await mapService.getCellDetail(cellId, period);
      res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, 'OK', result));
    } catch (error) {
      next(error);
    }
  },
);

export const getRawLayer = asyncHandler(
  async (req: Request, res: Response, _next: NextFunction) => {
    const { sourceKey } = req.params as any;
    const { period } = req.query as any;
    const result = await mapService.getRawSignalLayer(sourceKey, period);
    res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, 'OK', result));
  },
);

export const searchMap = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  const { query } = req.body as any;
  try {
    const result = await mapService.parseNaturalLanguageQuery(query);
    const message = result.parsedFilters ? 'OK' : MAP_SEARCH_LOW_CONFIDENCE_MESSAGE;
    res.status(HTTP_STATUS.OK).json(new SuccessResponse(HTTP_STATUS.OK, message, result));
  } catch (error) {
    next(error);
  }
});
