import { useRef } from 'react';

interface VHSImageProps {
  src: string;
  alt: string;
  className?: string;
  aspectRatio?: string;
}

export default function VHSImage({ src, alt, className = '', aspectRatio = '16/10' }: VHSImageProps) {
  const imgRef = useRef<HTMLImageElement>(null);

  const handleMouseEnter = () => {
    const img = imgRef.current;
    if (!img) return;
    img.style.filter = 'contrast(1.08) brightness(0.92) saturate(0.85) hue-rotate(15deg) contrast(1.2)';
    setTimeout(() => {
      if (img) img.style.transform = 'translateX(-2px)';
    }, 120);
    setTimeout(() => {
      if (img) {
        img.style.filter = 'contrast(1.08) brightness(0.92) saturate(0.85)';
        img.style.transform = 'translateX(0)';
      }
    }, 200);
  };

  return (
    <div
      className={`vhs-project-frame relative overflow-hidden ${className}`}
      style={{
        border: '1px solid rgba(255,51,51,0.4)',
        boxShadow: '0 0 0 1px hsl(var(--accent) / 0.15), inset 0 0 30px rgba(0,0,0,0.5)',
        aspectRatio,
      }}
      onMouseEnter={handleMouseEnter}
    >
      {/* Corner brackets — top-right cyan, bottom-left red */}
      <div
        className="absolute top-[-1px] right-[-1px] w-[18px] h-[18px] pointer-events-none z-[2]"
        style={{ borderTop: '2px solid hsl(var(--accent))', borderRight: '2px solid hsl(var(--accent))' }}
      />
      <div
        className="absolute bottom-[-1px] left-[-1px] w-[18px] h-[18px] pointer-events-none z-[2]"
        style={{ borderBottom: '2px solid #ff3333', borderLeft: '2px solid #ff3333' }}
      />

      {/* Image */}
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="w-full h-full object-cover transition-all duration-200"
        style={{ filter: 'contrast(1.08) brightness(0.92) saturate(0.85)' }}
      />

      {/* Scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'repeating-linear-gradient(to bottom, transparent 0px, transparent 3px, rgba(0,0,0,0.08) 3px, rgba(0,0,0,0.08) 4px)',
        }}
      />

      {/* VHS noise bars */}
      <div className="absolute inset-0 pointer-events-none vhs-noise-bars opacity-40" />
    </div>
  );
}
