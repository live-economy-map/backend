// src/services/map.service.ts
import { prisma } from '../config/db.js';
import { generateText, generateStructuredOutput, generateChatReply } from '../utils/aiClient.js';
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
    cell.areaLabel,
    trend,
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
  areaLabel?: string | null,
  trend?: 'up' | 'down' | 'flat',
): Promise<string | null> => {
  try {
    const locationName = areaLabel ? `the ${areaLabel} area` : 'this selected sector';
    const trendText =
      trend === 'up'
        ? 'an upward growth trajectory'
        : trend === 'down'
          ? 'a cooling trend'
          : 'stable performance';

    const signalsDetail = signals
      .map((s) => `- ${s.source}: raw=${s.rawValue}, normalized=${s.normalizedValue}`)
      .join('\n');

    const prompt = `You are a trusted local market analyst and commercial real estate strategist.
Provide a humanized, market-focused 2-sentence economic review for ${locationName}.

Composite Score: ${compositeScore} (${trendText})
Observed Signals & Telemetry:
${signalsDetail}

Market Guidelines:
1. Speak like an experienced local business advisor giving advice to an entrepreneur or investor.
2. Focus purely on the REAL-WORLD MARKET: customer base, foot traffic intensity, consumer purchasing power, evening vs daytime commerce, and commercial viability.
3. NEVER cite raw decimal numbers, sensor acronyms (like VIIRS, GHSL, RWI, GDELT), or technical formula codes in your output.
4. Keep the entire response engaging, natural, and strictly under 45 words across 2 punchy sentences.`;

    const summary = await generateText(prompt);
    return summary ? summary.trim() : null;
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

export const chatWithCell = async (
  cellId: string,
  message: string,
  history?: Array<{ role: 'user' | 'assistant'; content: string }>,
) => {
  // 1. Fetch cell detail and grounded signals
  const cellDetail = await getCellDetail(cellId);

  const viirs = cellDetail.signals.find((s) => s.source === 'VIIRS');
  const ghsl = cellDetail.signals.find((s) => s.source === 'GHSL');
  const rwi = cellDetail.signals.find((s) => s.source === 'RWI');
  const gdelt = cellDetail.signals.find((s) => s.source === 'GDELT');

  const locationName = cellDetail.areaLabel
    ? `"${cellDetail.areaLabel}"`
    : `Sector ${cellId.slice(0, 8)}`;
  const sparklineSummary = cellDetail.sparkline
    .map((s) => `${s.period}: ${s.compositeScore}`)
    .join(', ');

  // 2. Build system prompt grounded in empirical spatial telemetry and market intelligence
  const systemPrompt = `You are a trusted local commercial market analyst and business intelligence advisor for Live Economy Map.
You are helping an entrepreneur, investor, or resident evaluate the real-world market and commercial potential of ${locationName}.

GROUND TRUTH DATA & MARKET CHARACTERISTICS:
- Location: ${locationName}
- Overall Market Vitality Score: ${cellDetail.compositeScore} / 100 (${cellDetail.trend === 'up' ? 'growing momentum with rising commercial demand' : cellDetail.trend === 'down' ? 'cooling down / price-sensitive consolidation' : 'steady, mature commercial equilibrium'})
- Historical Trajectory (past 6 months): ${sparklineSummary}

UNDERLYING MARKET FORCES:
1. Nighttime Activity & Evening Economy (VIIRS: ${viirs?.normalizedValue ?? 0}, Raw: ${viirs?.rawValue ?? 0}):
   - Market Meaning: ${Number(viirs?.normalizedValue ?? 0) > 0.6 ? 'Vibrant nightlife, late dining, evening retail, and high post-work foot traffic.' : Number(viirs?.normalizedValue ?? 0) > 0.3 ? 'Moderate evening trade; quiet residential environment after 9 PM.' : 'Daytime-only foot traffic; minimal evening commercial activity.'}
2. Customer Density & Built Environment (GHSL: ${ghsl?.normalizedValue ?? 0}, Raw: ${ghsl?.rawValue ?? 0}):
   - Market Meaning: ${Number(ghsl?.normalizedValue ?? 0) > 0.6 ? 'Dense urban fabric with heavy pedestrian volume and high street-front visibility.' : Number(ghsl?.normalizedValue ?? 0) > 0.3 ? 'Developing corridor with moderate residential density and growing storefronts.' : 'Sparse outer fringe or industrial zone with limited casual foot traffic.'}
3. Consumer Purchasing Power & Demographics (RWI: ${rwi?.normalizedValue ?? 0}, Raw: ${rwi?.rawValue ?? 0}):
   - Market Meaning: ${Number(rwi?.normalizedValue ?? 0) > 0.6 ? 'Affluent consumer base with high disposable income, responsive to specialty services and premium retail.' : Number(rwi?.normalizedValue ?? 0) > 0.3 ? 'Middle-income market focused on convenience, everyday essentials, and value.' : 'Budget-conscious, high-volume consumer market looking for affordable essential goods.'}
4. Local News & Development Buzz (GDELT: ${gdelt?.normalizedValue ?? 0}, Raw: ${gdelt?.rawValue ?? 0}):
   - Market Meaning: ${Number(gdelt?.normalizedValue ?? 0) > 0.6 ? 'High media visibility, major infrastructure or commercial development projects underway.' : 'Normal baseline community coverage.'}

CRITICAL RULES FOR HUMANIZED MARKET ADVICE:
1. NEVER cite raw scores, decimal numbers, or sensor acronyms (e.g. do NOT say "VIIRS is 0.82" or "GHSL 0.57"). Talk in 100% human market language!
2. Explain the REAL-WORLD MARKET: who the customers are, pedestrian foot traffic patterns, willingness to spend, competitive fit (e.g., cafes, retail, pharmacies, grocery, delivery, logistics), and optimal operating hours.
3. Be candid, practical, and balanced: highlight both market opportunities and commercial risks or bottlenecks (e.g. rent pressure vs margin, budget vs luxury).
4. Keep answers conversational, engaging, and concise (2 to 4 sentences or under 100 words unless the user asks for a comprehensive detailed breakdown).`;

  const chatMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemPrompt },
  ];

  if (history && Array.isArray(history)) {
    for (const msg of history.slice(-10)) {
      if (msg.role === 'user' || msg.role === 'assistant') {
        chatMessages.push({ role: msg.role, content: msg.content });
      }
    }
  }

  chatMessages.push({ role: 'user', content: message });

  const reply = await generateChatReply(chatMessages);

  return {
    reply: reply.trim(),
    cellId,
    areaLabel: cellDetail.areaLabel,
    compositeScore: cellDetail.compositeScore,
    trend: cellDetail.trend,
  };
};
