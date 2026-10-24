import { z } from 'zod';

export const generateDraftSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid report request UUID'),
  }),
  body: z
    .object({
      customPrompt: z.string().max(2000).optional(),
      model: z.string().default('llama-3.3-70b-versatile'),
    })
    .default({}),
});

export const getDraftParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid draft UUID'),
  }),
});

export const updateDraftSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid draft UUID'),
  }),
  body: z
    .object({
      draftContent: z.string().min(20, 'Draft content must be at least 20 characters').optional(),
      reviewNotes: z.string().optional(),
      status: z.enum(['DRAFT', 'IN_REVIEW', 'APPROVED']).optional(),
    })
    .refine((data) => Object.keys(data).length > 0, {
      message: 'At least one field must be provided for update',
    }),
});

export const deliverDraftSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid draft UUID'),
  }),
  body: z
    .object({
      finalNote: z.string().optional(),
      fileName: z.string().optional(),
    })
    .default({}),
});

export type GenerateDraftInput = z.infer<typeof generateDraftSchema>['body'];
export type UpdateDraftInput = z.infer<typeof updateDraftSchema>['body'];
export type DeliverDraftInput = z.infer<typeof deliverDraftSchema>['body'];
