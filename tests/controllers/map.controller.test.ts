import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import ApiError from '../../src/utils/ApiError.js';
import { MAP_SEARCH_LOW_CONFIDENCE_MESSAGE } from '../../src/constants/index.js';

vi.mock('../../src/services/map.service.js', () => ({
  getCompositeScoreLayer: vi.fn(),
  getCellDetail: vi.fn(),
  getRawSignalLayer: vi.fn(),
  parseNaturalLanguageQuery: vi.fn(),
}));

import * as mapService from '../../src/services/map.service.js';
import {
  getCells,
  getCellDetail as getCellDetailHandler,
  getRawLayer,
  searchMap,
} from '../../src/controllers/map.controller.js';

function mockRes(): Response {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe.skip('map.controller', () => {
  describe('getCells', () => {
    it('delegates to getCompositeScoreLayer and responds 200 with SuccessResponse', async () => {
      const serviceResult = { period: '2026-06-01', periodSubstituted: false, cells: [] };
      (mapService.getCompositeScoreLayer as any).mockResolvedValue(serviceResult);

      const req = { query: { period: '2026-06-01' } } as unknown as Request;
      const res = mockRes();
      const next = vi.fn() as NextFunction;

      await getCells(req, res, next);

      expect(mapService.getCompositeScoreLayer).toHaveBeenCalledWith('2026-06-01');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 200, message: 'OK', data: serviceResult }),
      );
    });
  });

  describe('getCellDetail', () => {
    it('delegates to service.getCellDetail with cellId and period, responds 200', async () => {
      const detail = { cellId: 'cell-1', compositeScore: 0.74 };
      (mapService.getCellDetail as any).mockResolvedValue(detail);

      const req = {
        params: { cellId: 'cell-1' },
        query: { period: '2026-06-01' },
      } as unknown as Request;
      const res = mockRes();
      const next = vi.fn() as NextFunction;

      await getCellDetailHandler(req, res, next);

      expect(mapService.getCellDetail).toHaveBeenCalledWith('cell-1', '2026-06-01');
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 200, message: 'OK', data: detail }),
      );
    });

    it('propagates a 404 thrown by the service through to error middleware', async () => {
      (mapService.getCellDetail as any).mockRejectedValue(
        new ApiError(404, 'No data available for this cell'),
      );

      const req = { params: { cellId: 'missing' }, query: {} } as unknown as Request;
      const res = mockRes();
      const next = vi.fn() as NextFunction;

      await getCellDetailHandler(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 404, message: 'No data available for this cell' }),
      );
    });
  });

  describe('getRawLayer', () => {
    it('delegates to getRawSignalLayer with sourceKey and period, responds 200', async () => {
      const layer = {
        sourceKey: 'VIIRS',
        period: '2026-06-01',
        periodSubstituted: false,
        cells: [],
      };
      (mapService.getRawSignalLayer as any).mockResolvedValue(layer);

      const req = {
        params: { sourceKey: 'VIIRS' },
        query: { period: '2026-06-01' },
      } as unknown as Request;
      const res = mockRes();
      const next = vi.fn() as NextFunction;

      await getRawLayer(req, res, next);

      expect(mapService.getRawSignalLayer).toHaveBeenCalledWith('VIIRS', '2026-06-01');
      expect(res.status).toHaveBeenCalledWith(200);
    });
  });

  describe('searchMap', () => {
    it('responds 200 with message "OK" when parsedFilters is non-null', async () => {
      (mapService.parseNaturalLanguageQuery as any).mockResolvedValue({
        parsedFilters: { areaLabel: 'Bole' },
        cells: [{ cellId: 'cell-1', compositeScore: 0.74 }],
      });

      const req = { body: { query: 'areas near Bole' } } as unknown as Request;
      const res = mockRes();
      const next = vi.fn() as NextFunction;

      await searchMap(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 200, message: 'OK' }),
      );
    });

    it('responds 200 with MAP_SEARCH_LOW_CONFIDENCE_MESSAGE when parsedFilters is null', async () => {
      (mapService.parseNaturalLanguageQuery as any).mockResolvedValue({
        parsedFilters: null,
        cells: [],
      });

      const req = { body: { query: 'asdf jkl' } } as unknown as Request;
      const res = mockRes();
      const next = vi.fn() as NextFunction;

      await searchMap(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 200, message: MAP_SEARCH_LOW_CONFIDENCE_MESSAGE }),
      );
    });

    it('propagates the 400 unavailable error unchanged, never rewritten into the low-confidence message', async () => {
      (mapService.parseNaturalLanguageQuery as any).mockRejectedValue(
        new ApiError(400, 'Search is temporarily unavailable'),
      );

      const req = { body: { query: 'areas near Bole' } } as unknown as Request;
      const res = mockRes();
      const next = vi.fn() as NextFunction;

      await searchMap(req, res, next);

      expect(next).toHaveBeenCalledWith(
        expect.objectContaining({ statusCode: 400, message: 'Search is temporarily unavailable' }),
      );
    });
  });
});
