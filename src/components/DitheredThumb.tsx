import { useEffect, useState } from 'react';
import { getDitheredPreview } from '@/lib/ditherPreview';

// ── Static Bayer-dithered thumbnail ──
// Same one-shot dither used for the constellation hover preview, applied
// permanently to a still image rather than trailing the cursor. Renders the
// source image until the dithered dataURL resolves, then swaps in place.

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

  useEffect(() => {
    let cancelled = false;
    setDataUrl(null);
    getDitheredPreview(src, width, height).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [src, width, height]);

  return <img src={dataUrl ?? src} alt={alt} loading={loading} className={className} draggable={false} />;
}
