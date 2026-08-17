import { prisma } from '../config/db.js';
import { generateText, generateStructuredOutput } from '../utils/aiClient.js';
import ApiError from '../utils/ApiError.js';
import { HTTP_STATUS } from '../constants/index.js';
import { z } from 'zod';
import type {
  CompositeScoreLayerDTO,
  CellDetailDTO,
  RawSignalLayerDTO,
  ParsedFiltersDTO,
} from '../types/index.js';

// Schema for parseNaturalLanguageQuery
const parsedFiltersSchema = z
  .object({
    areaLabel: z.string().optional(),
    period: z.string().optional(),
    signalFocus: z.enum(['VIIRS', 'GHSL', 'RWI']).optional(),
  })
  .nullable();

export const getCompositeScoreLayer = async (period?: string): Promise<CompositeScoreLayerDTO> => {
  const targetPeriod = period ? new Date(period) : new Date();

  // Step 1: Try exact period
  let cells = await prisma.compositeScoreSnapshot.findMany({
    where: {
      period: targetPeriod,
      scoreWeightConfig: { isActive: true },
    },
    select: {
      gridCell: {
        select: { id: true, cellRow: true, cellCol: true, boundaryGeoJson: true },
      },
      compositeScore: true,
      isComplete: true,
    },
  });

  let substitutedPeriod = targetPeriod;
  let periodSubstituted = false;

  // Step 2: Fallback to nearest earlier period if empty
  if (cells.length === 0) {
    const fallback = await prisma.compositeScoreSnapshot.findFirst({
      where: {
        period: { lt: targetPeriod },
        scoreWeightConfig: { isActive: true },
      },
      orderBy: { period: 'desc' },
      select: { period: true },
    });

    if (fallback) {
      substitutedPeriod = fallback.period;
      periodSubstituted = true;

      // Step 3: Re-query with substituted period
      cells = await prisma.compositeScoreSnapshot.findMany({
        where: {
          period: substitutedPeriod,
          scoreWeightConfig: { isActive: true },
        },
        select: {
          gridCell: {
            select: { id: true, cellRow: true, cellCol: true, boundaryGeoJson: true },
          },
          compositeScore: true,
          isComplete: true,
        },
      });
    }
  }

  return {
    period: substitutedPeriod.toISOString().split('T')[0],
    periodSubstituted,
    cells: cells.map((c) => ({
      gridCell: c.gridCell,
      compositeScore: c.compositeScore,
      isComplete: c.isComplete,
    })),
  };
};

export const getCellDetail = async (cellId: string, period?: string): Promise<CellDetailDTO> => {
  const cell = await prisma.gridCell.findUnique({
    where: { id: cellId },
    select: { id: true, areaLabel: true },
  });

  if (!cell) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'No data available for this cell');
  }

  // Fetch all snapshots for this cell to get sparkline + trend
  const snapshots = await prisma.compositeScoreSnapshot.findMany({
    where: { gridCellId: cellId },
    select: { period: true, compositeScore: true },
    orderBy: { period: 'desc' },
    take: 6,
  });

  if (snapshots.length === 0) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'No data available for this cell');
  }

  // Get current period snapshot
  const currentSnapshot = snapshots[0];
  const priorSnapshot = snapshots[1];

  // Compute trend
  let trend: 'up' | 'down' | 'flat' = 'flat';
  if (priorSnapshot) {
    if (currentSnapshot.compositeScore > priorSnapshot.compositeScore) {
      trend = 'up';
    } else if (currentSnapshot.compositeScore < priorSnapshot.compositeScore) {
      trend = 'down';
    }
  }

  // Fetch signals for current period
  const signals = await prisma.signalValue.findMany({
    where: {
      gridCellId: cellId,
      period: currentSnapshot.period,
    },
    select: {
      dataSource: { select: { key: true } },
      rawValue: true,
      normalizedValue: true,
    },
  });

  // Generate AI summary
  const aiSummary = await generateCellSummary(
    signals.map((s) => ({
      source: s.dataSource.key as 'VIIRS' | 'GHSL' | 'RWI' | 'GDELT',
      rawValue: s.rawValue,
      normalizedValue: s.normalizedValue,
    })),
    currentSnapshot.compositeScore,
  );

  // Build sparkline (oldest -> newest, max 6)
  const sparkline = snapshots
    .reverse()
    .slice(-6)
    .map((s) => ({
      period: s.period.toISOString().split('T')[0],
      compositeScore: s.compositeScore,
    }));

  return {
    cellId,
    areaLabel: cell.areaLabel,
    compositeScore: currentSnapshot.compositeScore,
    signals: signals.map((s) => ({
      source: s.dataSource.key,
      rawValue: s.rawValue,
      normalizedValue: s.normalizedValue,
    })),
    trend,
    sparkline,
    aiSummary,
  };
};

