import { z } from 'zod';

export const getCellsQuerySchema = z.object({
  query: z.object({
    period: z.string().date().optional(),
  }),
});

export const getCellDetailParamsSchema = z.object({
  params: z.object({
    cellId: z.string().uuid(),
  }),
  query: z.object({
    period: z.string().date().optional(),
  }),
});

export const getRawLayerParamsSchema = z.object({
  params: z.object({
    sourceKey: z.enum(['VIIRS', 'GHSL', 'RWI']),
  }),
  query: z.object({
    period: z.string().date().optional(),
  }),
});

export const searchMapBodySchema = z.object({
  body: z.object({
    query: z.string().min(3).max(200),
  }),
});

export const getPeriodsQuerySchema = z.object({});

export const chatCellSchema = z.object({
  params: z.object({
    cellId: z.string().uuid('Valid cell UUID is required'),
  }),
  body: z.object({
    message: z.string().trim().min(1, 'Message is required').max(1000),
    history: z
      .array(
        z.object({
          role: z.enum(['user', 'assistant']),
          content: z.string().trim().min(1).max(2000),
        }),
      )
      .max(20)
      .optional()
      .default([]),
  }),
});

export type GetCellsQuery = z.infer<typeof getCellsQuerySchema>['query'];
export type GetCellDetailParams = z.infer<typeof getCellDetailParamsSchema>;
export type GetRawLayerParams = z.infer<typeof getRawLayerParamsSchema>;
export type SearchMapBody = z.infer<typeof searchMapBodySchema>['body'];
export type ChatCellInput = z.infer<typeof chatCellSchema>['body'];
