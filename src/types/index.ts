import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    role: string;
  };
}

declare global {
  namespace Express {
    interface Request {
      id: string;
    }
  }
}

export interface CaseStudySummaryDTO {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  beforeImageUrl: string | null;
  afterImageUrl: string | null;
}

export interface CaseStudyDetailDTO extends CaseStudySummaryDTO {
  evidenceDescription: string;
  evidenceUrl: string | null;
  evidenceTier: string | null;
  scoreRiseDate: Date;
  confirmedDate: Date;
}

export interface PaginatedResponse<T> {
  items: T[];
  page: number;
  limit: number;
  total: number;
}