export const generateCellSummary = async (
  signals: Array<{ source: string; rawValue: number; normalizedValue: number }>,
  compositeScore: number,
): Promise<string | null> => {
  try {
    const prompt = `Provide a one-sentence summary of economic activity based on these signals:\n${signals
      .map((s) => `${s.source}: raw=${s.rawValue}, normalized=${s.normalizedValue}`)
      .join('\n')}\nComposite Score: ${compositeScore}`;

    return await generateText(prompt);
  } catch {
    return null;
  }
};

export const getRawSignalLayer = async (
  sourceKey: 'VIIRS' | 'GHSL' | 'RWI',
  period?: string,
): Promise<RawSignalLayerDTO> => {
  const targetPeriod = period ? new Date(period) : new Date();

  // Step 1: Try exact period
  let cells = await prisma.signalValue.findMany({
    where: {
      period: targetPeriod,
      dataSource: { key: sourceKey },
    },
    select: {
      gridCellId: true,
      normalizedValue: true,
    },
  });

  let substitutedPeriod = targetPeriod;
  let periodSubstituted = false;

  // Step 2: Fallback to nearest earlier
  if (cells.length === 0) {
    const fallback = await prisma.signalValue.findFirst({
      where: {
        period: { lt: targetPeriod },
        dataSource: { key: sourceKey },
      },
      orderBy: { period: 'desc' },
      select: { period: true },
    });

    if (fallback) {
      substitutedPeriod = fallback.period;
      periodSubstituted = true;

      // Step 3: Re-query
      cells = await prisma.signalValue.findMany({
        where: {
          period: substitutedPeriod,
          dataSource: { key: sourceKey },
        },
        select: {
          gridCellId: true,
          normalizedValue: true,
        },
      });
    }
  }

  return {
    sourceKey,
    period: substitutedPeriod.toISOString().split('T')[0],
    periodSubstituted,
    cells: cells.map((c) => ({
      gridCellId: c.gridCellId,
      normalizedValue: c.normalizedValue,
    })),
  };
};

export const parseNaturalLanguageQuery = async (query: string): Promise<ParsedFiltersDTO> => {
  const prompt = `Convert this natural language query into structured map filters (areaLabel, period, signalFocus). If unparseable or low-confidence, return null for filters. Query: "${query}"`;

  let result;
  try {
    result = await generateStructuredOutput(prompt, parsedFiltersSchema);
  } catch {
    throw new ApiError(HTTP_STATUS.BAD_REQUEST, 'Search is temporarily unavailable');
  }

  if (!result) {
    return { parsedFilters: null, cells: [] };
  }

  const where: any = { scoreWeightConfig: { isActive: true } };
  if (result.period) where.period = new Date(result.period);
  if (result.areaLabel) {
    where.gridCell = { areaLabel: { contains: result.areaLabel, mode: 'insensitive' } };
  }

  const snapshots = await prisma.compositeScoreSnapshot.findMany({
    where,
    select: { gridCellId: true, compositeScore: true },
  });

  return {
    parsedFilters: result,
    cells: snapshots.map((s) => ({ cellId: s.gridCellId, compositeScore: s.compositeScore })),
  };
};
