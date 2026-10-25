// ── How many stars ──
// The sky and the city's lights read as crowded. Two thinner skies to judge
// side by side on a real screen: ?stars=half (sky at half, city at 60%) and
// ?stars=third (sky at a third, city at 40%, now the default) and
// ?stars=quarter. The words' own stars and the bright ones are kept.
// ?stars=full goes back. The pick holds for the tab, so moving between pages
// keeps it.

type Density = { sky: number; city: number };
const LEVELS: Record<string, Density> = {
  full: { sky: 1, city: 1 },
  half: { sky: 0.5, city: 0.6 },
  third: { sky: 1 / 3, city: 0.4 },
  quarter: { sky: 0.25, city: 0.35 },
};
// a quarter by default
const DEFAULT = 'quarter';
const KEY = 'sinaida:stars';

function read(): Density {
  if (typeof window === 'undefined') return LEVELS[DEFAULT];
  const asked = new URLSearchParams(window.location.search).get('stars');
  try {
    if (asked && LEVELS[asked]) sessionStorage.setItem(KEY, asked);
    const kept = sessionStorage.getItem(KEY);
    if (kept && LEVELS[kept]) return LEVELS[kept];
  } catch {
    if (asked && LEVELS[asked]) return LEVELS[asked];
  }
  return LEVELS[DEFAULT];
}

export const STAR_DENSITY = read();

// Je suis le spectre d'une rose que tu portais hier au bal. — Théophile Gautier
