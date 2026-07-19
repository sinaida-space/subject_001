import { useRenderMode } from '@/hooks/useRenderMode';

/**
 * Full-viewport CRT screen treatment — vignette (fake curved-glass edge
 * shading), phosphor stripe texture, static chroma fringe at the left/right
 * edges, and a slow breathing flicker. Mounted once at the app root next to
 * VHSStaticLayer. Dark mode only: returns null in lite mode so light mode
 * carries zero trace of the layer. Motion (the flicker) is gated behind
 * `prefers-reduced-motion: no-preference` in CSS; everything else here is a
 * static gradient, no per-frame JS.
 */
export default function CRTScreen() {
  const { mode } = useRenderMode();

  if (mode === 'lite') return null;

  return (
    <div className="crt-screen" aria-hidden="true">
      <div className="crt-vignette" />
      <div className="crt-phosphor" />
      <div className="crt-fringe crt-fringe--left" />
      <div className="crt-fringe crt-fringe--right" />
      <div className="crt-flicker" />
    </div>
  );
}
