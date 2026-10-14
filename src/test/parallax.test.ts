import { describe, it, expect } from 'vitest';
import {
  depthParallaxFactor,
  parallaxScreens,
  PARALLAX_NEAR,
  PARALLAX_FAR,
  PARALLAX_MAX_SCREENS,
} from '@/lib/parallax';

describe('depthParallaxFactor', () => {
  it('moves near stars further than far stars', () => {
    expect(depthParallaxFactor(4)).toBeGreaterThan(depthParallaxFactor(0));
    expect(depthParallaxFactor(0)).toBeGreaterThan(depthParallaxFactor(-4));
  });

  it('stays inside the near/far bounds across and beyond the z range', () => {
    for (const z of [-99, -4, -1, 0, 1, 4, 99]) {
      const f = depthParallaxFactor(z);
      expect(f).toBeGreaterThanOrEqual(PARALLAX_FAR);
      expect(f).toBeLessThanOrEqual(PARALLAX_NEAR);
    }
  });

  it('gives the near layer several times the travel of the far layer', () => {
    expect(depthParallaxFactor(4) / depthParallaxFactor(-4)).toBeGreaterThan(5);
  });
});

describe('parallaxScreens', () => {
  it('is zero at the top of the page, so nothing drifts at rest', () => {
    expect(parallaxScreens(0, 800)).toBe(0);
  });

  it('counts one unit per viewport height', () => {
    expect(parallaxScreens(800, 800)).toBeCloseTo(1);
    expect(parallaxScreens(400, 800)).toBeCloseTo(0.5);
  });

  it('caps on long pages and never goes negative on overscroll', () => {
    expect(parallaxScreens(100000, 800)).toBe(PARALLAX_MAX_SCREENS);
    expect(parallaxScreens(-300, 800)).toBe(0);
  });

  it('survives a zero-height viewport without dividing by zero', () => {
    expect(Number.isFinite(parallaxScreens(500, 0))).toBe(true);
  });
});
