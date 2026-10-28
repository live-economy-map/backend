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

export const DEFAULT_BOUNDING_BOX: BoundingBox = {
  minLat: 8.8,
  minLng: 38.6,
  maxLat: 9.1,
  maxLng: 38.95,
};

// Backward-compatible alias for existing tests
export const ADDIS_ABABA_BOUNDING_BOX: BoundingBox = DEFAULT_BOUNDING_BOX;
