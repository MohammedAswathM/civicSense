import { describe, expect, it } from 'vitest';
import { haversineDistance } from '@/lib/geo/haversine';

describe('haversineDistance', () => {
  it('returns 0 for identical coordinates', () => {
    expect(haversineDistance({ lat: 11.01, lng: 76.95 }, { lat: 11.01, lng: 76.95 })).toBe(0);
  });

  it('returns ~111km for 1 degree latitude difference', () => {
    const dist = haversineDistance({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(dist).toBeCloseTo(111, 0);
  });

  it('correctly identifies 60m separation', () => {
    const dist = haversineDistance({ lat: 11.0168, lng: 76.9558 }, { lat: 11.01625, lng: 76.9558 });
    expect(dist * 1000).toBeGreaterThan(50);
    expect(dist * 1000).toBeLessThan(70);
  });
});
