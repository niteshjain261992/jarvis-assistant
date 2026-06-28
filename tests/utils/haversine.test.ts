import { haversineDistanceMeters } from '@/utils/haversine.js';

describe('haversineDistanceMeters', () => {
  it('returns zero for identical coordinates', () => {
    expect(haversineDistanceMeters(28.4595, 77.0266, 28.4595, 77.0266)).toBe(0);
  });

  it('returns approximately one kilometer for a known pair at the equator', () => {
    const distance = haversineDistanceMeters(0, 0, 0, 0.009);

    expect(distance).toBeGreaterThan(990);
    expect(distance).toBeLessThan(1010);
  });
});
