import { useState } from 'react';

// Lazy YouTube facade — a poster + play button; the heavy iframe only mounts
// after a click. Keeps LCP fast and CLS ≈ 0.
export default function VideoEmbed({ id, title }: { id: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  return (
    <div className="relative aspect-video w-full overflow-hidden border border-white/10 bg-black">
      {playing ? (
        <iframe
          className="absolute inset-0 h-full w-full"
          src={`https://www.youtube.com/embed/${id}?autoplay=1&rel=0`}
          title={title}
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="group absolute inset-0 flex items-center justify-center"
          aria-label={`Play ${title}`}
        >
          <img
            src={`https://img.youtube.com/vi/${id}/hqdefault.jpg`}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-90"
            loading="lazy"
          />
          <span
            className="relative flex h-14 w-14 items-center justify-center rounded-full border border-primary/70 bg-black/50 backdrop-blur-sm transition-transform group-hover:scale-110"
            style={{ boxShadow: '0 0 24px rgba(255,59,82,0.4)' }}
          >
            <span className="ml-1 block h-0 w-0 border-y-[9px] border-l-[15px] border-y-transparent border-l-primary" />
          </span>
        </button>
      )}
    </div>
  );
}
