import { lazy, Suspense } from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import HeroFull from '@/components/dreamcore/HeroFull';
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
        <ErrorBoundary fallback={null}>
          <Suspense fallback={null}>
            <ParticleField />
          </Suspense>
        </ErrorBoundary>
      )}

      <Header />

      <main>
        {/* WHY — who she is, human first */}
        {full ? <HeroFull /> : <HeroSection />}
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
