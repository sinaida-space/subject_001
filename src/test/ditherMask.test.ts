import { describe, it, expect, beforeAll, vi } from 'vitest';
import { ditherMask } from '@/lib/ditherMask';

beforeAll(() => {
  // jsdom has no canvas; a stub context is enough to build the tiles.
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue({
    clearRect: () => {},
    fillRect: () => {},
    fillStyle: '',
  } as unknown as CanvasRenderingContext2D);
  vi.spyOn(HTMLCanvasElement.prototype, 'toDataURL').mockReturnValue('data:image/png;base64,x');
});

describe('ditherMask', () => {
  it('marks a piece at level 0 as unformed', () => {
    const el = document.createElement('div');
    ditherMask(el, 0);
    expect(el.hasAttribute('data-unformed')).toBe(true);
  });

  it('wears a mask and the forming class at a middle level', () => {
    const el = document.createElement('div');
    ditherMask(el, 8);
    expect(el.hasAttribute('data-unformed')).toBe(false);
    expect(el.classList.contains('dither-forming')).toBe(true);
    expect(el.style.maskImage).toContain('url(');
    expect(el.style.maskRepeat).toBe('repeat');
  });

  it('drops the mask and the class at level 16', () => {
    const el = document.createElement('div');
    ditherMask(el, 8);
    ditherMask(el, 16);
    expect(el.style.maskImage).toBe('');
    expect(el.classList.contains('dither-forming')).toBe(false);
    expect(el.hasAttribute('data-unformed')).toBe(false);
  });
});
