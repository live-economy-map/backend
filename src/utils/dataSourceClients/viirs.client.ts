export interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

export interface PulledCellValue {
  cellId: string;
  rawValue: number;
}

export const pull = async (
  boundingBox: BoundingBox,
  period: string,
): Promise<PulledCellValue[]> => {
  throw new Error('not implemented');
};
