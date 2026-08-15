import { z } from 'zod';
import { EvidenceTier } from '@prisma/client';

export const createCaseStudySchema = z.object({
  body: z.object({
    name: z.string().min(1),
    latitude: z.number(),
    longitude: z.number(),
    gridCellId: z.string().uuid().optional(),
    evidenceDescription: z.string().min(1),
    evidenceUrl: z.string().url().optional(),
    evidenceTier: z.nativeEnum(EvidenceTier).optional(),
    scoreRiseDate: z.string().date(),
    confirmedDate: z.string().date(),
    beforeImageUrl: z.string().url().optional(),
    afterImageUrl: z.string().url().optional(),
    isPublished: z.boolean().optional().default(false),
  }),
});

export const updateCaseStudySchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
    gridCellId: z.string().uuid().optional(),
    evidenceDescription: z.string().min(1).optional(),
    evidenceUrl: z.string().url().optional(),
    evidenceTier: z.nativeEnum(EvidenceTier).optional(),
    scoreRiseDate: z.string().date().optional(),
    confirmedDate: z.string().date().optional(),
    beforeImageUrl: z.string().url().optional(),
    afterImageUrl: z.string().url().optional(),
    isPublished: z.boolean().optional(),
  }),
  params: z.object({
    caseStudyId: z.string().uuid(),
  }),
});

export const discoverBodySchema = z.object({
  body: z.object({
    areaFocus: z.string().min(1),
  }),
});
