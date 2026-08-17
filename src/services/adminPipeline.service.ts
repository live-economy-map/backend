import { DataSourceKey } from '@prisma/client';
import { prisma } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import logger from '../utils/logger.js';
import { HTTP_STATUS, STALENESS_THRESHOLD_DAYS } from '../constants/index.js';
import { ADDIS_ABABA_BOUNDING_BOX } from '../types/dataSourceClient.types.js';
import type {
  HealthStatus,
  DataSourceStatusDTO,
  PipelineRunDTO,
  ScoreWeightConfigDTO,
} from '../types/adminPipeline.types.js';
import * as viirsClient from '../utils/dataSourceClients/viirs.client.js';
import * as ghslClient from '../utils/dataSourceClients/ghsl.client.js';
import * as rwiClient from '../utils/dataSourceClients/rwi.client.js';
import * as gdeltClient from '../utils/dataSourceClients/gdelt.client.js';

const WEIGHT_SUM_TOLERANCE = 0.001;

const CLIENTS: Record<DataSourceKey, { pull: typeof viirsClient.pull }> = {
  VIIRS: viirsClient,
  GHSL: ghslClient,
  RWI: rwiClient,
  GDELT: gdeltClient,
};

// Period convention matches SignalValue/CompositeScoreSnapshot: first day of the month.
const currentPeriod = (): string => {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10);
};

export const getSourcesWithHealth = async (): Promise<DataSourceStatusDTO[]> => {
  const sources = await prisma.dataSource.findMany({
    include: {
      pipelineRuns: {
        orderBy: { startedAt: 'desc' },
        take: 1,
      },
    },
  });

  return sources.map((source: any) => {
    const latestRun = source.pipelineRuns?.[0];
    let healthStatus: HealthStatus = 'never_run';
    let lastSuccessfulRunAt: Date | null = null;

    if (latestRun) {
      if (latestRun.status === 'FAILED') {
        healthStatus = 'failed';
      } else if (latestRun.status === 'SUCCESS') {
        lastSuccessfulRunAt = latestRun.completedAt ?? null;
        const ageDays = latestRun.completedAt
          ? (Date.now() - new Date(latestRun.completedAt).getTime()) / (1000 * 60 * 60 * 24)
          : Infinity;
        healthStatus = ageDays > STALENESS_THRESHOLD_DAYS ? 'stale' : 'healthy';
      }
      // status === 'RUNNING': no prior-run fallback queried here (only most-recent row
      // fetched) → falls through to the 'never_run' default, one of the 4 defined states.
    }

    return {
      key: source.key,
      name: source.name,
      isActive: source.isActive,
      lastSuccessfulRunAt,
      healthStatus,
    };
  });
};

export const startPipelineRun = async (
  sourceKey: DataSourceKey,
  triggeredById: string,
): Promise<{ pipelineRunId: string; status: 'RUNNING' }> => {
  const dataSource = await prisma.dataSource.findUnique({ where: { key: sourceKey } });

  if (!dataSource) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Invalid data source');
  }

  const existingRun = await prisma.pipelineRun.findFirst({
    where: { dataSourceId: dataSource.id, status: 'RUNNING' },
  });

  if (existingRun) {
    throw new ApiError(HTTP_STATUS.CONFLICT, 'A refresh for this source is already in progress');
  }

  const run = await prisma.pipelineRun.create({
    data: {
      dataSourceId: dataSource.id,
      triggeredById,
      status: 'RUNNING',
    },
  });

  // Fire-and-forget: intentionally not awaited so this function resolves immediately.
  dispatchPull(sourceKey, dataSource.id, run.id).catch((err) => {
    logger.error({ err, sourceKey, runId: run.id }, 'Unhandled error dispatching pipeline pull');
  });

  return { pipelineRunId: run.id, status: 'RUNNING' };
};

// Handles the async pull's completion independently — never throws back into
// startPipelineRun's caller (per Doc 8-6).
const dispatchPull = async (
  sourceKey: DataSourceKey,
  dataSourceId: string,
  runId: string,
): Promise<void> => {
  const period = currentPeriod();

  try {
    const client = CLIENTS[sourceKey];
    const results = await client.pull(ADDIS_ABABA_BOUNDING_BOX, period);

    if (!Array.isArray(results)) {
      throw new Error('Malformed pull result: expected an array');
    }

    // All-or-nothing per period/source: one transaction, no partial SignalValue writes.
    await prisma.$transaction(
      results.map((r) =>
        prisma.signalValue.upsert({
          where: {
            gridCellId_dataSourceId_period: {
              gridCellId: r.cellId,
              dataSourceId,
              period: new Date(period),
            },
          },
          update: { rawValue: r.rawValue, normalizedValue: r.rawValue },
          create: {
            gridCellId: r.cellId,
            dataSourceId,
            period: new Date(period),
            rawValue: r.rawValue,
            // TODO: real normalization strategy (raw → 0-1 scale) is unspecified in the
            // docs — currently a passthrough placeholder, must be finalized per source.
            normalizedValue: r.rawValue,
          },
        }),
      ),
    );

    await prisma.pipelineRun.update({
      where: { id: runId },
      data: { status: 'SUCCESS', completedAt: new Date(), recordsProcessed: results.length },
    });
  } catch (err) {
    await prisma.pipelineRun.update({
      where: { id: runId },
      data: {
        status: 'FAILED',
        completedAt: new Date(),
        errorMessage: err instanceof Error ? err.message : 'Unknown error during pipeline pull',
      },
    });
  }
};

