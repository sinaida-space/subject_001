import { useEffect, useRef, useState } from 'react';

export default function ContactSection() {
  const [inView, setInView] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) setInView(true); },
      { threshold: 0.2 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSending(true);
    const form = e.currentTarget;
    const data = new FormData(form);

    try {
      await fetch('https://formsubmit.co/ajax/gallant_mod5v@icloud.com', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          subject: data.get('subject'),
          message: data.get('message'),
        }),
      });
      setSubmitted(true);
      form.reset();
    } catch {
      // fallback: open mailto
      window.location.href = `mailto:gallant_mod5v@icloud.com?subject=${encodeURIComponent(data.get('subject') as string)}&body=${encodeURIComponent(data.get('message') as string)}`;
    } finally {
      setSending(false);
    }
  };

  return (
    <section ref={ref} id="contact" className="relative z-10 py-32">
      <div className="container mx-auto px-6">
        <div className="section-divider mb-20" />

        <div className="grid grid-cols-12 gap-8">
          <div className="col-span-12 md:col-span-3">
            <span className="clinical-label text-primary">Contact</span>
            <div className="mt-2 text-xs font-clinical text-muted-foreground">
              [ COMM.SYS // OPEN ]
            </div>
          </div>

          <div className={`col-span-12 md:col-span-9 transition-all duration-700 ${inView ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}>
            <h2 className="font-display text-3xl md:text-5xl font-light mb-8">
              Let's create something<br />
              <span className="text-primary">extraordinary</span>
            </h2>

            <p className="font-clinical text-sm text-muted-foreground max-w-xl mb-12 leading-relaxed">
              Available for immersive installations, creative direction, stage visuals, exhibition design, and generative art commissions. Based in Prague, working globally.
            </p>

            {/* Contact Form */}
            {submitted ? (
              <div className="border border-primary/40 bg-primary/5 p-8 mb-12">
                <h3 className="font-display text-lg text-primary mb-2">Message transmitted</h3>
                <p className="font-clinical text-xs text-muted-foreground">
                  Signal received. I'll get back to you soon.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-12">
                <input type="text" hidden name="_captcha" value="false" readOnly />
                <div className="space-y-1">
                  <label className="clinical-label text-accent">Name</label>
                  <input
                    name="name"
                    required
                    maxLength={100}
                    className="w-full bg-transparent border border-border px-4 py-3 font-clinical text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none transition-colors cursor-none"
                    placeholder="Your name"
                  />
                </div>
                <div className="space-y-1">
                  <label className="clinical-label text-accent">Email</label>
                  <input
                    name="email"
                    type="email"
                    required
                    maxLength={255}
                    className="w-full bg-transparent border border-border px-4 py-3 font-clinical text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none transition-colors cursor-none"
                    placeholder="your@email.com"
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="clinical-label text-accent">Subject</label>
                  <input
                    name="subject"
                    required
                    maxLength={200}
                    className="w-full bg-transparent border border-border px-4 py-3 font-clinical text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none transition-colors cursor-none"
                    placeholder="Project inquiry, collaboration, commission..."
                  />
                </div>
                <div className="md:col-span-2 space-y-1">
                  <label className="clinical-label text-accent">Message</label>
                  <textarea
                    name="message"
                    required
                    maxLength={2000}
                    rows={5}
                    className="w-full bg-transparent border border-border px-4 py-3 font-clinical text-sm text-foreground placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none transition-colors resize-none cursor-none"
                    placeholder="Tell me about your project..."
                  />
                </div>
                <div className="md:col-span-2">
                  <button
                    type="submit"
                    disabled={sending}
                    className="border border-primary/40 px-8 py-3 font-clinical text-xs uppercase tracking-widest text-primary hover:bg-primary/10 hover:border-primary transition-all duration-300 cursor-none disabled:opacity-50"
                  >
                    {sending ? '[ TRANSMITTING... ]' : '[ SEND SIGNAL ]'}
                  </button>
                </div>
              </form>
            )}

            {/* Social links */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
              <a
                href="https://www.instagram.com/sin.ai.da/"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-border p-6 hover:border-primary/40 transition-all group cursor-none"
              >
                <div className="clinical-label text-accent mb-2">Instagram</div>
                <div className="font-clinical text-sm text-foreground group-hover:text-primary transition-colors">
                  @sin.ai.da
                </div>
              </a>

              <a
                href="https://www.linkedin.com/in/sinaida"
                target="_blank"
                rel="noopener noreferrer"
                className="border border-border p-6 hover:border-primary/40 transition-all group cursor-none"
              >
                <div className="clinical-label text-accent mb-2">LinkedIn</div>
                <div className="font-clinical text-sm text-foreground group-hover:text-primary transition-colors">
                  /in/sinaida
                </div>
              </a>
            </div>

            <div className="border border-primary/20 bg-primary/5 p-8">
              <h3 className="font-display text-lg mb-3">Open for Collaboration</h3>
              <p className="font-clinical text-xs text-muted-foreground leading-relaxed">
                Seeking synthesis with touring productions, theater, musicians, and cultural institutions. I am looking for collaborations that require the transmutation of data into live experiences. Let's build the future together.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
