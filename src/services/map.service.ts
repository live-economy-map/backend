// src/services/map.service.ts
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
  // 1. Determine the date string
  let dateString: string;
  if (period) {
    dateString = period;
  } else {
    const latest = await prisma.compositeScoreSnapshot.findFirst({
      orderBy: { period: 'desc' },
      select: { period: true },
    });
    dateString = latest ? latest.period.toISOString().split('T')[0] : '2026-03-01';
  }

  // 2. Fetch using the exact same DATE() logic as the detail panel
  const rows = await prisma.$queryRaw`
    SELECT 
      cs."id" as snapshot_id,
      cs."compositeScore",
      cs."isComplete",
      g."id" as grid_cell_id,
      g."cellRow",
      g."cellCol",
      g."boundaryGeoJson"
    FROM "CompositeScoreSnapshot" cs
    INNER JOIN "GridCell" g ON g."id" = cs."gridCellId"
    INNER JOIN "ScoreWeightConfig" sw ON sw."id" = cs."scoreWeightConfigId"
    WHERE DATE(cs."period") = DATE(${dateString}::timestamp)
    AND sw."isActive" = true;
  `;

  const data = rows as any[];

  // 3. If no data found, try the fallback
  let substitutedPeriod = new Date(dateString);
  let periodSubstituted = false;

  if (data.length === 0) {
    const fallback = await prisma.$queryRaw`
      SELECT cs."period"
      FROM "CompositeScoreSnapshot" cs
      INNER JOIN "ScoreWeightConfig" sw ON sw."id" = cs."scoreWeightConfigId"
      WHERE DATE(cs."period") < DATE(${dateString}::timestamp)
      AND sw."isActive" = true
      ORDER BY cs."period" DESC
      LIMIT 1;
    `;
    const fallbackData = fallback as any[];

    if (fallbackData.length > 0) {
      substitutedPeriod = new Date(fallbackData[0].period);
      periodSubstituted = true;

      const fallbackRows = await prisma.$queryRaw`
        SELECT 
          cs."id" as snapshot_id,
          cs."compositeScore",
          cs."isComplete",
          g."id" as grid_cell_id,
          g."cellRow",
          g."cellCol",
          g."boundaryGeoJson"
        FROM "CompositeScoreSnapshot" cs
        INNER JOIN "GridCell" g ON g."id" = cs."gridCellId"
        INNER JOIN "ScoreWeightConfig" sw ON sw."id" = cs."scoreWeightConfigId"
        WHERE DATE(cs."period") = DATE(${substitutedPeriod.toISOString().split('T')[0]}::timestamp)
        AND sw."isActive" = true;
      `;

      const fallbackDataRows = fallbackRows as any[];

      return {
        period: substitutedPeriod.toISOString().split('T')[0],
        periodSubstituted,
        cells: fallbackDataRows.map((row) => ({
          gridCell: {
            id: row.grid_cell_id,
            cellRow: row.cellRow,
            cellCol: row.cellCol,
            boundaryGeoJson: row.boundaryGeoJson,
          },
          compositeScore: row.compositeScore,
          isComplete: row.isComplete,
        })),
      };
    }
  }

  // 4. Return the mapped data
  return {
    period: substitutedPeriod.toISOString().split('T')[0],
    periodSubstituted,
    cells: data.map((row) => ({
      gridCell: {
        id: row.grid_cell_id,
        cellRow: row.cellRow,
        cellCol: row.cellCol,
        boundaryGeoJson: row.boundaryGeoJson,
      },
      compositeScore: row.compositeScore,
      isComplete: row.isComplete,
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

  // 1. Determine the date string
  let dateString: string;
  if (period) {
    dateString = period;
  } else {
    const latest = await prisma.compositeScoreSnapshot.findFirst({
      where: { gridCellId: cellId, scoreWeightConfig: { isActive: true } },
      orderBy: { period: 'desc' },
      select: { period: true },
    });
    if (!latest) {
      throw new ApiError(HTTP_STATUS.NOT_FOUND, 'No data available for this cell');
    }
    dateString = latest.period.toISOString().split('T')[0];
  }

  // 2. Try exact date match first
  let rows = await prisma.$queryRaw`
    SELECT 
      cs."period",
      cs."compositeScore"
    FROM "CompositeScoreSnapshot" cs
    INNER JOIN "ScoreWeightConfig" sw ON sw."id" = cs."scoreWeightConfigId"
    WHERE cs."gridCellId" = ${cellId}
    AND DATE(cs."period") = DATE(${dateString}::timestamp)
    AND sw."isActive" = true
    LIMIT 1;
  `;

  let data = rows as any[];

  // 3. If no data found, use the same fallback logic as the map
  let substitutedPeriod = new Date(dateString);
  let periodSubstituted = false;

  if (data.length === 0) {
    const fallback = await prisma.$queryRaw`
      SELECT cs."period"
      FROM "CompositeScoreSnapshot" cs
      INNER JOIN "ScoreWeightConfig" sw ON sw."id" = cs."scoreWeightConfigId"
      WHERE cs."gridCellId" = ${cellId}
      AND DATE(cs."period") < DATE(${substitutedPeriod.toISOString().split('T')[0]}::timestamp)
      AND sw."isActive" = true
      ORDER BY cs."period" DESC
      LIMIT 1;
    `;
    const fallbackData = fallback as any[];

    if (fallbackData.length > 0) {
      substitutedPeriod = new Date(fallbackData[0].period);
      periodSubstituted = true;

      rows = await prisma.$queryRaw`
        SELECT 
          cs."period",
          cs."compositeScore"
        FROM "CompositeScoreSnapshot" cs
        INNER JOIN "ScoreWeightConfig" sw ON sw."id" = cs."scoreWeightConfigId"
        WHERE cs."gridCellId" = ${cellId}
        AND DATE(cs."period") = DATE(${substitutedPeriod.toISOString().split('T')[0]}::timestamp)
        AND sw."isActive" = true
        LIMIT 1;
      `;
      data = rows as any[];
    }
  }

  if (data.length === 0) {
    throw new ApiError(HTTP_STATUS.NOT_FOUND, 'No data available for this cell');
  }

  const currentSnapshot = data[0];

  // 4. Fetch previous period for trend
  const priorRows = await prisma.$queryRaw`
    SELECT 
      cs."period",
      cs."compositeScore"
    FROM "CompositeScoreSnapshot" cs
    INNER JOIN "ScoreWeightConfig" sw ON sw."id" = cs."scoreWeightConfigId"
    WHERE cs."gridCellId" = ${cellId}
    AND DATE(cs."period") < DATE(${dateString}::timestamp)
    AND sw."isActive" = true
    ORDER BY cs."period" DESC
    LIMIT 1;
  `;

  const priorData = priorRows as any[];
  let trend: 'up' | 'down' | 'flat' = 'flat';
  if (priorData.length > 0) {
    if (currentSnapshot.compositeScore > priorData[0].compositeScore) {
      trend = 'up';
    } else if (currentSnapshot.compositeScore < priorData[0].compositeScore) {
      trend = 'down';
    }
  }

  // 5. Fetch signals
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

  // 6. Fetch sparkline (last 6 periods up to selected date)
  const sparkRows = await prisma.$queryRaw`
    SELECT sub."period", sub."compositeScore"
    FROM (
      SELECT 
        cs."period",
        cs."compositeScore"
      FROM "CompositeScoreSnapshot" cs
      INNER JOIN "ScoreWeightConfig" sw ON sw."id" = cs."scoreWeightConfigId"
      WHERE cs."gridCellId" = ${cellId}
      AND DATE(cs."period") <= DATE(${dateString}::timestamp)
      AND sw."isActive" = true
      ORDER BY cs."period" DESC
      LIMIT 6
    ) sub
    ORDER BY sub."period" ASC;
  `;

  const sparkData = sparkRows as any[];
  const sparkline = sparkData.map((s) => ({
    period: s.period.toISOString().split('T')[0],
    compositeScore: s.compositeScore,
  }));

  const aiSummary = await generateCellSummary(
    signals.map((s) => ({
      source: s.dataSource.key as 'VIIRS' | 'GHSL' | 'RWI' | 'GDELT',
      rawValue: s.rawValue,
      normalizedValue: s.normalizedValue,
    })),
    currentSnapshot.compositeScore,
  );

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
  // 1. Determine the UTC date string
  let dateString: string;
  if (period) {
    dateString = period; // e.g., '2026-08-01'
  } else {
    const latest = await prisma.signalValue.findFirst({
      where: { dataSource: { key: sourceKey } },
      orderBy: { period: 'desc' },
      select: { period: true },
    });
    dateString = latest ? latest.period.toISOString().split('T')[0] : '2026-08-01';
  }

  // 2. Convert to a UTC Date object (NO timezone shifting)
  const targetPeriod = new Date(dateString + 'T00:00:00.000Z');

  let signalValues = await prisma.signalValue.findMany({
    where: {
      period: targetPeriod,
      dataSource: { key: sourceKey },
    },
    include: {
      gridCell: true,
    },
  });

  let substitutedPeriod = targetPeriod;
  let periodSubstituted = false;

  if (signalValues.length === 0) {
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

      signalValues = await prisma.signalValue.findMany({
        where: {
          period: substitutedPeriod,
          dataSource: { key: sourceKey },
        },
        include: {
          gridCell: true,
        },
      });
    }
  }

  return {
    sourceKey,
    period: substitutedPeriod.toISOString().split('T')[0],
    periodSubstituted,
    cells: signalValues.map((s) => ({
      gridCellId: s.gridCell.id,
      normalizedValue: s.normalizedValue,
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

export const getAvailablePeriods = async (): Promise<{
  earliest: string;
  latest: string;
  all: string[];
}> => {
  const rows = await prisma.$queryRaw`
    SELECT DISTINCT DATE(cs."period") as period
    FROM "CompositeScoreSnapshot" cs
    INNER JOIN "ScoreWeightConfig" sw ON sw."id" = cs."scoreWeightConfigId"
    WHERE sw."isActive" = true
    ORDER BY period ASC;
  `;

  const periods = (rows as any[]).map((row) => row.period.toISOString().split('T')[0]);

  if (periods.length === 0) {
    return { earliest: '', latest: '', all: [] };
  }

  return {
    earliest: periods[0],
    latest: periods[periods.length - 1],
    all: periods,
  };
};
