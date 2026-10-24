import { describe, it, expect } from 'vitest';
import {
  DEFAULT_BOUNDING_BOX,
  primaryRegionConfig,
  isPointWithinBounds,
} from '../../src/config/spatial.config.js';

describe('spatial.config', () => {
  it('provides default parameterized bounding box coordinates', () => {
    expect(DEFAULT_BOUNDING_BOX.minLat).toBe(8.8);
    expect(DEFAULT_BOUNDING_BOX.maxLat).toBe(9.1);
    expect(DEFAULT_BOUNDING_BOX.minLng).toBe(38.6);
    expect(DEFAULT_BOUNDING_BOX.maxLng).toBe(38.95);
  });

  it('computes center coordinates correctly', () => {
    expect(primaryRegionConfig.center.lat).toBeCloseTo(8.95, 2);
    expect(primaryRegionConfig.center.lng).toBeCloseTo(38.775, 2);
  });

  it('checks coordinate containment within bounds correctly', () => {
    // Inside
    expect(isPointWithinBounds(8.95, 38.75)).toBe(true);
    // Outside latitude
    expect(isPointWithinBounds(7.0, 38.75)).toBe(false);
    expect(isPointWithinBounds(10.5, 38.75)).toBe(false);
    // Outside longitude
    expect(isPointWithinBounds(8.95, 35.0)).toBe(false);
    expect(isPointWithinBounds(8.95, 42.0)).toBe(false);
  });
});
