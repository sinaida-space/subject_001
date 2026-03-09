import DustReveal from '@/components/DustReveal';

export default function AboutSection() {
  return (
    <section id="about" className="relative z-10 py-32">
      <div className="container mx-auto px-6 max-w-7xl">
        <DustReveal>
          <div className="section-divider mb-20" />

          <div className="grid grid-cols-12 gap-4 md:gap-6 lg:gap-8 items-start">
            {/* Label */}
            <div className="col-span-12 md:col-span-3 md:pt-2">
              <span className="clinical-label text-primary">About</span>
              <div className="mt-2 text-xs font-clinical text-muted-foreground">[ BIO ]</div>
            </div>

            {/* Content */}
            <div className="col-span-12 md:col-span-9 space-y-8">
              <h2 className="font-display text-2xl md:text-4xl font-light leading-tight mb-8">
                Art, technology, and
                <span className="text-primary"> human expression</span>
              </h2>

              <div className="space-y-6 font-clinical text-sm md:text-base text-secondary-foreground leading-relaxed">
                <p>
                  I work at the intersection of art, technology, and human expression. My focus is the emerging creative territory often described as the digital latent space – a new medium where generative systems expand how ideas, movement, and identity can be expressed.
                </p>
                <p>
                  Trained as a biomedical engineer and shaped by experience in corporate IT leadership, I approach creative technology with both analytical rigor and artistic intent. Alongside my professional career, I have developed projects within the ballet and performing arts world to transition visions into a sustainable commercial reality.
                </p>
                <p>
                  My current practice combines generative AI, real-time visual systems, and cinematic post-production to create immersive digital experiences. Using tools such as DaVinci Resolve and TouchDesigner, I build workflows that integrate AI synthesis with real-time environments and high-fidelity visual environments that connect people through a new creative language.
                </p>
              </div>
            </div>
          </div>
        </DustReveal>
      </div>
    </section>
  );
}
