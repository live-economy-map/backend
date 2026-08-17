// @google/earthengine ships no TypeScript types (see package.json — plain JS
// build/main.js). This declares just the surface earthEngine.util.ts,
// viirs.client.ts, and ghsl.client.ts actually use; expand as needed if
// more of the SDK gets used elsewhere. Confirm call shapes against the
// installed SDK version during integration testing against real credentials.
declare module '@google/earthengine' {
  namespace ee {
    interface Image {
      reduceRegion(params: {
        reducer: unknown;
        geometry: unknown;
        scale: number;
        maxPixels?: number;
      }): {
        evaluate(
          callback: (result: Record<string, number | null> | null, error?: string) => void,
        ): void;
      };
    }

    interface ImageCollection {
      filterDate(start: unknown, end: unknown): ImageCollection;
      select(band: string): ImageCollection;
      mean(): Image;
      mosaic(): Image;
      filter(f: unknown): ImageCollection;
    }
  }

  const ee: {
    data: {
      authenticateViaPrivateKey(
        privateKey: object,
        onSuccess: () => void,
        onError: (err: unknown) => void,
      ): void;
    };
    initialize(
      opt_baseurl: string | null,
      opt_tileurl: string | null,
      onSuccess: () => void,
      onError: (err: unknown) => void,
      opt_xsrfToken?: string | null,
      opt_project?: string,
    ): void;
    Date(value: string): unknown & { advance(delta: number, unit: string): unknown };
    Geometry: {
      (geoJson: unknown): unknown;
      Rectangle(coords: [number, number, number, number]): unknown;
    };
    ImageCollection(id: string): ee.ImageCollection;
    Reducer: { mean(): unknown };
    Filter: { eq(name: string, value: unknown): unknown };
  };

  export = ee;
}
