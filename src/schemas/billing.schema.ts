import { z } from 'zod';

export const checkoutSchema = z.object({
  body: z.object({
    planId: z.string().uuid('Invalid plan ID format'),
    returnUrl: z.string().url('Invalid return URL format').optional(),
  }),
});

export const verifyPaymentParamsSchema = z.object({
  params: z.object({
    txRef: z.string().min(1, 'Transaction reference is required'),
  }),
});

export const adminCreatePlanSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    priceEtb: z.number().int().positive('Price in ETB cents must be greater than 0'),
    interval: z.enum(['MONTHLY', 'YEARLY']).default('MONTHLY'),
    canExport: z.boolean().default(false),
    canAlert: z.boolean().default(false),
    maxAlerts: z.number().int().nonnegative().default(0),
    priorityReports: z.boolean().default(false),
    isActive: z.boolean().default(true),
  }),
});

export const adminUpdateSubscriptionSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid subscription ID format'),
  }),
  body: z
    .object({
      status: z.enum(['INCOMPLETE', 'ACTIVE', 'PAST_DUE', 'CANCELED', 'EXPIRED']).optional(),
      currentPeriodEnd: z.coerce.date().optional(),
      planId: z.string().uuid('Invalid plan ID format').optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
});

export const adminListPaymentsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    status: z.enum(['PENDING', 'SUCCESS', 'FAILED']).optional(),
    userId: z.string().uuid().optional(),
  }),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>['body'];
export type AdminCreatePlanInput = z.infer<typeof adminCreatePlanSchema>['body'];
export type AdminUpdateSubscriptionInput = z.infer<typeof adminUpdateSubscriptionSchema>['body'];
export type AdminListPaymentsQuery = z.infer<typeof adminListPaymentsQuerySchema>['query'];
