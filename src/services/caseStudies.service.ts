import { prisma } from '../config/db.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import type { CaseStudySummaryDTO, CaseStudyDetailDTO, PaginatedResponse } from '../types/index.js';

export const getPublishedCaseStudies = async (
  page: number = 1,
  limit: number = 20,
): Promise<PaginatedResponse<CaseStudySummaryDTO>> => {
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.caseStudy.findMany({
      where: { isPublished: true },
      select: {
        id: true,
        name: true,
        latitude: true,
        longitude: true,
        beforeImageUrl: true,
        afterImageUrl: true,
      },
      skip,
      take: limit,
    }),
    prisma.caseStudy.count({ where: { isPublished: true } }),
  ]);

  return {
    items: items as CaseStudySummaryDTO[],
    page,
    limit,
    total,
  };
};

export const getPublishedCaseStudyById = async (id: string): Promise<CaseStudyDetailDTO> => {
  const caseStudy = await prisma.caseStudy.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
      beforeImageUrl: true,
      afterImageUrl: true,
      evidenceDescription: true,
      evidenceUrl: true,
      evidenceTier: true,
      scoreRiseDate: true,
      confirmedDate: true,
      isPublished: true,
    },
  });

  if (!caseStudy || !caseStudy.isPublished) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'Case study not found');
  }

  const { isPublished, ...dto } = caseStudy;
  return dto as CaseStudyDetailDTO;
};
