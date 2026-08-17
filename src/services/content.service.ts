import { prisma } from '../config/db.js';

export interface LandingContentDTO {
  tagline: string;
  intro: string;
  highlightStats: {
    publishedCaseStudyCount: number;
    lastDataRefresh: string | null;
  };
}

export interface MethodologyContentDTO {
  scoreExplanation: string;
  dataSources: { key: string; name: string; description: string }[];
  validationApproach: string;
  limitations: string[];
}

export const getLandingStats = async (): Promise<LandingContentDTO> => {
  const publishedCaseStudyCount = await prisma.caseStudy.count({
    where: { isPublished: true },
  });

  const lastSuccessfulRun = await prisma.pipelineRun.findFirst({
    where: { status: 'SUCCESS' },
    orderBy: { completedAt: 'desc' },
    select: { completedAt: true },
  });

  return {
    tagline: 'See the economy that no one measures.',
    intro:
      'The Shadow Economy Map tracks real, on-the-ground growth in Addis Ababa using satellite imagery, night-time lights, and wealth indicators — independently validated against real-world case studies.',
    highlightStats: {
      publishedCaseStudyCount,
      lastDataRefresh: lastSuccessfulRun?.completedAt
        ? lastSuccessfulRun.completedAt.toISOString()
        : null,
    },
  };
};

export const getMethodologyContent = async (): Promise<MethodologyContentDTO> => {
  const sources = await prisma.dataSource.findMany({
    select: { key: true, name: true, description: true },
  });

  return {
    scoreExplanation:
      'The composite score combines three independent signals — night-time light intensity, built-up area change, and relative wealth — into a single 0–1 growth indicator for each grid cell.',
    dataSources: sources,
    validationApproach:
      'Case studies are sourced through a tiered evidence process (official announcements, market reports, infrastructure coverage, then local news) and confirmed only when the composite score rise is corroborated by independently dated, verifiable evidence.',
    limitations: [
      'Detects current/recent activity only — does not forecast future growth',
      'Covers Addis Ababa only',
      'Does not measure informal/tax-related economic activity specifically',
      'Some inputs (RWI) are coarse resolution (~2.4km)',
      'Map data reflects the last admin-triggered refresh, not real-time',
    ],
  };
};
