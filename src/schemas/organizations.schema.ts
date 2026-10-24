import { z } from 'zod';

export const createOrgSchema = z.object({
  body: z.object({
    name: z.string().min(2, 'Name must be at least 2 characters').max(100),
    slug: z
      .string()
      .min(2, 'Slug must be at least 2 characters')
      .max(50)
      .regex(/^[a-z0-9-]+$/, 'Slug must be lower-case alphanumeric with dashes'),
  }),
});

export const getOrgParamsSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid organization UUID'),
  }),
});

export const addMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid organization UUID'),
  }),
  body: z.object({
    userId: z.string().uuid('Invalid user UUID'),
    role: z.enum(['OWNER', 'ADMIN', 'MEMBER']).default('MEMBER'),
  }),
});

export const removeMemberSchema = z.object({
  params: z.object({
    id: z.string().uuid('Invalid organization UUID'),
    userId: z.string().uuid('Invalid user UUID'),
  }),
});

export type CreateOrgInput = z.infer<typeof createOrgSchema>['body'];
export type AddMemberInput = z.infer<typeof addMemberSchema>['body'];
