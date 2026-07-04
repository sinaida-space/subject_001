import { useEffect, useState } from 'react';
import type { Project } from '@/data/projects';
import VideoEmbed from '@/components/VideoEmbed';
import HeartbeatPlaceholder from '@/components/HeartbeatPlaceholder';

// Terminal-window popup for any project star or index row — same chrome as
// SnakeEasterEgg (dark bg, red border, [ ESC ] to close).
export default function ProjectDetail({ project, onClose }: { project: Project; onClose: () => void }) {
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  const links = [...(project.links ?? [])];
  if (project.url && !links.some((l) => l.url === project.url)) {
    links.push({ label: 'Visit', url: project.url });
  }

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center overflow-y-auto bg-black/85 p-4 backdrop-blur-md md:p-10"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-3xl"
        style={{ background: '#060606', border: '1px solid #CC1414', boxShadow: '0 0 60px rgba(204,20,20,0.25)' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ borderBottom: '1px solid #1a1a1a', padding: '8px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#CC1414', letterSpacing: '2px' }}>
            {project.title.split(' — ')[0].toUpperCase()}
          </span>
          <button
            type="button"
            onClick={onClose}
            style={{ fontFamily: 'monospace', fontSize: '10px', color: '#555', background: 'none', border: 'none', cursor: 'pointer', letterSpacing: '1px' }}
          >
            [ ESC ]
          </button>
        </div>

        {project.video ? (
          <VideoEmbed id={project.video} title={project.title} />
        ) : project.image ? (
          <div className="relative w-full" style={{ aspectRatio: '16 / 9', maxHeight: '46vh' }}>
            <img
              src={project.image}
              alt={project.title}
              onLoad={() => setImgLoaded(true)}
              className="max-h-[46vh] w-full object-cover"
              style={{ position: 'absolute', inset: 0, height: '100%' }}
            />
            <HeartbeatPlaceholder loaded={imgLoaded} width="100%" height="100%" className="absolute inset-0" />
          </div>
        ) : null}

        <div className="p-6 md:p-8">
          <div className="font-mono text-[12px] uppercase tracking-[0.15em] text-primary">{project.tagline}</div>
          <h3 className="mt-2 font-display text-2xl text-foreground md:text-3xl">{project.title}</h3>
          {project.blurb && (
            <p className="mt-4 max-w-[62ch] font-mono text-[15px] leading-relaxed text-white/80">{project.blurb}</p>
          )}
          {project.tools && (
            <div className="mt-5 flex flex-wrap gap-2">
              {project.tools.map((t) => (
                <span key={t} style={{ border: '1px solid #1a1a1a', padding: '4px 8px', fontFamily: 'monospace', fontSize: '10px', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.4)' }}>
                  {t}
                </span>
              ))}
            </div>
          )}
          {links.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-4">
              {links.map((l) => (
                <a
                  key={l.url}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[12px] uppercase tracking-[0.12em] text-accent transition-opacity hover:opacity-70"
                >
                  {l.label} ↗
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
