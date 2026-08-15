import type {
  CompositeLayerResultDTO,
  CellDetailDTO,
  SignalValueDTO,
  RawLayerResultDTO,
  SearchResultDTO,
} from '../types/map.types.js';

export const getCompositeScoreLayer = async (period?: string): Promise<CompositeLayerResultDTO> => {
  throw new Error('Not implemented');
};

export const getCellDetail = async (cellId: string, period?: string): Promise<CellDetailDTO> => {
  throw new Error('Not implemented');
};

export const generateCellSummary = async (
  signals: SignalValueDTO[],
  compositeScore: number,
): Promise<string | null> => {
  throw new Error('Not implemented');
};

export const getRawSignalLayer = async (
  sourceKey: 'VIIRS' | 'GHSL' | 'RWI',
  period?: string,
): Promise<RawLayerResultDTO> => {
  throw new Error('Not implemented');
};

export const parseNaturalLanguageQuery = async (query: string): Promise<SearchResultDTO> => {
  throw new Error('Not implemented');
};
