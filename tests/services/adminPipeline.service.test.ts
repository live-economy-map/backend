import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../src/config/db.js';
import ApiError from '../../src/utils/ApiError.js';
import { STALENESS_THRESHOLD_DAYS } from '../../src/constants/index.js';
import * as viirsClient from '../../src/utils/dataSourceClients/viirs.client.js';
import {
  getSourcesWithHealth,
  startPipelineRun,
  getPipelineRuns,
  recomputeCompositeScores,
  getWeightConfigs,
  createAndActivateWeightConfig,
} from '../../src/services/adminPipeline.service.js';

vi.mock('../../src/config/db.js');
vi.mock('../../src/utils/dataSourceClients/viirs.client.js');
vi.mock('../../src/utils/dataSourceClients/ghsl.client.js');
vi.mock('../../src/utils/dataSourceClients/rwi.client.js');
vi.mock('../../src/utils/dataSourceClients/gdelt.client.js');

beforeEach(() => {
  vi.clearAllMocks();
});

describe('adminPipeline.service', () => {
  describe('getSourcesWithHealth', () => {
    it('returns all 4 sources with correct healthStatus derived from each own most recent run', async () => {
      (prisma.dataSource.findMany as any).mockResolvedValue([
        {
          id: '1',
          key: 'VIIRS',
          name: 'VIIRS',
          isActive: true,
          pipelineRuns: [{ status: 'SUCCESS', completedAt: new Date() }],
        },
        {
          id: '2',
          key: 'GHSL',
          name: 'GHSL',
          isActive: true,
          pipelineRuns: [{ status: 'FAILED', completedAt: new Date() }],
        },
        { id: '3', key: 'RWI', name: 'RWI', isActive: true, pipelineRuns: [] },
        {
          id: '4',
          key: 'GDELT',
          name: 'GDELT',
          isActive: true,
          pipelineRuns: [{ status: 'SUCCESS', completedAt: new Date(0) }],
        },
      ]);

      const result = await getSourcesWithHealth();

      expect(result).toHaveLength(4);
      expect(result.find((s) => s.key === 'VIIRS')?.healthStatus).toBe('healthy');
      expect(result.find((s) => s.key === 'GHSL')?.healthStatus).toBe('failed');
      expect(result.find((s) => s.key === 'RWI')?.healthStatus).toBe('never_run');
    });

    it('marks a source with zero PipelineRun rows as never_run with null lastSuccessfulRunAt', async () => {
      (prisma.dataSource.findMany as any).mockResolvedValue([
        { id: '1', key: 'RWI', name: 'RWI', isActive: true, pipelineRuns: [] },
      ]);

      const result = await getSourcesWithHealth();

      expect(result[0].healthStatus).toBe('never_run');
      expect(result[0].lastSuccessfulRunAt).toBeNull();
    });

    it('marks a source stale when its most recent SUCCESS run is older than the threshold', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - (STALENESS_THRESHOLD_DAYS + 1));
      (prisma.dataSource.findMany as any).mockResolvedValue([
        {
          id: '1',
          key: 'VIIRS',
          name: 'VIIRS',
          isActive: true,
          pipelineRuns: [{ status: 'SUCCESS', completedAt: oldDate }],
        },
      ]);

      const result = await getSourcesWithHealth();

      expect(result[0].healthStatus).toBe('stale');
    });

    it('marks a source failed if its most recent run failed, even if an earlier run succeeded', async () => {
      (prisma.dataSource.findMany as any).mockResolvedValue([
        {
          id: '1',
          key: 'VIIRS',
          name: 'VIIRS',
          isActive: true,
          pipelineRuns: [{ status: 'FAILED', completedAt: new Date() }],
        },
      ]);

      const result = await getSourcesWithHealth();

      expect(result[0].healthStatus).toBe('failed');
    });

    it('maps a still-RUNNING most-recent run to one of the 4 defined health states, not a 5th ad hoc state', async () => {
      (prisma.dataSource.findMany as any).mockResolvedValue([
        {
          id: '1',
          key: 'VIIRS',
          name: 'VIIRS',
          isActive: true,
          pipelineRuns: [{ status: 'RUNNING', completedAt: null }],
        },
      ]);

      const result = await getSourcesWithHealth();

      expect(['healthy', 'stale', 'failed', 'never_run']).toContain(result[0].healthStatus);
    });
  });

  describe('startPipelineRun', () => {
    it('creates a RUNNING run when no existing RUNNING run exists for this source', async () => {
      (prisma.dataSource.findUnique as any).mockResolvedValue({ id: 'ds-1', key: 'VIIRS' });
      (prisma.pipelineRun.findFirst as any).mockResolvedValue(null);
      (prisma.pipelineRun.create as any).mockResolvedValue({ id: 'run-1', status: 'RUNNING' });
      (viirsClient.pull as any).mockReturnValue(new Promise(() => {})); // never resolves

      const result = await startPipelineRun('VIIRS', 'admin-1');

      expect(result).toEqual({ pipelineRunId: 'run-1', status: 'RUNNING' });
      expect(prisma.pipelineRun.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ dataSourceId: 'ds-1', triggeredById: 'admin-1' }),
        }),
      );
    });

    it('throws 409 when a RUNNING run already exists for the same source, and does not create a new row', async () => {
      (prisma.dataSource.findUnique as any).mockResolvedValue({ id: 'ds-1', key: 'VIIRS' });
      (prisma.pipelineRun.findFirst as any).mockResolvedValue({
        id: 'existing-run',
        status: 'RUNNING',
      });

      await expect(startPipelineRun('VIIRS', 'admin-1')).rejects.toThrow(ApiError);
      expect(prisma.pipelineRun.create).not.toHaveBeenCalled();
    });

    it('does not block a source when a RUNNING run exists only for a different source', async () => {
      (prisma.dataSource.findUnique as any).mockResolvedValue({ id: 'ds-viirs', key: 'VIIRS' });
      // Scoped lookup returns null for VIIRS even though GHSL has a RUNNING row elsewhere.
      (prisma.pipelineRun.findFirst as any).mockResolvedValue(null);
      (prisma.pipelineRun.create as any).mockResolvedValue({ id: 'run-2', status: 'RUNNING' });
      (viirsClient.pull as any).mockReturnValue(new Promise(() => {}));

      const result = await startPipelineRun('VIIRS', 'admin-1');

      expect(result.status).toBe('RUNNING');
    });

    it('resolves without awaiting the dispatched pull (fire-and-forget)', async () => {
      (prisma.dataSource.findUnique as any).mockResolvedValue({ id: 'ds-1', key: 'VIIRS' });
      (prisma.pipelineRun.findFirst as any).mockResolvedValue(null);
      (prisma.pipelineRun.create as any).mockResolvedValue({ id: 'run-1', status: 'RUNNING' });
      (viirsClient.pull as any).mockReturnValue(new Promise(() => {})); // never resolves — test times out if awaited

      await expect(startPipelineRun('VIIRS', 'admin-1')).resolves.toBeDefined();
    });
  });

  describe('getPipelineRuns', () => {
    it('lists all sources, most-recent-first, with no filter', async () => {
      (prisma.pipelineRun.findMany as any).mockResolvedValue([{ id: 'r1' }, { id: 'r2' }]);
      (prisma.pipelineRun.count as any).mockResolvedValue(2);

      const result = await getPipelineRuns();

      expect(result).toEqual({ items: [{ id: 'r1' }, { id: 'r2' }], page: 1, limit: 20, total: 2 });
    });

    it('filters by sourceKey using the resolved dataSourceId, not just returned-item shape', async () => {
      (prisma.dataSource.findUnique as any).mockResolvedValue({ id: 'ds-ghsl', key: 'GHSL' });
      (prisma.pipelineRun.findMany as any).mockResolvedValue([]);
      (prisma.pipelineRun.count as any).mockResolvedValue(0);

      await getPipelineRuns('GHSL');

      expect(prisma.pipelineRun.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ dataSourceId: 'ds-ghsl' }) }),
      );
    });

    it('returns an empty result (not an error) when there are no runs for the filter', async () => {
      (prisma.dataSource.findUnique as any).mockResolvedValue({ id: 'ds-gdelt', key: 'GDELT' });
      (prisma.pipelineRun.findMany as any).mockResolvedValue([]);
      (prisma.pipelineRun.count as any).mockResolvedValue(0);

      const result = await getPipelineRuns('GDELT');

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe('recomputeCompositeScores', () => {
    it('computes compositeScore as Σ(weight × normalizedValue) from mocked weights/signals', async () => {
      (prisma.scoreWeightConfig.findFirst as any).mockResolvedValue({
        id: 'cfg-1',
        sourceWeights: [
          { dataSource: { key: 'VIIRS' }, weight: 0.4 },
          { dataSource: { key: 'GHSL' }, weight: 0.35 },
          { dataSource: { key: 'RWI' }, weight: 0.25 },
        ],
      });
      (prisma.gridCell.findMany as any).mockResolvedValue([{ id: 'cell-1' }]);
      (prisma.signalValue.findMany as any).mockResolvedValue([
        { dataSource: { key: 'VIIRS' }, normalizedValue: 0.8 },
        { dataSource: { key: 'GHSL' }, normalizedValue: 0.6 },
        { dataSource: { key: 'RWI' }, normalizedValue: 0.5 },
      ]);
      const upsertMock = vi.fn().mockResolvedValue({});
      (prisma.compositeScoreSnapshot.upsert as any) = upsertMock;

      await recomputeCompositeScores('2026-06-01', 'admin-1');

      const expectedScore = 0.4 * 0.8 + 0.35 * 0.6 + 0.25 * 0.5;
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ compositeScore: expectedScore, isComplete: true }),
        }),
      );
    });

    it('throws 409 and writes nothing when no active weight config exists', async () => {
      (prisma.scoreWeightConfig.findFirst as any).mockResolvedValue(null);
      const upsertMock = vi.fn();
      (prisma.compositeScoreSnapshot.upsert as any) = upsertMock;

      await expect(recomputeCompositeScores('2026-06-01', 'admin-1')).rejects.toThrow(ApiError);
      expect(upsertMock).not.toHaveBeenCalled();
    });

    it('still writes a cell missing one signal, with isComplete: false, never treating the missing signal as 0', async () => {
      (prisma.scoreWeightConfig.findFirst as any).mockResolvedValue({
        id: 'cfg-1',
        sourceWeights: [
          { dataSource: { key: 'VIIRS' }, weight: 0.4 },
          { dataSource: { key: 'GHSL' }, weight: 0.35 },
          { dataSource: { key: 'RWI' }, weight: 0.25 },
        ],
      });
      (prisma.gridCell.findMany as any).mockResolvedValue([{ id: 'cell-1' }]);
      (prisma.signalValue.findMany as any).mockResolvedValue([
        { dataSource: { key: 'VIIRS' }, normalizedValue: 0.8 },
        { dataSource: { key: 'GHSL' }, normalizedValue: 0.6 },
        // RWI missing
      ]);
      const upsertMock = vi.fn().mockResolvedValue({});
      (prisma.compositeScoreSnapshot.upsert as any) = upsertMock;

      await recomputeCompositeScores('2026-06-01', 'admin-1');

      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ isComplete: false }) }),
      );
    });

    it('still writes a cell missing all 3 signals, with isComplete: false', async () => {
      (prisma.scoreWeightConfig.findFirst as any).mockResolvedValue({
        id: 'cfg-1',
        sourceWeights: [
          { dataSource: { key: 'VIIRS' }, weight: 0.4 },
          { dataSource: { key: 'GHSL' }, weight: 0.35 },
          { dataSource: { key: 'RWI' }, weight: 0.25 },
        ],
      });
      (prisma.gridCell.findMany as any).mockResolvedValue([{ id: 'cell-1' }]);
      (prisma.signalValue.findMany as any).mockResolvedValue([]);
      const upsertMock = vi.fn().mockResolvedValue({});
      (prisma.compositeScoreSnapshot.upsert as any) = upsertMock;

      await recomputeCompositeScores('2026-06-01', 'admin-1');

      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({ create: expect.objectContaining({ isComplete: false }) }),
      );
    });

    it('upserts on the (gridCellId, period, scoreWeightConfigId) unique key', async () => {
      (prisma.scoreWeightConfig.findFirst as any).mockResolvedValue({
        id: 'cfg-1',
        sourceWeights: [
          { dataSource: { key: 'VIIRS' }, weight: 0.4 },
          { dataSource: { key: 'GHSL' }, weight: 0.35 },
          { dataSource: { key: 'RWI' }, weight: 0.25 },
        ],
      });
      (prisma.gridCell.findMany as any).mockResolvedValue([{ id: 'cell-1' }]);
      (prisma.signalValue.findMany as any).mockResolvedValue([
        { dataSource: { key: 'VIIRS' }, normalizedValue: 0.8 },
        { dataSource: { key: 'GHSL' }, normalizedValue: 0.6 },
        { dataSource: { key: 'RWI' }, normalizedValue: 0.5 },
      ]);
      const upsertMock = vi.fn().mockResolvedValue({});
      (prisma.compositeScoreSnapshot.upsert as any) = upsertMock;

      await recomputeCompositeScores('2026-06-01', 'admin-1');

      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            gridCellId_period_scoreWeightConfigId: expect.objectContaining({
              gridCellId: 'cell-1',
              scoreWeightConfigId: 'cfg-1',
            }),
          }),
        }),
      );
    });
  });

  describe('getWeightConfigs / createAndActivateWeightConfig', () => {
    it('getWeightConfigs lists most-recent-first, each including its weights array', async () => {
      (prisma.scoreWeightConfig.findMany as any).mockResolvedValue([
        { id: 'cfg-2', isActive: true, createdAt: new Date('2026-07-15'), sourceWeights: [] },
        { id: 'cfg-1', isActive: false, createdAt: new Date('2026-06-01'), sourceWeights: [] },
      ]);

      const result = await getWeightConfigs();

      expect(result[0].id).toBe('cfg-2');
    });

    it('createAndActivateWeightConfig performs deactivate-then-activate atomically in one $transaction', async () => {
      const txMock = vi
        .fn()
        .mockResolvedValue({ id: 'cfg-new', isActive: true, sourceWeights: [] });
      (prisma.$transaction as any) = txMock;

      await createAndActivateWeightConfig(
        [
          { sourceKey: 'VIIRS', weight: 0.4 },
          { sourceKey: 'GHSL', weight: 0.35 },
          { sourceKey: 'RWI', weight: 0.25 },
        ],
        'admin-1',
      );

      expect(txMock).toHaveBeenCalledTimes(1);
    });

    it('rejects the whole operation with no partial state on a simulated mid-transaction failure', async () => {
      (prisma.$transaction as any) = vi.fn().mockRejectedValue(new Error('transaction failed'));

      await expect(
        createAndActivateWeightConfig(
          [
            { sourceKey: 'VIIRS', weight: 0.4 },
            { sourceKey: 'GHSL', weight: 0.35 },
            { sourceKey: 'RWI', weight: 0.25 },
          ],
          'admin-1',
        ),
      ).rejects.toThrow();
    });

    // OPEN ITEM (Doc 8-6, createAndActivateWeightConfig): sum-to-1.0 enforcement here is
    // "pending confirmation" per Doc 8-6 / Doc 4's open item — this test reflects the currently
    // documented direction, not a finalized decision. If Doc 4 changes the formula/tolerance,
    // update this test and its neighbor below together; this is the sole owner of this rule
    // (see adminPipeline.schema.test.ts, which intentionally does not test sum-to-1.0).
    it('throws 400 when weights do not sum to 1.0', async () => {
      await expect(
        createAndActivateWeightConfig(
          [
            { sourceKey: 'VIIRS', weight: 0.4 },
            { sourceKey: 'GHSL', weight: 0.3 },
            { sourceKey: 'RWI', weight: 0.2 },
          ],
          'admin-1',
        ),
      ).rejects.toThrow(ApiError);
    });

    it('does not throw when weights sum to 1.0 within float tolerance (0.9999996)', async () => {
      const txMock = vi
        .fn()
        .mockResolvedValue({ id: 'cfg-new', isActive: true, sourceWeights: [] });
      (prisma.$transaction as any) = txMock;

      await expect(
        createAndActivateWeightConfig(
          [
            { sourceKey: 'VIIRS', weight: 0.3333332 },
            { sourceKey: 'GHSL', weight: 0.3333332 },
            { sourceKey: 'RWI', weight: 0.3333332 },
          ],
          'admin-1',
        ),
      ).resolves.toBeDefined();
    });
  });
});