export const getPipelineRuns = async (
  sourceKey?: DataSourceKey,
  page: number | string = 1,
  limit: number | string = 20,
): Promise<{ items: PipelineRunDTO[]; page: number; limit: number; total: number }> => {
  let dataSourceId: string | undefined;

  if (sourceKey) {
    const dataSource = await prisma.dataSource.findUnique({ where: { key: sourceKey } });
    dataSourceId = dataSource?.id;
  }

  const where = dataSourceId ? { dataSourceId } : {};
  const pageNum = Number(page) || 1;
  const limitNum = Number(limit) || 20;

  const [rawItems, total] = await Promise.all([
    prisma.pipelineRun.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      skip: (pageNum - 1) * limitNum,
      take: limitNum,
      include: { dataSource: true },
    }),
    prisma.pipelineRun.count({ where }),
  ]);

  const items = rawItems.map((r: any) => {
    const { dataSource, ...rest } = r;
    return { ...rest, dataSourceKey: dataSource?.key };
  });

  return { items, page: pageNum, limit: limitNum, total };
};

export const recomputeCompositeScores = async (
  period: string,
  triggeredById: string,
): Promise<{ period: string; scoreWeightConfigId: string }> => {
  const activeConfig = await prisma.scoreWeightConfig.findFirst({
    where: { isActive: true },
    include: { sourceWeights: { include: { dataSource: true } } },
  });

  if (!activeConfig) {
    throw new ApiError(HTTP_STATUS.CONFLICT, 'No active weight configuration — create one first');
  }

  const periodDate = new Date(period);
  const gridCells = await prisma.gridCell.findMany();

  for (const cell of gridCells) {
    const signalValues = await prisma.signalValue.findMany({
      where: { gridCellId: cell.id, period: periodDate },
      include: { dataSource: true },
    });

    let compositeScore = 0;
    let isComplete = true;

    for (const sourceWeight of activeConfig.sourceWeights) {
      const signal = signalValues.find(
        (sv: any) => sv.dataSource.key === sourceWeight.dataSource.key,
      );
      if (signal) {
        compositeScore += sourceWeight.weight * signal.normalizedValue;
      } else {
        // Never treat a missing signal as 0 in the sum — just flag incompleteness.
        isComplete = false;
      }
    }

    await prisma.compositeScoreSnapshot.upsert({
      where: {
        gridCellId_period_scoreWeightConfigId: {
          gridCellId: cell.id,
          period: periodDate,
          scoreWeightConfigId: activeConfig.id,
        },
      },
      update: { compositeScore, isComplete },
      create: {
        gridCellId: cell.id,
        period: periodDate,
        scoreWeightConfigId: activeConfig.id,
        compositeScore,
        isComplete,
      },
    });
  }

  return { period, scoreWeightConfigId: activeConfig.id };
};

export const getWeightConfigs = async (): Promise<ScoreWeightConfigDTO[]> => {
  const configs = await prisma.scoreWeightConfig.findMany({
    orderBy: { createdAt: 'desc' },
    include: { sourceWeights: { include: { dataSource: true } } },
  });

  return configs.map((config: any) => ({
    id: config.id,
    isActive: config.isActive,
    createdAt: config.createdAt,
    weights: (config.sourceWeights ?? []).map((sw: any) => ({
      sourceKey: sw.dataSource?.key,
      weight: sw.weight,
    })),
  }));
};

export const createAndActivateWeightConfig = async (
  weights: { sourceKey: string; weight: number }[],
  createdById: string,
): Promise<ScoreWeightConfigDTO> => {
  // Pending confirmation per Doc 4/8-6's open item — implemented per the currently
  // documented direction (see test suite), with float tolerance.
  const sum = weights.reduce((acc, w) => acc + w.weight, 0);
  if (Math.abs(sum - 1) >= WEIGHT_SUM_TOLERANCE) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Weights must sum to 1.0');
  }

  const config = await prisma.$transaction(async (tx: any) => {
    // Atomic deactivate-then-activate: both writes in one transaction so a mid-crash
    // never leaves zero or two active configs.
    await tx.scoreWeightConfig.updateMany({
      where: { isActive: true },
      data: { isActive: false },
    });

    const dataSources = await tx.dataSource.findMany({
      where: { key: { in: weights.map((w) => w.sourceKey) } },
    });

    return tx.scoreWeightConfig.create({
      data: {
        createdById,
        isActive: true,
        sourceWeights: {
          create: weights.map((w) => ({
            weight: w.weight,
            dataSourceId: dataSources.find((ds: any) => ds.key === w.sourceKey)!.id,
          })),
        },
      },
      include: { sourceWeights: { include: { dataSource: true } } },
    });
  });

  return {
    id: config.id,
    isActive: config.isActive,
    createdAt: config.createdAt,
    weights: (config.sourceWeights ?? []).map((sw: any) => ({
      sourceKey: sw.dataSource?.key,
      weight: sw.weight,
    })),
  };
};
