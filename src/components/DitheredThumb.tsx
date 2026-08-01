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
}

export default function DitheredThumb({ src, alt, className, loading = 'lazy' }: DitheredThumbProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setDataUrl(null);
    getDitheredPreview(src).then((url) => {
      if (!cancelled) setDataUrl(url);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  return <img src={dataUrl ?? src} alt={alt} loading={loading} className={className} draggable={false} />;
}
