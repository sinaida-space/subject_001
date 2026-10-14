import { describe, it, expect } from 'vitest';
import { CITY, smoother, span, cityCamera, cityOrigin, endEyeY, DOLLY_Z, GROUND_DROP } from '@/lib/city';

describe('smoother', () => {
  it('runs 0 to 1 with fixed ends and a midpoint of one half', () => {
    expect(smoother(0)).toBe(0);
    expect(smoother(1)).toBe(1);
    expect(smoother(0.5)).toBeCloseTo(0.5);
  });

  it('never decreases', () => {
    let prev = -1;
    for (let t = 0; t <= 1; t += 0.01) {
      const v = smoother(t);
      expect(v).toBeGreaterThanOrEqual(prev);
      prev = v;
    }
  });
});

describe('span', () => {
  it('clamps outside the window and is linear inside it', () => {
    expect(span(0, [0.2, 0.6])).toBe(0);
    expect(span(1, [0.2, 0.6])).toBe(1);
    expect(span(0.4, [0.2, 0.6])).toBeCloseTo(0.5);
  });
});

describe('CITY timing', () => {
  const windows = [CITY.dolly, CITY.recede, CITY.tilt, CITY.fall, CITY.ground, ...CITY.text];

  it('keeps every window inside 0..1 and in order', () => {
    for (const [a, b] of windows) {
      expect(a).toBeGreaterThanOrEqual(0);
      expect(b).toBeLessThanOrEqual(1);
      expect(a).toBeLessThan(b);
    }
  });

  it('resolves the footer text only after the camera has landed, in reading order', () => {
    const starts = CITY.text.map(([a]) => a);
    expect(starts[0]).toBeGreaterThanOrEqual(CITY.land);
    expect([...starts].sort((x, y) => x - y)).toEqual(starts);
  });
});

describe('cityCamera', () => {
  it('starts at the flight end pose', () => {
    const c = cityCamera(0);
    expect(c.dy).toBeCloseTo(0);
    expect(c.dz).toBe(0);
    expect(c.pitch).toBeCloseTo(0);
    expect(c.fall).toBe(0);
    expect(c.fov).toBe(60);
  });

  it('ends backed away, sunk, tilted down and with a narrower lens', () => {
    const c = cityCamera(1);
    expect(c.dz).toBeCloseTo(DOLLY_Z);
    expect(c.dy).toBeLessThan(0);
    expect(c.pitch).toBeLessThan(0);
    expect(c.fall).toBe(1);
    expect(c.fov).toBeLessThan(60);
  });

  it('is a pure function of f, so scrolling back replays the same frame', () => {
    expect(cityCamera(0.37)).toEqual(cityCamera(0.37));
  });
});

describe('cityOrigin', () => {
  it('lies under the flight end on the home page', () => {
    const o = cityOrigin(true, { x: 1, y: 2, z: 3 });
    expect(o).toEqual({ x: 1, z: 3 + DOLLY_Z, groundY: endEyeY(2) - GROUND_DROP });
  });

  it('lies under the camera home on other pages', () => {
    const o = cityOrigin(false, { x: 1, y: 2, z: 3 });
    expect(o.x).toBe(0);
    expect(o.z).toBe(7 + DOLLY_Z);
  });
});
