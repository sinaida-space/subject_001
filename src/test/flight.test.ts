import { describe, expect, it } from 'vitest';
import { FLIGHT, flightPose } from '@/lib/flight';

describe('flightPose', () => {
  it('starts at home and ends at the footer, facing straight ahead', () => {
    const a = flightPose(0), b = flightPose(1);
    expect(a.x).toBeCloseTo(0, 3);
    expect(a.y).toBeCloseTo(0, 3);
    expect(a.z).toBeCloseTo(FLIGHT.home, 3);
    expect(b.x).toBeCloseTo(-FLIGHT.x, 3);
    expect(b.y).toBeCloseTo(-FLIGHT.y, 3);
    expect(b.z).toBeCloseTo(FLIGHT.home - FLIGHT.z, 3);
    for (const q of [a, b]) {
      expect(Math.abs(q.yaw)).toBeLessThan(0.03);
      expect(Math.abs(q.pitch)).toBeLessThan(0.03);
    }
  });

  it('always moves forward, keeps the head within its limits, and bends', () => {
    let lastZ = Infinity, maxYaw = 0;
    for (let i = 0; i <= 1000; i++) {
      const q = flightPose(i / 1000);
      expect(q.z).toBeLessThanOrEqual(lastZ + 1e-9);
      lastZ = q.z;
      expect(Math.abs(q.yaw)).toBeLessThanOrEqual(0.3);
      expect(Math.abs(q.pitch)).toBeLessThanOrEqual(0.12);
      expect(Math.abs(q.bank)).toBeLessThanOrEqual(0.12);
      maxYaw = Math.max(maxYaw, Math.abs(q.yaw));
    }
    expect(maxYaw).toBeGreaterThan(0.1);
  });
});
