import { prisma } from '../config/db.js';
import * as aiClient from '../utils/aiClient.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';

export const getAllCaseStudies = async (
  isPublished?: boolean,
  page?: number,
  limit?: number,
): Promise<{ items: any[]; total: number }> => {
  throw new Error('not implemented');
};

export const createCaseStudy = async (
  input: unknown,
  createdById: string,
): Promise<{ caseStudy: any; dateOrderWarning: boolean }> => {
  throw new Error('not implemented');
};

export const updateCaseStudy = async (
  id: string,
  input: unknown,
): Promise<{ caseStudy: any; dateOrderWarning: boolean }> => {
  throw new Error('not implemented');
};

export const deleteCaseStudy = async (id: string): Promise<void> => {
  throw new Error('not implemented');
};

export const searchCaseStudyCandidates = async (
  areaFocus: string,
): Promise<{ candidates: any[] }> => {
  throw new Error('not implemented');
};
