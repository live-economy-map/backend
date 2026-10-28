import { z } from 'zod';

export const createSavedAreaSchema = z.object({
  body: z.object({
    gridCellId: z.string().uuid('Valid grid cell UUID is required'),
    customName: z.string().trim().max(100, 'Custom name cannot exceed 100 characters').optional(),
    notes: z.string().trim().max(1000, 'Notes cannot exceed 1000 characters').optional(),
  }),
});

export const updateSavedAreaSchema = z.object({
  params: z.object({
    id: z.string().uuid('Valid saved area ID is required'),
  }),
  body: z
    .object({
      customName: z.string().trim().max(100).optional(),
      notes: z.string().trim().max(1000).optional(),
    })
    .refine((data) => data.customName !== undefined || data.notes !== undefined, {
      message: 'At least one field (customName or notes) must be provided for update',
    }),
});

export const savedAreaIdParamSchema = z.object({
  params: z.object({
    id: z.string().uuid('Valid saved area ID is required'),
  }),
});

export type CreateSavedAreaInput = z.infer<typeof createSavedAreaSchema>['body'];
export type UpdateSavedAreaInput = z.infer<typeof updateSavedAreaSchema>['body'];
