import { useEffect, useState } from 'react';
import { getDitheredPreview } from '@/lib/ditherPreview';

// ── Static Bayer-dithered thumbnail ──
// Same one-shot dither used for the constellation hover preview, applied
// permanently to a still image rather than trailing the cursor. The raw
// source stays invisible until the dithered dataURL resolves (a bright
// poster flashing before the swap read as a white blink), then fades in.

interface DitheredThumbProps {
  src: string;
  alt: string;
  className?: string;
  loading?: 'lazy' | 'eager';
  /** dither canvas size; defaults to the square hover-preview size */
  width?: number;
  height?: number;
}

export default function DitheredThumb({ src, alt, className, loading = 'lazy', width, height }: DitheredThumbProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [settled, setSettled] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setDataUrl(null);
    setSettled(false);
    // dither at twice the shown size, so the dots stay fine on screen
    getDitheredPreview(src, width && width * 2, height && height * 2).then((url) => {
      if (cancelled) return;
      setDataUrl(url);
      setSettled(true);
    });
    return () => {
      cancelled = true;
    };
  }, [src, width, height]);

  return (
    <img
      src={dataUrl ?? src}
      alt={alt}
      loading={loading}
      className={className}
      draggable={false}
      style={{ opacity: settled ? 1 : 0, transition: 'opacity 220ms ease-out' }}
    />
  );
}
