import { prisma } from './src/config/db.js';

async function main() {
  const snapshots = await prisma.compositeScoreSnapshot.count();
  const activeConfigs = await prisma.scoreWeightConfig.count({ where: { isActive: true } });
  const gridCells = await prisma.gridCell.count();
  console.log({ gridCells, snapshots, activeConfigs });
  process.exit(0);
}

main();
