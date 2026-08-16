import { prisma } from '../config/db.js';
import { generateStructuredOutput } from '../utils/aiClient.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { z } from 'zod';

export interface AdminCaseStudyDTO {
  id: string;
  name: string;
  isPublished: boolean;
  evidenceTier: string | null;
  createdAt: Date;
}

export interface DiscoveryCandidateDTO {
  summary: string;
  sourceUrl: string;
  suggestedEvidenceTier: string;
  mentionedDate: string;
}

const discoveryResultSchema = z.object({
  candidates: z.array(
    z.object({
      summary: z.string(),
      sourceUrl: z.string(),
      suggestedEvidenceTier: z.string(),
      mentionedDate: z.string(),
    }),
  ),
});

// GET /admin/case-studies — sees both published and draft entries (unlike the
// public caseStudies.service, which always forces isPublished: true).
export const getAllCaseStudies = async (
  isPublished?: boolean,
  page: number = 1,
  limit: number = 20,
): Promise<{ items: AdminCaseStudyDTO[]; page: number; limit: number; total: number }> => {
  const skip = (page - 1) * limit;
  const where = isPublished === undefined ? {} : { isPublished };

  const [items, total] = await Promise.all([
    prisma.caseStudy.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.caseStudy.count({ where }),
  ]);

  return { items: items as AdminCaseStudyDTO[], page, limit, total };
};

// POST /admin/case-studies — creates a draft (unless isPublished explicitly
// set). scoreRiseDate > confirmedDate is a warning, never a rejection.
export const createCaseStudy = async (
  input: any,
  createdById: string,
): Promise<{ caseStudy: any; dateOrderWarning: boolean }> => {
  if (input.gridCellId) {
    const gridCell = await prisma.gridCell.findUnique({ where: { id: input.gridCellId } });
    if (!gridCell) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Grid cell not found');
    }
  }

  const caseStudy = await prisma.caseStudy.create({
    data: {
      name: input.name,
      latitude: input.latitude,
      longitude: input.longitude,
      gridCellId: input.gridCellId,
      evidenceDescription: input.evidenceDescription,
      evidenceUrl: input.evidenceUrl,
      evidenceTier: input.evidenceTier,
      scoreRiseDate: new Date(input.scoreRiseDate),
      confirmedDate: new Date(input.confirmedDate),
      beforeImageUrl: input.beforeImageUrl,
      afterImageUrl: input.afterImageUrl,
      isPublished: input.isPublished ?? false,
      createdById,
    },
  });

  const dateOrderWarning = new Date(caseStudy.scoreRiseDate) > new Date(caseStudy.confirmedDate);

  return { caseStudy, dateOrderWarning };
};

// PATCH /admin/case-studies/:caseStudyId — partial update, also used for
// publishing (isPublished: true). Warning is re-evaluated against the
// resulting merged record, not just the fields present in this request.
export const updateCaseStudy = async (
  id: string,
  input: any,
): Promise<{ caseStudy: any; dateOrderWarning: boolean }> => {
  if (input.gridCellId) {
    const gridCell = await prisma.gridCell.findUnique({ where: { id: input.gridCellId } });
    if (!gridCell) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Grid cell not found');
    }
  }

  let caseStudy: any;
  try {
    caseStudy = await prisma.caseStudy.update({
      where: { id },
      data: input,
    });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Case study not found');
    }
    throw error;
  }

  const dateOrderWarning = new Date(caseStudy.scoreRiseDate) > new Date(caseStudy.confirmedDate);

  return { caseStudy, dateOrderWarning };
};

// DELETE /admin/case-studies/:caseStudyId — genuine hard delete, never a
// soft-delete via update.
export const deleteCaseStudy = async (id: string): Promise<void> => {
  try {
    await prisma.caseStudy.delete({ where: { id } });
  } catch (error: any) {
    if (error?.code === 'P2025') {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Case study not found');
    }
    throw error;
  }
};

// POST /admin/case-studies/discover — internal AI-assisted lead discovery.
// Never writes to the database; empty/malformed AI output resolves to an
// empty candidate list rather than an error or a fabricated suggestion.
export const searchCaseStudyCandidates = async (
  areaFocus: string,
): Promise<{ candidates: DiscoveryCandidateDTO[] }> => {
  let result;
  try {
    result = await generateStructuredOutput(
      `Find recent news mentions suggesting growth or development activity in: ${areaFocus}`,
      discoveryResultSchema,
    );
  } catch (error) {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Discovery search is temporarily unavailable');
  }

  if (!result) {
    return { candidates: [] };
  }

  return { candidates: result.candidates };
};
