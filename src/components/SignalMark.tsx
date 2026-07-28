// Replaces the Why/How/What visible captions on /experiences: a square
// outline with an ECG-style pulse crossing it, amplitude growing across the
// three blocks (1 = Why, 2 = How, 3 = What). Purely decorative: the
// accessible name comes from the sr-only label rendered alongside it.
const AMPLITUDE: Record<1 | 2 | 3, number> = {
  1: 3,
  2: 6,
  3: 10,
};

export default function SignalMark({ level }: { level: 1 | 2 | 3 }) {
  const amp = AMPLITUDE[level];
  const mid = 14;
  const points = [
    [2, mid],
    [10, mid],
    [12, mid - amp],
    [14, mid + amp],
    [16, mid],
    [26, mid],
  ]
    .map(([x, y]) => `${x},${y}`)
    .join(' ');

  return (
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <rect
        x="1"
        y="1"
        width="26"
        height="26"
        fill="none"
        stroke="hsl(var(--sinaida-red) / 0.55)"
        strokeWidth="1"
      />
      <polyline
        points={points}
        fill="none"
        stroke="hsl(var(--sinaida-red))"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
