import { z } from 'zod';
import { DataSourceKey } from '@prisma/client';

export const refreshParamsSchema = z.object({
  params: z.object({
    sourceKey: z.nativeEnum(DataSourceKey),
  }),
});

export const recomputeBodySchema = z.object({
  body: z.object({
    period: z.string().date(),
  }),
});

export const createWeightConfigSchema = z.object({
  body: z.object({
    weights: z
      .array(
        z.object({
          sourceKey: z.enum(['VIIRS', 'GHSL', 'RWI']),
          weight: z.number().min(0).max(1),
        }),
      )
      .length(3)
      .refine(
        (w) => new Set(w.map((x) => x.sourceKey)).size === 3,
        'Must include VIIRS, GHSL, and RWI exactly once each',
      ),
  }),
});

export type RefreshParamsInput = z.infer<typeof refreshParamsSchema>;
export type RecomputeBodyInput = z.infer<typeof recomputeBodySchema>;
export type CreateWeightConfigInput = z.infer<typeof createWeightConfigSchema>;
