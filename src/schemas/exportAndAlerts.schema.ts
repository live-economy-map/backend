import { z } from 'zod';

export const exportDataQuerySchema = z.object({
  query: z
    .object({
      format: z.enum(['CSV', 'JSON']).default('CSV'),
      periodStart: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid ISO date (YYYY-MM-DD)')
        .optional(),
      periodEnd: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid ISO date (YYYY-MM-DD)')
        .optional(),
      from: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid ISO date (YYYY-MM-DD)')
        .optional(),
      to: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid ISO date (YYYY-MM-DD)')
        .optional(),
      cellIds: z.string().optional(),
    })
    .transform((data) => ({
      ...data,
      periodStart: data.periodStart || data.from,
      periodEnd: data.periodEnd || data.to,
    })),
});

export const createAlertRuleSchema = z.object({
  body: z.object({
    gridCellId: z.string().uuid('Invalid grid cell UUID'),
    thresholdDelta: z
      .number()
      .min(0.01, 'Minimum threshold delta is 0.01 (1%)')
      .max(1.0, 'Maximum threshold delta is 1.0 (100%)'),
  }),
});

export const updateAlertRuleSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid alert rule ID'),
  }),
  body: z
    .object({
      thresholdDelta: z.number().min(0.01).max(1.0).optional(),
      isActive: z.boolean().optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
});

export const deleteAlertRuleSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid alert rule ID'),
  }),
});

export const listNotificationsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    unreadOnly: z.coerce.boolean().optional(),
  }),
});

export const markNotificationReadParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid notification ID'),
  }),
});

export type ExportDataQuery = z.infer<typeof exportDataQuerySchema>['query'];
export type CreateAlertRuleInput = z.infer<typeof createAlertRuleSchema>['body'];
export type UpdateAlertRuleInput = z.infer<typeof updateAlertRuleSchema>['body'];
export type ListNotificationsQuery = z.infer<typeof listNotificationsQuerySchema>['query'];
