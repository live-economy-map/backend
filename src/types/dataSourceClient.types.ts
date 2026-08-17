export interface BoundingBox {
  minLat: number;
  minLng: number;
  maxLat: number;
  maxLng: number;
}

export interface PulledSignal {
  cellId: string;
  rawValue: number;
}

export interface DataSourceClient {
  pull(boundingBox: BoundingBox, period: string): Promise<PulledSignal[]>;
}

// Addis Ababa bounding box — placeholder, confirm exact extent during pipeline implementation.
export const ADDIS_ABABA_BOUNDING_BOX: BoundingBox = {
  minLat: 8.8,
  minLng: 38.6,
  maxLat: 9.1,
  maxLng: 38.95,
};
