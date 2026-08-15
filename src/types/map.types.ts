export interface GrowthCellDTO {
  cellId: string;
  cellRow: number;
  cellCol: number;
  boundaryGeoJson: object;
  compositeScore: number;
  isComplete: boolean;
}

export interface CompositeLayerResultDTO {
  period: string;
  periodSubstituted: boolean;
  cells: GrowthCellDTO[];
}

export interface SignalValueDTO {
  source: 'VIIRS' | 'GHSL' | 'RWI';
  rawValue: number;
  normalizedValue: number;
}

export interface SparklinePointDTO {
  period: string;
  compositeScore: number;
}

export interface CellDetailDTO {
  cellId: string;
  period: string;
  areaLabel: string | null;
  compositeScore: number;
  isComplete: boolean;
  trend: 'up' | 'down' | 'flat';
  sparkline: SparklinePointDTO[];
  signals: SignalValueDTO[];
  aiSummary: string | null;
  lastUpdated: string;
}

export interface RawLayerCellDTO {
  cellId: string;
  normalizedValue: number;
}

export interface RawLayerResultDTO {
  sourceKey: 'VIIRS' | 'GHSL' | 'RWI';
  period: string;
  periodSubstituted: boolean;
  cells: RawLayerCellDTO[];
}

export interface ParsedFilters {
  areaLabel?: string;
  period?: string;
  signalFocus?: 'VIIRS' | 'GHSL' | 'RWI';
}

export interface SearchMatchCellDTO {
  cellId: string;
  compositeScore: number;
}

export interface SearchResultDTO {
  parsedFilters: ParsedFilters | null;
  cells: SearchMatchCellDTO[];
}
