import { pull } from '../src/utils/dataSourceClients/gdelt.client.js';
import { ADDIS_ABABA_BOUNDING_BOX } from '../src/types/dataSourceClient.types.js';

async function main(): Promise<void> {
  // GDELT GEO only covers a rolling ~7-day window — use the current month
  // (which overlaps "now") rather than a historical date, or pull() will
  // correctly short-circuit to [] before ever hitting the network.
  const period = new Date().toISOString().slice(0, 8) + '01';

  console.log(`Calling GDELT pull() for period=${period} (today's rolling window)...`);
  const start = Date.now();

  const result = await pull(ADDIS_ABABA_BOUNDING_BOX, period);

  console.log(`Done in ${Date.now() - start}ms`);
  console.log(`Got ${result.length} cell values with matching events`);
  console.log('Sample:', result.slice(0, 5));
}

main().catch((error) => {
  console.error('GDELT verification failed:', error);
  process.exit(1);
});
