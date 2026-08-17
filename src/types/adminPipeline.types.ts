import { DataSourceKey } from '@prisma/client';

export type HealthStatus = 'healthy' | 'stale' | 'failed' | 'never_run';

export interface DataSourceStatusDTO {
  key: DataSourceKey;
  name: string;
  isActive: boolean;
  lastSuccessfulRunAt: Date | null;
  healthStatus: HealthStatus;
}

export interface PipelineRunDTO {
  id: string;
  dataSourceKey: DataSourceKey;
  status: string;
  startedAt: Date;
  completedAt: Date | null;
  recordsProcessed: number | null;
  errorMessage: string | null;
}

export interface ScoreWeightConfigDTO {
  id: string;
  isActive: boolean;
  createdAt: Date;
  weights: { sourceKey: DataSourceKey; weight: number }[];
}
