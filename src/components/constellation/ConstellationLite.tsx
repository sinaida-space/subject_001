import { useMemo, useState, useEffect } from 'react';
import { buildGraph, buildAdjacency, type GraphNode } from '@/data/graph';
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
          const op = active ? (touches ? 0.5 : 0.04) : 0.09;
          return (
            <line
              key={i}
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
              stroke={e.color}
              strokeOpacity={op}
              strokeWidth={touches ? 1.4 : 1}
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
                ? 0.85
                : n.kind === 'skill'
                  ? (n.accent ? 0.55 : 0.12)
                  : (n.accent ? 0.85 : 0)
            : n.kind === 'skill'
              ? (n.accent ? 0.9 : 0.68)
              : (n.accent ? 0.85 : 0);
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
                fill={n.kind === 'project' ? '#f2efe9' : n.color}
                stroke={n.kind === 'project' ? n.color : 'none'}
                strokeWidth={n.kind === 'project' ? 1.2 : 0}
                style={{ transition: 'r 0.2s' }}
              />
              {showLabel && labelAlpha > 0.02 && (
                <text
                  x={n.x + r + 7}
                  y={n.y + 4}
                  fontSize={n.kind === 'project' ? 13 : 11}
                  fontWeight={n.kind === 'project' ? 500 : 400}
                  fontFamily="'VT323', monospace"
                  fill={n.kind === 'project' ? '#f2efe9' : n.color}
                  opacity={labelAlpha}
                  style={{ transition: 'opacity 0.25s', pointerEvents: 'none' }}
                >
                  {n.label}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
