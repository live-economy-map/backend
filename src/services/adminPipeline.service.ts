import { prisma } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import type { DataSourceKey } from '@prisma/client';

export interface DataSourceStatusDTO {
  key: DataSourceKey;
  name: string;
  isActive: boolean;
  lastSuccessfulRunAt: string | null;
  healthStatus: 'healthy' | 'stale' | 'failed' | 'never_run';
}

export interface PipelineRunDTO {
  id: string;
  dataSourceKey: DataSourceKey;
  status: string;
  startedAt: string;
  completedAt: string | null;
  recordsProcessed: number | null;
  errorMessage: string | null;
}

export interface ScoreWeightConfigDTO {
  id: string;
  isActive: boolean;
  createdAt: string;
  weights: { sourceKey: string; weight: number }[];
}

export const getSourcesWithHealth = async (): Promise<DataSourceStatusDTO[]> => {
  throw new Error('not implemented');
};

export const startPipelineRun = async (
  sourceKey: DataSourceKey,
  triggeredById: string,
): Promise<{ pipelineRunId: string; status: 'RUNNING' }> => {
  throw new Error('not implemented');
};

export const getPipelineRuns = async (
  sourceKey?: DataSourceKey,
  page?: number,
  limit?: number,
): Promise<{ items: PipelineRunDTO[]; page: number; limit: number; total: number }> => {
  throw new Error('not implemented');
};

export const recomputeCompositeScores = async (
  period: string,
  triggeredById: string,
): Promise<{ period: string; scoreWeightConfigId: string }> => {
  throw new Error('not implemented');
};

export const getWeightConfigs = async (): Promise<ScoreWeightConfigDTO[]> => {
  throw new Error('not implemented');
};

export const createAndActivateWeightConfig = async (
  weights: { sourceKey: string; weight: number }[],
  createdById: string,
): Promise<ScoreWeightConfigDTO> => {
  throw new Error('not implemented');
};
