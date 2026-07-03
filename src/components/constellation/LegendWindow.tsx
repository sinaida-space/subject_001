import { CATEGORY_COLORS, CATEGORY_LABEL, type Category } from '@/data/graph';

const CATEGORIES = Object.keys(CATEGORY_COLORS) as Category[];

// Snake-chrome terminal HUD explaining the map's colour language.
export default function LegendWindow() {
  return (
    <div
      className="pointer-events-auto w-[220px] font-mono"
      style={{ background: '#060606', border: '1px solid #CC1414', boxShadow: '0 0 30px rgba(204,20,20,0.2)' }}
    >
      <div style={{ borderBottom: '1px solid #1a1a1a', padding: '7px 11px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: '10px', color: '#CC1414', letterSpacing: '2px' }}>LEGEND.EXE</span>
        <span style={{ fontSize: '9px', color: '#444', letterSpacing: '1px' }}>[ ? ]</span>
      </div>
      <div className="px-3 py-3" style={{ fontSize: '10.5px', letterSpacing: '0.03em' }}>
        <div className="mb-2 flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: '#ffffff', boxShadow: '0 0 6px #ffffff' }} />
          <span style={{ color: '#cfcfcf' }}>white &nbsp;·&nbsp; work</span>
        </div>
        {CATEGORIES.map((c) => (
          <div key={c} className="mb-2 flex items-center gap-2 last:mb-0">
            <span
              className="inline-block h-2 w-2 rounded-full"
              style={{ background: CATEGORY_COLORS[c], boxShadow: `0 0 6px ${CATEGORY_COLORS[c]}` }}
            />
            <span style={{ color: '#cfcfcf' }}>{CATEGORY_LABEL[c]}</span>
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid #1a1a1a', padding: '6px 11px' }}>
        <span style={{ fontSize: '9.5px', color: '#444', letterSpacing: '1px' }}>click a star ▸ open case</span>
      </div>
    </div>
  );
}
