import { lazy, Suspense } from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import AboutSection from '@/components/AboutSection';
import ProjectsSection from '@/components/ProjectsSection';
import SkillsSection from '@/components/SkillsSection';
import ContactSection from '@/components/ContactSection';
import Footer from '@/components/Footer';
import CustomCursor from '@/components/CustomCursor';
import VHSOverlay from '@/components/VHSOverlay';

const ParticleField = lazy(() => import('@/components/ParticleField'));

const Index = () => {
  return (
    <div className="relative min-h-screen bg-background grid-overlay">
      {/* Three.js Background */}
      <Suspense fallback={null}>
        <ParticleField />
      </Suspense>

      {/* Custom Cursor */}
      <CustomCursor />

      {/* VHS + CRT Overlay */}
      <VHSOverlay />

      {/* Header */}
      <Header />

      {/* Page Content */}
      <main>
        <HeroSection />
        <ProjectsSection />
        <AboutSection />
        <SkillsSection />
        <ContactSection />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
