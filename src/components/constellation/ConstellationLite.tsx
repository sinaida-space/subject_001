import { useMemo, useState, useEffect } from 'react';
import { buildGraph, buildAdjacency, type GraphNode, OFF_WHITE } from '@/data/graph';
import { computeLayout } from '@/lib/layout';
import { constellationBus } from '@/lib/constellationBus';

const VW = 1100;
const VH = 780;

interface Props {
  onActiveProject?: (p: GraphNode['project'] | null) => void;
}

// Static, physics-free constellation from the same layout. Highlight is plain
// React state on hover/focus — no canvas, no rAF. Ships in the initial bundle.
export default function ConstellationLite({ onActiveProject }: Props) {
  const { nodes, edges } = useMemo(() => buildGraph(), []);
  const adj = useMemo(() => buildAdjacency(edges), [edges]);
  const laid = useMemo(() => computeLayout(nodes, edges, { width: VW, height: VH }), [nodes, edges]);
  const posById = useMemo(() => new Map(laid.nodes.map((n) => [n.id, n])), [laid]);

  const [active, setActive] = useState<string | null>(null);
  const neighbors = active ? adj.get(active) ?? new Set<string>() : null;

  useEffect(() => {
    const unsub = constellationBus.subscribe((id) => setActive(id));
    return () => {
      unsub();
    };
  }, []);

  const select = (n: GraphNode) => {
    setActive(n.id);
    onActiveProject?.(n.kind === 'project' ? n.project ?? null : null);
  };

  const activate = (n: GraphNode) => {
    if (n.project) constellationBus.focusWork(n.id);
  };

  return (
    <div className="relative w-full" style={{ height: 'clamp(480px, 76vh, 860px)' }}>
      <svg viewBox={`0 0 ${VW} ${VH}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        {/* edges */}
        {edges.map((e, i) => {
          const a = posById.get(e.a)!;
          const b = posById.get(e.b)!;
          const touches = !!active && (e.a === active || e.b === active);
          const op = active ? (touches ? 0.65 : 0.06) : 0.2;
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={e.color}
              strokeOpacity={op}
              strokeWidth={touches ? 1.8 : 1.3}
              style={{ transition: 'stroke-opacity 0.25s' }}
            />
          );
        })}

        {/* nodes */}
        {laid.nodes.map((n) => {
          const isActive = n.id === active;
          const isNeighbor = neighbors?.has(n.id);
          let opacity = 1;
          if (active && !isActive && !isNeighbor) opacity = 0.3;
          const r =
            n.kind === 'project'
              ? n.project?.background
                ? 2.6 + n.weight * 1.8
                : 3 + n.weight * 3
              : 2.4;
          // Skill-first: skills carry labels by default; project names only
          // surface once the visitor traces into that star — except the two
          // hero works and the accent skills, which stay named at all times.
          const showLabel = n.kind === 'skill' ? true : isActive || !!isNeighbor || !!n.accent;
          const labelAlpha = active
            ? isActive
              ? 1
              : isNeighbor
                ? 0.9
                : n.kind === 'skill'
                  ? (n.accent ? 0.65 : 0.2)
                  : (n.accent ? 0.9 : 0)
            : n.kind === 'skill'
              ? (n.accent ? 0.95 : 0.78)
              : (n.accent ? 0.9 : 0);
          return (
            <g
              key={n.id}
              style={{ cursor: n.project ? 'pointer' : 'default', opacity, transition: 'opacity 0.25s' }}
              tabIndex={n.project ? 0 : -1}
              onMouseEnter={() => select(n)}
              onMouseLeave={() => setActive(null)}
              onFocus={() => select(n)}
              onClick={() => activate(n)}
              onKeyDown={(ev) => {
                if (ev.key === 'Enter' || ev.key === ' ') {
                  ev.preventDefault();
                  activate(n);
                }
              }}
            >
              {/* glow halo */}
              <circle
                cx={n.x}
                cy={n.y}
                r={r * (isActive ? 5 : 3.4)}
                fill={n.color}
                opacity={(n.kind === 'project' ? 0.16 : 0.08) * (isActive ? 1.6 : 1)}
                style={{ transition: 'r 0.25s, opacity 0.25s' }}
              />
              <circle
                cx={n.x}
                cy={n.y}
                r={r * (isActive ? 1.4 : 1)}
                fill={n.kind === 'project' ? OFF_WHITE : n.color}
                stroke={n.kind === 'project' ? n.color : 'none'}
                strokeWidth={n.kind === 'project' ? 1.2 : 0}
                style={{ transition: 'r 0.2s' }}
              />
              {showLabel && labelAlpha > 0.02 && (
                <>
                  {/* Darkened backdrop so background stars don't compete with
                      the name's readability — width is a monospace estimate
                      since SVG can't measure text without a DOM round-trip. */}
                  <rect
                    x={n.x + r + 4}
                    y={n.y + 4 - (n.kind === 'project' ? 13 : 11)}
                    width={n.label.length * (n.kind === 'project' ? 10 : 8.6) + 6}
                    height={n.kind === 'project' ? 19 : 16}
                    fill="hsl(var(--background))"
                    opacity={Math.min(0.72, labelAlpha + 0.15)}
                    style={{ transition: 'opacity 0.25s', pointerEvents: 'none' }}
                  />
                  <text
                    x={n.x + r + 7}
                    y={n.y + 4}
                    fontSize={n.kind === 'project' ? 17 : 15}
                    fontWeight={n.kind === 'project' ? 500 : 400}
                    fontFamily="'VT323', monospace"
                    fill={n.kind === 'project' ? OFF_WHITE : n.color}
                    opacity={Math.min(1, labelAlpha + 0.15)}
                    style={{ transition: 'opacity 0.25s', pointerEvents: 'none' }}
                  >
                    {n.label}
                  </text>
                </>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
