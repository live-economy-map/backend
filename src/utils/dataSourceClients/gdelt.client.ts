import type { BoundingBox, PulledCellValue } from './viirs.client.js';

export const pull = async (
  boundingBox: BoundingBox,
  period: string,
): Promise<PulledCellValue[]> => {
  throw new Error('not implemented');
};
