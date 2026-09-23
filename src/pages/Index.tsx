import { lazy, Suspense, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import AboutSection from '@/components/AboutSection';
import Constellation from '@/components/constellation/Constellation';
import ServicesTerminal from '@/components/ServicesTerminal';
import ContactChannel from '@/components/ContactChannel';
import Footer from '@/components/Footer';
import MoleculeBreak, { SectionBand } from '@/components/MoleculeBreak';
import CookieBanner from '@/components/CookieBanner';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useRenderMode } from '@/hooks/useRenderMode';

const ParticleField = lazy(() => import('@/components/ParticleField'));
const DustReveal = lazy(() => import('@/components/DustReveal'));

const Index = () => {
  const { mode } = useRenderMode();
  const full = mode === 'full';
  const { hash } = useLocation();

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
      {full && (
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
        {/* The red horizon: where the cover ends and the content begins. */}
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
        <MoleculeBreak id="dopamine" />
        {/* HOW + WHAT — skills and every project, one living Signal Map */}
        <Constellation />
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
