import { z } from 'zod';
import { DataSourceKey } from '@prisma/client';

export const refreshParamsSchema = z.object({
  params: z.object({
    sourceKey: z.nativeEnum(DataSourceKey),
  }),
});

export const recomputeBodySchema = z.object({
  body: z.object({
    period: z.string(),
  }),
});

export const createWeightConfigSchema = z.object({
  body: z.object({
    weights: z.array(
      z.object({
        sourceKey: z.enum(['VIIRS', 'GHSL', 'RWI']),
        weight: z.number(),
      }),
    ),
  }),
});
