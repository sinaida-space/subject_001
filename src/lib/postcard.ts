import { hash, type Night } from '@/lib/starway';

// A postcard of the sky, drawn on the visitor's own device from the same
// public nights the page shows, and saved straight to it: nothing is sent,
// nothing is stored, nothing about the visitor is on it.

const W = 1200, H = 630;
const INK = '246, 239, 230';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const longDate = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}, ${d.slice(0, 4)}`;

export const SKY_URL = 'https://sinaida.eu/machines';

function draw(nights: Night[]) {
  const c = document.createElement('canvas');
  c.width = W;
  c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#050505';
  g.fillRect(0, 0, W, H);

  // dust
  for (let i = 0; i < 420; i++) {
    g.fillStyle = `rgba(${INK}, ${(0.06 + hash('f' + i) * 0.22).toFixed(2)})`;
    g.fillRect(hash('d' + i) * W, hash('e' + i) * H, 1.5, 1.5);
  }

  // the nights, laid out as in the MCP App view
  const n = nights.length;
  nights.forEach((s, i) => {
    const b = Math.max(0, Math.min(1, s.brightness));
    const x = 60 + (n > 1 ? i / (n - 1) : 0.5) * (W - 120);
    const y = 300 + Math.sin(i * 0.21) * 110 + (hash(s.date) - 0.5) * 220;
    if (b > 0) {
      const r = 8 + b * 34;
      const glow = g.createRadialGradient(x, y, 0, x, y, r);
      glow.addColorStop(0, `rgba(${INK}, ${(0.35 + b * 0.55).toFixed(2)})`);
      glow.addColorStop(1, `rgba(${INK}, 0)`);
      g.fillStyle = glow;
      g.fillRect(x - r, y - r, r * 2, r * 2);
    }
    g.fillStyle = `rgba(${INK}, ${(0.25 + b * 0.75).toFixed(2)})`;
    g.beginPath();
    g.arc(x, y, 1.5 + b * 4, 0, Math.PI * 2);
    g.fill();
  });

  // the frame of the design system: one red rule, Geist Pixel
  g.fillStyle = '#cd0000';
  g.fillRect(0, 0, W, 3);
  g.font = '28px "Geist Pixel", monospace';
  g.textBaseline = 'top';
  g.fillStyle = '#ff3b3b';
  g.fillText('STARWAY', 60, 48);
  g.fillStyle = `rgba(${INK}, 0.8)`;
  g.font = '24px "Geist Pixel", monospace';
  const last = nights[n - 1];
  if (last) g.fillText(`The sky of ninety nights, to ${longDate(last.date)}`, 60, H - 84);
  g.textAlign = 'right';
  g.fillText('sinaida.eu/machines', W - 60, H - 84);
  return c;
}

/** Draws the postcard and hands it to the browser as a download. */
export async function savePostcard(nights: Night[]) {
  await document.fonts.load('24px "Geist Pixel"').catch(() => {});
  const blob = await new Promise<Blob | null>((done) => draw(nights).toBlob(done, 'image/png'));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `starway-${nights[nights.length - 1]?.date ?? 'sky'}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Shares the plain page link: the phone's share sheet, or the clipboard. */
export async function shareSky(): Promise<'shared' | 'copied' | 'failed'> {
  try {
    if (navigator.share) {
      await navigator.share({ url: SKY_URL });
      return 'shared';
    }
    await navigator.clipboard.writeText(SKY_URL);
    return 'copied';
  } catch {
    return 'failed';
  }
}

// Je suis le spectre d'une rose que tu portais hier au bal.
