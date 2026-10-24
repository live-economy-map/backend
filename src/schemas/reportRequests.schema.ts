import { z } from 'zod';

const REQUEST_STATUSES = [
  'SUBMITTED',
  'IN_REVIEW',
  'IN_PROGRESS',
  'DELIVERED',
  'REJECTED',
] as const;
const CONTACT_PREFERENCES = ['EMAIL', 'PHONE', 'TELEGRAM'] as const;

export const createReportRequestSchema = z.object({
  body: z.object({
    title: z.string().trim().min(3, 'Title must be at least 3 characters').max(150),
    questionPrompt: z
      .string()
      .trim()
      .min(10, 'Question prompt must be at least 10 characters')
      .max(2000),
    areaCellIds: z
      .array(z.string().uuid('Each cell ID must be a valid UUID'))
      .min(1, 'At least one area/grid cell ID must be selected')
      .max(50, 'Cannot exceed 50 cells in a single request'),
    orgType: z.string().trim().max(100).optional(),
    contactPreference: z.enum(CONTACT_PREFERENCES).default('EMAIL'),
    phoneNumber: z.string().trim().optional(),
    telegramHandle: z.string().trim().optional(),
  }),
});

export const requestIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Valid report request UUID is required'),
  }),
});

export const adminUpdateReportRequestSchema = z.object({
  params: z.object({
    id: z.string().uuid('Valid report request UUID is required'),
  }),
  body: z
    .object({
      status: z.enum(REQUEST_STATUSES).optional(),
      priority: z.boolean().optional(),
      assignedAdminId: z.string().uuid().nullable().optional(),
      internalNotes: z.string().trim().max(2000).optional(),
      statusChangeNote: z.string().trim().max(500).optional(),
      phoneNumber: z.string().trim().nullable().optional(),
      telegramHandle: z.string().trim().nullable().optional(),
    })
    .refine(
      (data) =>
        data.status !== undefined ||
        data.priority !== undefined ||
        data.assignedAdminId !== undefined ||
        data.internalNotes !== undefined ||
        data.phoneNumber !== undefined ||
        data.telegramHandle !== undefined,
      {
        message: 'At least one field must be provided for update',
      },
    ),
});

export const adminUploadDeliverableSchema = z.object({
  params: z.object({
    id: z.string().uuid('Valid report request UUID is required'),
  }),
  body: z.object({
    fileUrl: z.string().url('Valid file URL is required'),
    fileName: z.string().trim().min(1, 'File name is required').max(255),
    fileSizeBytes: z.number().int().positive('File size in bytes must be positive'),
    mimeType: z.string().trim().min(1, 'MIME type is required').max(100),
  }),
});

export const adminReportRequestsQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(REQUEST_STATUSES).optional(),
    priority: z
      .enum(['true', 'false'])
      .transform((val) => val === 'true')
      .optional(),
    assignedAdminId: z.string().uuid().optional(),
  }),
});

export type CreateReportRequestInput = z.infer<typeof createReportRequestSchema>['body'];
export type AdminUpdateReportRequestInput = z.infer<typeof adminUpdateReportRequestSchema>['body'];
export type AdminUploadDeliverableInput = z.infer<typeof adminUploadDeliverableSchema>['body'];
export type AdminReportRequestsQuery = z.infer<typeof adminReportRequestsQuerySchema>['query'];
