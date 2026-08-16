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
  throw new Error('not implemented');
};

export const getMethodologyContent = async (): Promise<MethodologyContentDTO> => {
  throw new Error('not implemented');
};