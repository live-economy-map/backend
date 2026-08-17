import { pull } from '../src/utils/dataSourceClients/rwi.client.js';
import { ADDIS_ABABA_BOUNDING_BOX } from '../src/types/dataSourceClient.types.js';

async function main(): Promise<void> {
  console.log('Calling RWI pull() against real dataset + DB...');
  const start = Date.now();

  const result = await pull(ADDIS_ABABA_BOUNDING_BOX, '2023-01-01');

  console.log(`Done in ${Date.now() - start}ms`);
  console.log(`Got ${result.length} cell values (out of 238 grid cells)`);
  console.log('Sample:', result.slice(0, 5));
}

main().catch((error) => {
  console.error('RWI verification failed:', error);
  process.exit(1);
});
