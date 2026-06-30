import { describe, expect, it } from 'vitest';
import { checkGPSFraud } from '@/lib/agents/agent4-fraud';

describe('Agent 4 fraud detection', () => {
  it('flags GPS fraud when resolution is 150m from original', () => {
    const result = checkGPSFraud({ lat: 11.0168, lng: 76.9558 }, { lat: 11.0183, lng: 76.9558 });
    expect(result.pass).toBe(false);
    expect(result.reason).toBe('gps_mismatch');
  });

  it('passes GPS check when resolution is 40m from original', () => {
    const result = checkGPSFraud({ lat: 11.0168, lng: 76.9558 }, { lat: 11.01644, lng: 76.9558 });
    expect(result.pass).toBe(true);
  });

  it('handles missing GPS coordinates gracefully', () => {
    const result = checkGPSFraud({ lat: 11.0168, lng: 76.9558 }, { lat: Number.NaN, lng: Number.NaN });
    expect(result.pass).toBe(false);
    expect(result.reason).toBe('gps_unavailable');
  });
});
