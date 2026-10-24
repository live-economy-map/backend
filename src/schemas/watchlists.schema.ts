import { z } from 'zod';

export const createWatchlistSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    description: z.string().max(500).optional(),
    orgId: z.string().uuid('Invalid organization UUID').optional(),
    cellIds: z.array(z.string().uuid()).optional(),
  }),
});

export const getWatchlistParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid watchlist UUID'),
  }),
});

export const addWatchlistItemSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid watchlist UUID'),
  }),
  body: z.object({
    gridCellId: z.string().uuid('Invalid grid cell UUID'),
    notes: z.string().max(500).optional(),
  }),
});

export const removeWatchlistItemSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid watchlist UUID'),
    cellId: z.string().uuid('Invalid grid cell UUID'),
  }),
});

export type CreateWatchlistInput = z.infer<typeof createWatchlistSchema>['body'];
export type AddWatchlistItemInput = z.infer<typeof addWatchlistItemSchema>['body'];
