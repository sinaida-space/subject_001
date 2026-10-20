// The starway: one star per night for the last ninety nights, lit by how many
// times assistants called the MCP server that night. The numbers come from
// GET /starway.json (agent-gateway), which reads Cloudflare's own daily count
// for the sinaida-mcp Worker; reading the page never counts as a call.

export type Night = { date: string; brightness: number; tonight?: boolean };

// The night the sky began counting (the sinaida-mcp Worker's first day),
// kept forever, also after it leaves the window. The sky starts there: no
// night before it is shown.
export const FIRST_LIGHT = 'October 19, 2026';
export const BEGAN = '2026-10-19';

/** How many nights the sky holds today: from BEGAN, up to NIGHTS. */
export function nightsSinceBegan(today: number) {
  return Math.max(1, Math.min(NIGHTS, Math.floor((today - Date.parse(BEGAN)) / 864e5) + 1));
}

export const NIGHTS = 90;

// a fixed seed per night, so the sky keeps its shape from visit to visit
export function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return ((h >>> 0) % 100000) / 100000;
}

const isoDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

// Preview only: a believable sky for `npm run dev`, never shipped as data.
// ?starway=empty in the dev URL shows the quiet sky instead.
function mockNights(): Night[] {
  const quiet = new URLSearchParams(location.search).get('starway') === 'empty';
  const today = Math.floor(Date.now() / 864e5) * 864e5;
  const n = quiet ? nightsSinceBegan(today) : NIGHTS;
  return Array.from({ length: n }, (_, i) => {
    const date = isoDay(today - (n - 1 - i) * 864e5);
    const r = hash(date);
    const light = quiet || r < 0.3 ? 0 : Math.min(1, 0.15 + r * r + i / 300);
    const glow = 1 - 0.65 * ((NIGHTS - 1 - i) / (NIGHTS - 1));
    return { date, brightness: Math.round(light * glow * 1000) / 1000, ...(i === n - 1 && { tonight: true }) };
  });
}

/** The nights, oldest first; an empty list when the sky cannot be read. */
export async function loadNights(): Promise<Night[]> {
  if (import.meta.env.DEV) return mockNights();
  try {
    const res = await fetch('/starway.json');
    if (!res.ok) return [];
    const { stars } = (await res.json()) as { stars?: Night[] };
    return Array.isArray(stars) ? stars.filter((s) => typeof s?.date === 'string' && s.date >= BEGAN && Number.isFinite(s?.brightness)) : [];
  } catch {
    return [];
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const formatNight = (date: string) => `${Number(date.slice(8, 10))} ${MONTHS[Number(date.slice(5, 7)) - 1]}`;

export const PLAYLIST_URL = 'https://open.spotify.com/playlist/0lSQde0K100Z50yUBJPx26';

// Je suis le spectre d'une rose que tu portais hier au bal.
