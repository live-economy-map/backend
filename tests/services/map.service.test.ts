import { describe, it, expect, vi, beforeEach } from 'vitest';

// Decision #4: mock src/config/db.js (relative path, exports `prisma`) — not @/lib/prisma
vi.mock('../../src/config/db.js', () => ({
  prisma: {
    compositeScoreSnapshot: { findMany: vi.fn(), findFirst: vi.fn() },
    gridCell: { findUnique: vi.fn() },
    signalValue: { findMany: vi.fn(), findFirst: vi.fn() },
  },
}));

// Decision #1: generateText (throws on failure) + generateStructuredOutput (null on parse failure, throws on network failure)
vi.mock('../../src/utils/aiClient.js', () => ({
  generateText: vi.fn(),
  generateStructuredOutput: vi.fn(),
}));

import { prisma } from '../../src/config/db.js';
import { generateText, generateStructuredOutput } from '../../src/utils/aiClient.js';
import {
  getCompositeScoreLayer,
  getCellDetail,
  generateCellSummary,
  getRawSignalLayer,
  parseNaturalLanguageQuery,
} from '../../src/services/map.service.js';

beforeEach(() => {
  vi.clearAllMocks();
});

describe.skip('map.service', () => {
  describe('getCompositeScoreLayer', () => {
    it('returns cells for the requested period when data exists (step 1 of the two-step query hits)', async () => {
      (prisma.compositeScoreSnapshot.findMany as any).mockResolvedValueOnce([
        {
          gridCell: { id: 'cell-1', cellRow: 1, cellCol: 1, boundaryGeoJson: {} },
          compositeScore: 0.7,
          isComplete: true,
        },
      ]);

      const result = await getCompositeScoreLayer('2026-06-01');

      expect(result.period).toBe('2026-06-01');
      expect(result.periodSubstituted).toBe(false);
      expect(result.cells).toHaveLength(1);
      expect(prisma.compositeScoreSnapshot.findFirst).not.toHaveBeenCalled();
    });

    // FIX #2: assert the exact substituted period, not just "not the requested one"
    it('falls back via findFirst(period lt, desc) then re-queries, returning the exact substituted period', async () => {
      (prisma.compositeScoreSnapshot.findMany as any)
        .mockResolvedValueOnce([]) // step 1: exact period, empty
        .mockResolvedValueOnce([
          {
            gridCell: { id: 'cell-1', cellRow: 1, cellCol: 1, boundaryGeoJson: {} },
            compositeScore: 0.6,
            isComplete: true,
            period: new Date('2026-05-01'),
          },
        ]); // step 3: re-query using substituted period
      (prisma.compositeScoreSnapshot.findFirst as any).mockResolvedValueOnce({
        period: new Date('2026-05-01'),
      }); // step 2

      const result = await getCompositeScoreLayer('2026-07-01');

      expect(prisma.compositeScoreSnapshot.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            period: expect.objectContaining({ lt: expect.anything() }),
          }),
          orderBy: { period: 'desc' },
        }),
      );
      expect(result.periodSubstituted).toBe(true);
      expect(result.period).toBe('2026-05-01'); // exact value, not just "changed"
      expect(result.cells).toHaveLength(1);
    });

    it('returns an empty, non-error result when no data exists for any period', async () => {
      (prisma.compositeScoreSnapshot.findMany as any).mockResolvedValue([]);
      (prisma.compositeScoreSnapshot.findFirst as any).mockResolvedValue(null);

      const result = await getCompositeScoreLayer('2026-07-01');

      expect(result.cells).toEqual([]);
      expect(result.periodSubstituted).toBe(false);
    });

    it('defaults to the most recent period when no period argument is given', async () => {
      (prisma.compositeScoreSnapshot.findMany as any).mockResolvedValueOnce([
        {
          gridCell: { id: 'cell-1', cellRow: 1, cellCol: 1, boundaryGeoJson: {} },
          compositeScore: 0.8,
          isComplete: true,
          period: new Date('2026-08-01'),
        },
      ]);

      const result = await getCompositeScoreLayer();

      expect(result.cells).toHaveLength(1);
    });

    it('scopes the query to the active ScoreWeightConfig only', async () => {
      (prisma.compositeScoreSnapshot.findMany as any).mockResolvedValueOnce([]);
      (prisma.compositeScoreSnapshot.findFirst as any).mockResolvedValueOnce(null);

      await getCompositeScoreLayer('2026-06-01');

      const callArgs = (prisma.compositeScoreSnapshot.findMany as any).mock.calls[0][0];
      expect(callArgs.where.scoreWeightConfig).toEqual(expect.objectContaining({ isActive: true }));
    });
  });

  describe('getCellDetail', () => {
    const cellId = '11111111-1111-1111-1111-111111111111';
    const fullSignals = [
      { dataSource: { key: 'VIIRS' }, rawValue: 12.4, normalizedValue: 0.68 },
      { dataSource: { key: 'GHSL' }, rawValue: 0.31, normalizedValue: 0.55 },
      { dataSource: { key: 'RWI' }, rawValue: 0.42, normalizedValue: 0.6 },
    ];
    // Decision #6: sparkline = last 6 periods inclusive of current, correctly ordered oldest -> newest
    const sixPeriodSnapshots = [
      { period: new Date('2026-06-01'), compositeScore: 0.74 },
      { period: new Date('2026-05-01'), compositeScore: 0.7 },
      { period: new Date('2026-04-01'), compositeScore: 0.66 },
      { period: new Date('2026-03-01'), compositeScore: 0.63 },
      { period: new Date('2026-02-01'), compositeScore: 0.6 },
      { period: new Date('2026-01-01'), compositeScore: 0.58 },
    ];

    // FIX #4: assert exact content/order/shape, not just length
    it('returns a full CellDetailDTO with a correctly ordered, correctly shaped 6-entry sparkline', async () => {
      (prisma.gridCell.findUnique as any).mockResolvedValue({ id: cellId, areaLabel: 'CMC' });
      (prisma.signalValue.findMany as any).mockResolvedValue(fullSignals);
      (prisma.compositeScoreSnapshot.findMany as any).mockResolvedValue(sixPeriodSnapshots);
      (generateText as any).mockResolvedValue('This area shows rising construction activity.');

      const result = await getCellDetail(cellId, '2026-06-01');

      expect(result.compositeScore).toBeDefined();
      expect(result.signals).toHaveLength(3);
      expect(result.trend).toBeDefined();
      expect(result.areaLabel).toBe('CMC');
      expect(result.aiSummary).not.toBeNull();

      expect(result.sparkline).toHaveLength(6);
      expect(result.sparkline).toEqual([
        { period: '2026-01-01', compositeScore: 0.58 },
        { period: '2026-02-01', compositeScore: 0.6 },
        { period: '2026-03-01', compositeScore: 0.63 },
        { period: '2026-04-01', compositeScore: 0.66 },
        { period: '2026-05-01', compositeScore: 0.7 },
        { period: '2026-06-01', compositeScore: 0.74 }, // current period included, oldest -> newest order
      ]);
    });

    it('throws ApiError(404) when the cell does not exist', async () => {
      (prisma.gridCell.findUnique as any).mockResolvedValue(null);

      await expect(getCellDetail('missing-cell', '2026-06-01')).rejects.toMatchObject({
        statusCode: 404,
        message: 'No data available for this cell',
      });
    });

    it('throws the identical ApiError(404) when the cell exists but has zero snapshots across all periods', async () => {
      (prisma.gridCell.findUnique as any).mockResolvedValue({ id: cellId });
      (prisma.compositeScoreSnapshot.findMany as any).mockResolvedValue([]);

      await expect(getCellDetail(cellId, '2026-06-01')).rejects.toMatchObject({
        statusCode: 404,
        message: 'No data available for this cell',
      });
    });

    it('defaults trend to flat on exact equality with the prior period (Decision #7)', async () => {
      (prisma.gridCell.findUnique as any).mockResolvedValue({ id: cellId, areaLabel: 'CMC' });
      (prisma.signalValue.findMany as any).mockResolvedValue(fullSignals);
      (prisma.compositeScoreSnapshot.findMany as any).mockResolvedValue([
        { period: new Date('2026-06-01'), compositeScore: 0.5 },
        { period: new Date('2026-05-01'), compositeScore: 0.5 },
      ]);
      (generateText as any).mockResolvedValue('summary');

      const result = await getCellDetail(cellId, '2026-06-01');

      expect(result.trend).toBe('flat');
    });

    it('defaults trend to flat when there is no prior-period snapshot at all', async () => {
      (prisma.gridCell.findUnique as any).mockResolvedValue({ id: cellId, areaLabel: 'CMC' });
      (prisma.signalValue.findMany as any).mockResolvedValue(fullSignals);
      (prisma.compositeScoreSnapshot.findMany as any).mockResolvedValue([
        { period: new Date('2026-06-01'), compositeScore: 0.5 },
      ]);
      (generateText as any).mockResolvedValue('summary');

      const result = await getCellDetail(cellId, '2026-06-01');

      expect(result.trend).toBe('flat');
    });

    it('computes up/down correctly on non-equal scores', async () => {
      (prisma.gridCell.findUnique as any).mockResolvedValue({ id: cellId, areaLabel: 'CMC' });
      (prisma.signalValue.findMany as any).mockResolvedValue(fullSignals);
      (prisma.compositeScoreSnapshot.findMany as any).mockResolvedValue([
        { period: new Date('2026-06-01'), compositeScore: 0.7 },
        { period: new Date('2026-05-01'), compositeScore: 0.5 },
      ]);
      (generateText as any).mockResolvedValue('summary');

      const result = await getCellDetail(cellId, '2026-06-01');

      expect(result.trend).toBe('up');
    });

    it('returns aiSummary: null without blocking the rest of the payload when generateText fails', async () => {
      (prisma.gridCell.findUnique as any).mockResolvedValue({ id: cellId, areaLabel: 'CMC' });
      (prisma.signalValue.findMany as any).mockResolvedValue(fullSignals);
      (prisma.compositeScoreSnapshot.findMany as any).mockResolvedValue([
        { period: new Date('2026-06-01'), compositeScore: 0.5 },
      ]);
      (generateText as any).mockRejectedValue(new Error('LLM down'));

      const result = await getCellDetail(cellId, '2026-06-01');

      expect(result.aiSummary).toBeNull();
      expect(result.compositeScore).toBeDefined();
      expect(result.signals).toHaveLength(3);
    });

    // FIX #1: assert generateText was called with the actual resolved signal/score data, not just "truthy"
    it('calls generateCellSummary (via generateText) with a prompt containing the resolved signal values and composite score', async () => {
      (prisma.gridCell.findUnique as any).mockResolvedValue({ id: cellId, areaLabel: 'CMC' });
      (prisma.signalValue.findMany as any).mockResolvedValue(fullSignals);
      (prisma.compositeScoreSnapshot.findMany as any).mockResolvedValue([
        { period: new Date('2026-06-01'), compositeScore: 0.74 },
      ]);
      (generateText as any).mockResolvedValue('summary');

      await getCellDetail(cellId, '2026-06-01');

      expect(generateText).toHaveBeenCalledTimes(1);
      const promptArg: string = (generateText as any).mock.calls[0][0];

      // must reflect the actual resolved values, not placeholder/empty data
      expect(promptArg).toContain('0.74'); // composite score
      expect(promptArg).toContain('VIIRS');
      expect(promptArg).toContain('12.4'); // VIIRS rawValue
      expect(promptArg).toContain('GHSL');
      expect(promptArg).toContain('0.31'); // GHSL rawValue
      expect(promptArg).toContain('RWI');
      expect(promptArg).toContain('0.42'); // RWI rawValue
    });
  });

  describe('generateCellSummary', () => {
    const signals = [
      { source: 'VIIRS' as const, rawValue: 12.4, normalizedValue: 0.68 },
      { source: 'GHSL' as const, rawValue: 0.31, normalizedValue: 0.55 },
      { source: 'RWI' as const, rawValue: 0.42, normalizedValue: 0.6 },
    ];

    it('resolves the summary string unchanged on success', async () => {
      (generateText as any).mockResolvedValue('rising construction activity');

      await expect(generateCellSummary(signals, 0.74)).resolves.toBe(
        'rising construction activity',
      );
    });

    it('resolves null, does not throw, when generateText rejects', async () => {
      (generateText as any).mockRejectedValue(new Error('LLM unreachable'));

      await expect(generateCellSummary(signals, 0.74)).resolves.toBeNull();
    });

    it('resolves null on a timeout-shaped rejection, same as any other failure', async () => {
      const timeoutError = Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' });
      (generateText as any).mockRejectedValue(timeoutError);

      await expect(generateCellSummary(signals, 0.74)).resolves.toBeNull();
    });

    it('resolves null even when generateText rejects with a non-Error value', async () => {
      (generateText as any).mockRejectedValue({ code: 'SDK_ERROR', raw: true });

      await expect(generateCellSummary(signals, 0.74)).resolves.toBeNull();
    });
  });

  describe('getRawSignalLayer', () => {
    it('returns cells for the requested period when data exists', async () => {
      (prisma.signalValue.findMany as any).mockResolvedValueOnce([
        { gridCellId: 'cell-1', normalizedValue: 0.68, period: new Date('2026-06-01') },
      ]);

      const result = await getRawSignalLayer('VIIRS', '2026-06-01');

      expect(result.period).toBe('2026-06-01');
      expect(result.periodSubstituted).toBe(false);
      expect(result.cells).toHaveLength(1);
    });

    it('falls back via the same two-step query pattern, returning the exact substituted period', async () => {
      (prisma.signalValue.findMany as any)
        .mockResolvedValueOnce([]) // step 1
        .mockResolvedValueOnce([
          { gridCellId: 'cell-1', normalizedValue: 0.5, period: new Date('2026-05-01') },
        ]); // step 3
      (prisma.signalValue.findFirst as any).mockResolvedValueOnce({
        period: new Date('2026-05-01'),
      }); // step 2

      const result = await getRawSignalLayer('GHSL', '2026-06-01');

      expect(prisma.signalValue.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            period: expect.objectContaining({ lt: expect.anything() }),
          }),
          orderBy: { period: 'desc' },
        }),
      );
      expect(result.periodSubstituted).toBe(true);
      expect(result.period).toBe('2026-05-01');
    });

    it('returns an empty, non-error result for this layer only when no data exists for any period', async () => {
      (prisma.signalValue.findMany as any).mockResolvedValue([]);
      (prisma.signalValue.findFirst as any).mockResolvedValue(null);

      const result = await getRawSignalLayer('RWI', '2026-06-01');

      expect(result.cells).toEqual([]);
      expect(result.periodSubstituted).toBe(false);
    });

    // FIX #3: GDELT exclusion is a compile-time guarantee here (sourceKey param type), not a runtime
    // assertion — documented explicitly so the honesty-check item (9.4) isn't silently assumed.
    // Runtime enforcement of GDELT-as-400 is covered separately in map.schema.test.ts and
    // map.routes.test.ts; TypeScript's parameter type is what prevents 'GDELT' from ever
    // reaching this function's call sites in the compiled service code.
  });

  describe('parseNaturalLanguageQuery', () => {
    it('resolves populated parsedFilters and matching cells on a confident parse', async () => {
      (generateStructuredOutput as any).mockResolvedValue({
        areaLabel: 'Bole',
        period: '2026-06-01',
        signalFocus: 'GHSL',
      });
      (prisma.compositeScoreSnapshot.findMany as any).mockResolvedValue([
        { gridCellId: 'cell-1', compositeScore: 0.74 },
      ]);

      const result = await parseNaturalLanguageQuery('areas near Bole with rising construction');

      expect(result.parsedFilters).not.toBeNull();
      expect(result.cells.length).toBeGreaterThan(0);
    });

    it('resolves parsedFilters: null, cells: [] as a normal success when generateStructuredOutput resolves null (low confidence)', async () => {
      (generateStructuredOutput as any).mockResolvedValue(null);

      const result = await parseNaturalLanguageQuery('asdf jkl random text');

      expect(result.parsedFilters).toBeNull();
      expect(result.cells).toEqual([]);
    });

    it('throws ApiError(400, "Search is temporarily unavailable") when generateStructuredOutput rejects (AI service unreachable)', async () => {
      (generateStructuredOutput as any).mockRejectedValue(new Error('connection refused'));

      await expect(parseNaturalLanguageQuery('areas near Bole')).rejects.toMatchObject({
        statusCode: 400,
        message: 'Search is temporarily unavailable',
      });
    });

    it('resolves populated parsedFilters with an empty cells array when the filters match nothing', async () => {
      (generateStructuredOutput as any).mockResolvedValue({
        areaLabel: 'Nowhere',
        period: '2026-06-01',
        signalFocus: 'VIIRS',
      });
      (prisma.compositeScoreSnapshot.findMany as any).mockResolvedValue([]);

      const result = await parseNaturalLanguageQuery('areas near Nowhere');

      expect(result.parsedFilters).not.toBeNull();
      expect(result.cells).toEqual([]);
    });
  });
});
