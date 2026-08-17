import { Request } from 'express';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    createdAt: Date | string;
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
export interface CompositeScoreLayerDTO {
  period: string;
  periodSubstituted: boolean;
  cells: Array<{
    gridCell: { id: string; cellRow: number; cellCol: number; boundaryGeoJson: any };
    compositeScore: number;
    isComplete: boolean;
  }>;
}

export interface CellDetailDTO {
  cellId: string;
  areaLabel: string | null;
  compositeScore: number;
  signals: Array<{
    source: string;
    rawValue: number;
    normalizedValue: number;
  }>;
  trend: 'up' | 'down' | 'flat';
  sparkline: Array<{ period: string; compositeScore: number }>;
  aiSummary: string | null;
}

export interface RawSignalLayerDTO {
  sourceKey: string;
  period: string;
  periodSubstituted: boolean;
  cells: Array<{
    gridCellId: string;
    normalizedValue: number;
  }>;
}

export interface ParsedFiltersDTO {
  parsedFilters: any | null;
  cells: any[];
}
