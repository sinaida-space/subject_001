import { lazy, Suspense } from 'react';
import Header from '@/components/Header';
import HeroSection from '@/components/HeroSection';
import AboutSection from '@/components/AboutSection';
import GalleryTunnel from '@/components/GalleryTunnel';
import SkillConstellation from '@/components/SkillConstellation';
import ServicesTerminal from '@/components/ServicesTerminal';
import ContactChannel from '@/components/ContactChannel';
import Footer from '@/components/Footer';
import CustomCursor from '@/components/CustomCursor';
import VHSOverlay from '@/components/VHSOverlay';
import CookieBanner from '@/components/CookieBanner';
import ScrollWind from '@/components/ScrollWind';

import projectSubmerged from '@/assets/project-submerged-cover.png';
import projectLegacy from '@/assets/project-legacy-cover.jpg';
import projectSynesthetic from '@/assets/project-synesthetic-cover.png';

const ParticleField = lazy(() => import('@/components/ParticleField'));

const PROJECTS = [
  {
    id: 'submerged',
    title: 'Submerged Realities',
    subtitle: 'Projection Mapping Study',
    description:
      'AI-generated aesthetics mapped onto fluid surfaces. Digital textures interacting with the physics of water and red-light environments.',
    image: projectSubmerged,
    tags: ['Installation', 'Interactive', 'Projection'],
    tools: ['TouchDesigner', 'Midjourney', 'DaVinci Resolve'],
    links: [
      { label: 'Behance', url: 'https://www.behance.net/gallery/245412721/Submerged-Realities-Projection-Mapping-Study' },
      { label: 'YouTube', url: 'https://youtube.com/shorts/7qgDlifWno0' },
      { label: 'Instagram', url: 'https://www.instagram.com/p/DVVB4K9gh9x/' },
    ],
  },
  {
    id: 'legacy',
    title: 'Legacy in the Age of Stochastic Output',
    subtitle: 'Image Series',
    description:
      'Exploring infertility, biological finality, and AI. If a silicon brain produces a "stochastic legacy," where does the soul reside?',
    image: projectLegacy,
    tags: ['GenAI', 'Conceptual', 'Series'],
    tools: ['Midjourney', 'Higgsfield.ai', 'Affinity'],
    links: [
      { label: 'Behance', url: 'https://www.behance.net/gallery/245414325/Legacy-in-the-Age-of-Stochastic-Output' },
      { label: 'Instagram', url: 'https://www.instagram.com/p/DTsKFpxAloa/' },
    ],
  },
  {
    id: 'synesthetic',
    title: 'Synesthetic Bloom',
    subtitle: 'Audio-Responsive Digital Organism',
    description:
      'Sound transforms into pulsating architecture — a digital structure with a heartbeat synchronized to its auditory environment.',
    image: projectSynesthetic,
    tags: ['Generative', 'Audio-Reactive', 'Real-time'],
    tools: ['TouchDesigner', 'Midjourney', 'Suno'],
    links: [
      { label: 'Behance', url: 'https://www.behance.net/gallery/245415773/Synesthetic-Bloom-An-Audio-Responsive-Digital-Organism' },
      { label: 'YouTube', url: 'https://youtu.be/pzq0BSVzw28' },
    ],
  },
];

const Index = () => {
  return (
    <div className="relative min-h-screen bg-background grid-overlay">
      {/* Three.js Background */}
      <Suspense fallback={null}>
        <ParticleField />
      </Suspense>

      {/* Scroll Wind Particles */}
      <ScrollWind />

      {/* Custom Cursor */}
      <CustomCursor />

      {/* VHS + CRT Overlay */}
      <VHSOverlay />

      {/* Header */}
      <Header />

      {/* Page Content */}
      <main>
        <HeroSection />
        <GalleryTunnel projects={PROJECTS} />
        <AboutSection />
        <SkillConstellation />
        <ServicesTerminal />
        <ContactChannel />
      </main>

      <Footer />
      
      {/* Cookie Banner */}
      <CookieBanner />
    </div>
  );
};

export default Index;
