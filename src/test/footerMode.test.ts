import { describe, it, expect } from 'vitest';
import { footerCamera, type FooterMode } from '@/lib/footerMode';
import { cityCamera } from '@/lib/city';

const alts: FooterMode[] = ['dive'];

describe('footerCamera', () => {
  it('current is the footer as it was', () => {
    for (const f of [0, 0.3, 0.6, 1]) expect(footerCamera('current', f)).toMatchObject(cityCamera(f));
  });

  it('every mode starts at the flight end pose, with nothing slid', () => {
    for (const m of alts) {
      const c = footerCamera(m, 0);
      expect(c.dy).toBeCloseTo(0);
      expect(c.dz).toBeCloseTo(0);
      expect(c.pitch).toBeCloseTo(0);
      expect(c.slide + c.ground).toBe(0);
    }
  });

  it('dive ends looking straight down, risen over the ground', () => {
    const c = footerCamera('dive', 1);
    expect(c.pitch).toBeCloseTo(-Math.PI / 2);
    expect(c.dy).toBeGreaterThan(0);
    expect(c.ground).toBe(1);
  });
});
