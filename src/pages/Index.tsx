import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import AboutSection from '@/components/AboutSection';
import Constellation from '@/components/constellation/Constellation';
import ServicesTerminal from '@/components/ServicesTerminal';
import ContactChannel from '@/components/ContactChannel';
import Footer from '@/components/Footer';
import SectionBreak from '@/components/SectionBreak';
import CookieBanner from '@/components/CookieBanner';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useRenderMode } from '@/hooks/useRenderMode';

const ParticleField = lazy(() => import('@/components/ParticleField'));

const Index = () => {
  const { mode } = useRenderMode();
  const full = mode === 'full';
  const { hash } = useLocation();

  // The star field pulls in three.js (the largest chunk on the site). Mount
  // it once the browser is idle after first paint, so parsing it never
  // competes with the headline becoming readable. The timeout caps the wait
  // on a page that never goes idle.
  const [fieldReady, setFieldReady] = useState(false);
  useEffect(() => {
    if (!full) return;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setFieldReady(true), { timeout: 1200 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setFieldReady(true), 200);
    return () => window.clearTimeout(id);
  }, [full]);

  // Arriving from another page via a Header/Footer nav link (/#work etc.) —
  // scroll to the section once it's mounted.
  useEffect(() => {
    if (!hash) return;
    const el = document.querySelector(hash);
    if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth' }), 100);
  }, [hash]);

  return (
    <div className="relative min-h-screen bg-background">
      {/* Cosmic starfield backdrop — full mode only; lite uses the CSS gradient.
          fallback={null} is intentional, not a CLS gap: ParticleField renders
          `fixed inset-0`, so it's a background layer with zero in-flow height —
          nothing on the page reserves space for it, and it can never shift
          layout whether it's present or not. */}
      {/* fallback={null}: if real WebGLRenderer construction throws despite the
          feature-probe passing (GPU-blocklisted / locked-down hardware), the
          starfield silently disappears and the rest of the page renders
          normally. We deliberately do NOT call useRenderMode().toggle() here:
          toggle() persists 'lite' to localStorage and marks the mode as
          user-overridden (see useRenderMode.tsx), which would permanently
          lock that browser out of full mode on every future visit — even
          after a driver update or on different hardware. A one-off render
          failure isn't the kind of durable preference that override is meant
          to capture. (The custom cursor now mounts once at the App level,
          shared across every route, not duplicated per page.) */}
      {full && fieldReady && (
        <ErrorBoundary fallback={null} onError={(e) => console.error('ParticleField crashed:', e)}>
          <Suspense fallback={null}>
            <ParticleField />
          </Suspense>
        </ErrorBoundary>
      )}

      <Header />

      <main id="main-content" tabIndex={-1}>
        {/* WHY — who she is, human first */}
        <HeroSection />
        <AboutSection />
        <SectionBreak />
        {/* HOW + WHAT — skills and every project, one living Signal Map */}
        <Constellation />
        <SectionBreak />
        <ServicesTerminal />
        <ContactChannel />
      </main>

      <Footer />
      <CookieBanner />
    </div>
  );
};

export default Index;
