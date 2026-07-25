import { useState } from 'react';

interface VideoEmbedProps {
  id: string;
  title: string;
  /** Caps the rendered height so the video can't force a scrollable
   * container (e.g. inside a fixed-height modal). Width shrinks to match,
   * staying centered — the video never grows past this regardless of how
   * wide its parent is. Omit for the previous unconstrained width-driven size. */
  maxHeightVh?: number;
}

// Lazy YouTube facade: a poster + play button, with the iframe mounting only
// after a click. Keeps LCP fast and CLS ≈ 0.
//
// The poster is served from /public/video-posters/, self-hosted rather than
// pulled from img.youtube.com. The old thumbnail URL sent every visitor's IP
// to Google on page load, before any consent and before any intent to watch,
// which defeated the point of the facade. Google is now contacted only once
// the visitor actually presses play. To add a video, drop its
// hqdefault.jpg into that folder named <videoId>.jpg.
export default function VideoEmbed({ id, title, maxHeightVh }: VideoEmbedProps) {
  const [playing, setPlaying] = useState(false);
  return (
    <div
      className="relative w-full overflow-hidden border border-foreground/10 bg-black mx-auto"
      style={
        maxHeightVh
          ? { aspectRatio: '16 / 9', maxHeight: `${maxHeightVh}vh`, width: `min(100%, calc(${maxHeightVh}vh * 16 / 9))` }
          : { aspectRatio: '16 / 9' }
      }
    >
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
            src={`/video-posters/${id}.jpg`}
            alt=""
            width={480}
            height={360}
            className="absolute inset-0 h-full w-full object-cover opacity-70 transition-opacity group-hover:opacity-90"
            loading="lazy"
            decoding="async"
          />
          <span
            className="relative flex h-14 w-14 items-center justify-center rounded-full border border-primary/70 bg-black/50 backdrop-blur-sm transition-transform group-hover:scale-110"
            style={{ boxShadow: '0 0 24px hsl(var(--sinaida-red) / 0.4)' }}
          >
            <span className="ml-1 block h-0 w-0 border-y-[9px] border-l-[15px] border-y-transparent border-l-primary" />
          </span>
        </button>
      )}
    </div>
  );
}
