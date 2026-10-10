import { lazy, Suspense, useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import HeroLetters from '@/components/HeroLetters';
import AboutSection from '@/components/AboutSection';
import Constellation from '@/components/constellation/Constellation';
import ServicesTerminal from '@/components/ServicesTerminal';
import ContactChannel from '@/components/ContactChannel';
import Footer from '@/components/Footer';
import MoleculeBreak, { SectionBand } from '@/components/MoleculeBreak';
import WorkBuild from '@/components/WorkBuild';
import HorizonGate from '@/components/HorizonGate';
import CookieBanner from '@/components/CookieBanner';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useRenderMode } from '@/hooks/useRenderMode';
import { usePageMeta } from '@/hooks/usePageMeta';

const ParticleField = lazy(() => import('@/components/ParticleField'));
const DustReveal = lazy(() => import('@/components/DustReveal'));

const Index = () => {
  const { mode } = useRenderMode();
  const full = mode === 'full';
  const { hash, search } = useLocation();
  // preview-only hero trial, see HeroLetters.tsx
  const heroParam = new URLSearchParams(search).get('hero');
  const heroTrial = heroParam === 'd';

  // Same strings as the home route in scripts/lib/site-data.mjs. Needed for
  // visitors who land on another page first: arriving here client-side would
  // otherwise keep that page's title.
  usePageMeta({
    title: 'Sinaida Krivchenko | New media artist · Interactive projections & stage visuals · Prague',
    description:
      'Sinaida Krivchenko is a Prague-based new media artist: real-time TouchDesigner and GLSL systems for stage visuals, projections, and audio-reactive performance.',
    canonical: 'https://sinaida.eu/',
  });

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
        {heroTrial ? <HeroLetters /> : <HeroSection />}
        {/* The red horizon: where the cover ends and the content begins. In
            full mode scrolling turns it into the gate that opens onto About. */}
        {full ? (
          <HorizonGate>
            <SectionBand>
              <div className="container mx-auto px-6 max-w-7xl">
                <div className="section-divider" data-horizon />
              </div>
            </SectionBand>
            <AboutSection />
          </HorizonGate>
        ) : (
          <>
            <SectionBand>
              <div className="container mx-auto px-6 max-w-7xl">
                <Suspense fallback={<div className="section-divider" />}>
                  <DustReveal>
                    <div className="section-divider" />
                  </DustReveal>
                </Suspense>
              </div>
            </SectionBand>
            <AboutSection />
          </>
        )}
        <MoleculeBreak id="dopamine" />
        {/* HOW + WHAT — skills and every project, one living Signal Map */}
        {full ? (
          <WorkBuild>
            <Constellation />
          </WorkBuild>
        ) : (
          <Constellation />
        )}
        <MoleculeBreak id="serotonin" />
        <ServicesTerminal />
        <MoleculeBreak id="oxytocin" />
        <ContactChannel />
      </main>

      <Footer />
      <CookieBanner />
    </div>
  );
};

export default Index;
