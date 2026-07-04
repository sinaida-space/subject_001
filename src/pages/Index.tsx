import { lazy, Suspense } from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import AboutSection from '@/components/AboutSection';
import Constellation from '@/components/constellation/Constellation';
import ServicesTerminal from '@/components/ServicesTerminal';
import ContactChannel from '@/components/ContactChannel';
import Footer from '@/components/Footer';
import SectionBreak from '@/components/SectionBreak';
import CustomCursor from '@/components/CustomCursor';
import CookieBanner from '@/components/CookieBanner';
import { useRenderMode } from '@/hooks/useRenderMode';

const ParticleField = lazy(() => import('@/components/ParticleField'));

const Index = () => {
  const { mode } = useRenderMode();
  const full = mode === 'full';

  return (
    <div className="relative min-h-screen bg-background grid-overlay">
      {/* Cosmic starfield backdrop — full mode only; lite uses the CSS gradient.
          fallback={null} is intentional, not a CLS gap: ParticleField renders
          `fixed inset-0`, so it's a background layer with zero in-flow height —
          nothing on the page reserves space for it, and it can never shift
          layout whether it's present or not. */}
      {full && (
        <Suspense fallback={null}>
          <ParticleField />
        </Suspense>
      )}

      {/* Custom cursor — component self-limits to fine pointers */}
      {full && <CustomCursor />}

      <Header />

      <main>
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
