import { prisma } from '../src/config/db.js';
import { startPipelineRun } from '../src/services/adminPipeline.service.js';

async function main(): Promise<void> {
  const admin = await prisma.admin.findFirst();
  if (!admin) throw new Error('No Admin found — did the base seed run?');

  const sourceKey = (process.argv[2] ?? 'RWI') as 'VIIRS' | 'GHSL' | 'RWI' | 'GDELT';
  console.log(`Starting pipeline run for ${sourceKey} via startPipelineRun()...`);

  const { pipelineRunId } = await startPipelineRun(sourceKey, admin.id);
  console.log(`Pipeline run created: ${pipelineRunId}. Polling for completion...`);

  // dispatchPull is fire-and-forget internally, so poll until it's done.
  let run;
  do {
    await new Promise((r) => setTimeout(r, 2000));
    run = await prisma.pipelineRun.findUniqueOrThrow({ where: { id: pipelineRunId } });
    process.stdout.write('.');
  } while (run.status === 'RUNNING');

  console.log(`\nFinal status: ${run.status}`);
  console.log(`Records processed: ${run.recordsProcessed}`);
  if (run.errorMessage) console.log(`Error: ${run.errorMessage}`);

  const signalCount = await prisma.signalValue.count({
    where: { dataSource: { key: sourceKey } },
  });
  console.log(`SignalValue rows now in DB for ${sourceKey}: ${signalCount}`);
}

main()
  .catch((error) => {
    console.error('Pipeline verification failed:', error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
