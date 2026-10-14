// Shared ASCII scramble used by the hero headline and the About bio-signal
// lock. Same character set in both places so the two reads as one system.

const SCRAMBLE_CHARS = '░▒▓█/\\_';

/**
 * Display-scale noise. The filled blocks that read as fine texture at 14px
 * become solid slabs at 7rem, so headline-size scramble uses strokes and
 * light shade only.
 */
export const SCRAMBLE_CHARS_LIGHT = '/\\_-|:.·░';

/**
 * Replaces a random `amount` (0..1) of the glyphs in `text` with block/slash
 * noise. Spaces and light punctuation are preserved so the word rhythm and
 * line length stay stable while the text resolves.
 */
export function scrambleText(text: string, amount: number, chars = SCRAMBLE_CHARS): string {
  return text
    .split('')
    .map((char) => {
      if (char === ' ' || char === '.' || char === ',' || char === '|') return char;
      return Math.random() < amount
        ? chars[Math.floor(Math.random() * chars.length)]
        : char;
    })
    .join('');
}
