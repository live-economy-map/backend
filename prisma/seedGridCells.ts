import { prisma } from '../src/config/db.js';
import { ADDIS_ABABA_BOUNDING_BOX } from '../src/types/dataSourceClient.types.js';

// Matches RWI's ~2.4km native resolution (see GridCell model comment in schema.prisma).
const CELL_SIZE_KM = 2.4;
const KM_PER_DEGREE_LAT = 111.32;

async function main(): Promise<void> {
  const { minLat, maxLat, minLng, maxLng } = ADDIS_ABABA_BOUNDING_BOX;

  // Longitude degree length shrinks with latitude — correct using the
  // bounding box's mid-latitude so cells are roughly square in real terms.
  const refLatRad = ((minLat + maxLat) / 2) * (Math.PI / 180);
  const latStep = CELL_SIZE_KM / KM_PER_DEGREE_LAT;
  const lngStep = CELL_SIZE_KM / (KM_PER_DEGREE_LAT * Math.cos(refLatRad));

  const rows = Math.ceil((maxLat - minLat) / latStep);
  const cols = Math.ceil((maxLng - minLng) / lngStep);

  let count = 0;

  for (let r = 0; r < rows; r++) {
    const cellMinLat = minLat + r * latStep;
    const cellMaxLat = Math.min(cellMinLat + latStep, maxLat);

    for (let c = 0; c < cols; c++) {
      const cellMinLng = minLng + c * lngStep;
      const cellMaxLng = Math.min(cellMinLng + lngStep, maxLng);

      const centroidLat = (cellMinLat + cellMaxLat) / 2;
      const centroidLng = (cellMinLng + cellMaxLng) / 2;

      const boundaryGeoJson = {
        type: 'Polygon',
        coordinates: [
          [
            [cellMinLng, cellMinLat],
            [cellMaxLng, cellMinLat],
            [cellMaxLng, cellMaxLat],
            [cellMinLng, cellMaxLat],
            [cellMinLng, cellMinLat],
          ],
        ],
      };

      await prisma.gridCell.upsert({
        where: { cellRow_cellCol: { cellRow: r, cellCol: c } },
        update: { centroidLat, centroidLng, boundaryGeoJson },
        create: { cellRow: r, cellCol: c, centroidLat, centroidLng, boundaryGeoJson },
      });
      count++;
    }
  }

  console.log(`Grid seeded: ${rows} rows x ${cols} cols = ${count} cells`);
}

main()
  .catch((error) => {
    console.error('Grid seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
