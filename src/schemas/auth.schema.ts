import { z } from 'zod';

export const registerSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email address is required').toLowerCase().trim(),
    password: z.string().min(8, 'Password must be at least 8 characters long'),
    fullName: z.string().trim().min(1, 'Full name cannot be empty').optional(),
    organizationName: z.string().trim().min(1, 'Organization name cannot be empty').optional(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email address is required').toLowerCase().trim(),
    password: z.string().min(1, 'Password is required'),
  }),
});

export const verifyEmailSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Verification token is required'),
  }),
});

export const forgotPasswordSchema = z.object({
  body: z.object({
    email: z.string().email('Valid email address is required').toLowerCase().trim(),
  }),
});

export const resetPasswordSchema = z.object({
  body: z.object({
    token: z.string().min(1, 'Reset token is required'),
    newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
  }),
});

export const updateProfileSchema = z.object({
  body: z
    .object({
      fullName: z.string().trim().min(1).optional(),
      organizationName: z.string().trim().min(1).optional(),
    })
    .refine((data) => data.fullName !== undefined || data.organizationName !== undefined, {
      message: 'At least one field (fullName or organizationName) must be provided for update',
    }),
});

export type RegisterInput = z.infer<typeof registerSchema>['body'];
export type LoginInput = z.infer<typeof loginSchema>['body'];
export type VerifyEmailInput = z.infer<typeof verifyEmailSchema>['body'];
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>['body'];
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>['body'];
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>['body'];
