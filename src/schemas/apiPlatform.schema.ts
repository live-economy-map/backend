import { z } from 'zod';

export const createApiKeySchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    tier: z.enum(['COMMERCIAL', 'INSTITUTIONAL']).default('COMMERCIAL'),
    orgId: z.string().uuid('Invalid organization UUID').optional(),
    expiresInDays: z.number().int().positive().max(365).optional(),
  }),
});

export const revokeApiKeySchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid API key UUID'),
  }),
});

export const publicCellsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(200).default(50),
    minLat: z.coerce.number().optional(),
    maxLat: z.coerce.number().optional(),
    minLng: z.coerce.number().optional(),
    maxLng: z.coerce.number().optional(),
  }),
});

export const publicScoresQuerySchema = z.object({
  query: z.object({
    period: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid ISO date (YYYY-MM-DD)')
      .optional(),
    cellIds: z.string().optional(),
  }),
});

export const publicHistorySchema = z.object({
  params: z.object({
    cellId: z.string().uuid('Invalid cell UUID'),
  }),
  query: z.object({
    limit: z.coerce.number().int().positive().max(100).default(24),
  }),
});

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>['body'];
export type PublicCellsQuery = z.infer<typeof publicCellsQuerySchema>['query'];
export type PublicScoresQuery = z.infer<typeof publicScoresQuerySchema>['query'];
export type PublicHistoryQuery = z.infer<typeof publicHistorySchema>['query'];
