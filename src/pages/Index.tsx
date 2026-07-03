import { lazy, Suspense } from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import Constellation from '@/components/constellation/Constellation';
import SelectedWorks from '@/components/SelectedWorks';
import AboutSection from '@/components/AboutSection';
import ExperimentsTools from '@/components/ExperimentsTools';
import ServicesTerminal from '@/components/ServicesTerminal';
import ContactChannel from '@/components/ContactChannel';
import Footer from '@/components/Footer';
import CustomCursor from '@/components/CustomCursor';
import CookieBanner from '@/components/CookieBanner';
import { useRenderMode } from '@/hooks/useRenderMode';

const ParticleField = lazy(() => import('@/components/ParticleField'));

const Index = () => {
  const { mode } = useRenderMode();
  const full = mode === 'full';

  return (
    <div className="relative min-h-screen bg-background grid-overlay">
      {/* Cosmic starfield backdrop — full mode only; lite uses the CSS gradient */}
      {full && (
        <Suspense fallback={null}>
          <ParticleField />
        </Suspense>
      )}

      {/* Custom cursor — component self-limits to fine pointers */}
      {full && <CustomCursor />}

      <Header />

      <main>
        <HeroSection />
        <Constellation />
        <SelectedWorks />
        <AboutSection />
        <ExperimentsTools />
        <ServicesTerminal />
        <ContactChannel />
      </main>

      <Footer />
      <CookieBanner />
    </div>
  );
};

export default Index;
