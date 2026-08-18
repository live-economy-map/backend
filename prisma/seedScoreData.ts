// prisma/seedScoreData.ts
import { prisma } from '../src/config/db.js';

type SourceKey = 'VIIRS' | 'GHSL' | 'RWI';

const WEIGHTS: Record<SourceKey, number> = { VIIRS: 0.34, GHSL: 0.33, RWI: 0.33 };

function getLastNMonths(n: number): Date[] {
  const now = new Date();
  const months: Date[] = [];
  for (let i = n - 1; i >= 0; i--) {
    months.push(new Date(Date.UTC(now.getFullYear(), now.getMonth() - i, 1)));
  }
  return months;
}

async function main() {
  const admin = await prisma.admin.findUnique({ where: { email: 'test@example.com' } });
  if (!admin) throw new Error('No admin found — run `npm run prisma:seed` first.');

  const sources = await prisma.dataSource.findMany({
    where: { key: { in: ['VIIRS', 'GHSL', 'RWI'] } },
  });
  const sourceIdByKey = {} as Record<SourceKey, string>;
  for (const s of sources) {
    sourceIdByKey[s.key as SourceKey] = s.id;
  }

  const config = await prisma.scoreWeightConfig.create({
    data: {
      createdById: admin.id,
      isActive: true,
      sourceWeights: {
        create: (['VIIRS', 'GHSL', 'RWI'] as SourceKey[]).map((key) => ({
          dataSourceId: sourceIdByKey[key],
          weight: WEIGHTS[key],
        })),
      },
    },
  });
  console.log('ScoreWeightConfig created:', config.id);

  const gridCells = await prisma.gridCell.findMany({ select: { id: true } });
  console.log(`Seeding scores for ${gridCells.length} grid cells...`);

  const periods = getLastNMonths(6);

  for (const period of periods) {
    const signalRows: {
      gridCellId: string;
      dataSourceId: string;
      period: Date;
      rawValue: number;
      normalizedValue: number;
    }[] = [];
    const snapshotRows: {
      gridCellId: string;
      period: Date;
      scoreWeightConfigId: string;
      compositeScore: number;
      isComplete: boolean;
    }[] = [];

    for (const cell of gridCells) {
      const nViirs = Math.random();
      const nGhsl = Math.random();
      const nRwi = Math.random();

      signalRows.push({
        gridCellId: cell.id,
        dataSourceId: sourceIdByKey.VIIRS,
        period,
        rawValue: Number((nViirs * 100).toFixed(2)),
        normalizedValue: Number(nViirs.toFixed(4)),
      });
      signalRows.push({
        gridCellId: cell.id,
        dataSourceId: sourceIdByKey.GHSL,
        period,
        rawValue: Number((nGhsl * 100).toFixed(2)),
        normalizedValue: Number(nGhsl.toFixed(4)),
      });
      signalRows.push({
        gridCellId: cell.id,
        dataSourceId: sourceIdByKey.RWI,
        period,
        rawValue: Number((nRwi * 100).toFixed(2)),
        normalizedValue: Number(nRwi.toFixed(4)),
      });

      const compositeScore = Number(
        (nViirs * WEIGHTS.VIIRS + nGhsl * WEIGHTS.GHSL + nRwi * WEIGHTS.RWI).toFixed(4),
      );

      snapshotRows.push({
        gridCellId: cell.id,
        period,
        scoreWeightConfigId: config.id,
        compositeScore,
        isComplete: Math.random() > 0.05,
      });
    }

    await prisma.signalValue.createMany({ data: signalRows, skipDuplicates: true });
    await prisma.compositeScoreSnapshot.createMany({ data: snapshotRows, skipDuplicates: true });
    console.log(`Seeded period ${period.toISOString().split('T')[0]}`);
  }

  console.log('Done.');
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
