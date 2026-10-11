import { useEffect, useState } from 'react';

// ── Still stars (#141) ──
// The live star field is three.js and arrives seconds after the headline on a
// phone. Until then this still sky holds the screen: a few hundred dots in one
// inline SVG, painted with the first frame, nothing moving. When the field
// draws its first frame (ParticleField sets html[data-field]), the field fades
// in over it and this fades out, once. Under reduced motion both simply cut.

const COUNT = 260;

// a fixed seed, so every visit sees the same sky and SSR matches the client
function mulberry32(a: number) {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const SKY = (() => {
  const rnd = mulberry32(0x5eed);
  let dots = '';
  for (let i = 0; i < COUNT; i++) {
    const x = (rnd() * 1000).toFixed(1);
    const y = (rnd() * 1000).toFixed(1);
    const near = rnd();
    const r = (0.6 + near * near * 1.6).toFixed(2);
    const red = rnd() < 0.18; // the galaxy's share of red stars, roughly
    const a = (0.25 + near * 0.55).toFixed(2);
    dots += `<circle cx="${x}" cy="${y}" r="${r}" fill="${red ? '#cc0000' : '#f5efe6'}" fill-opacity="${a}"/>`;
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMid slice">${dots}</svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
})();

export default function StarStill() {
  const [gone, setGone] = useState(false);
  // unmount once the fade-out has finished, so it costs nothing afterwards
  useEffect(() => {
    const html = document.documentElement;
    let t = 0;
    const check = () => {
      if (!html.hasAttribute('data-field')) return;
      t = window.setTimeout(() => setGone(true), 1600);
      mo.disconnect();
    };
    const mo = new MutationObserver(check);
    mo.observe(html, { attributes: true, attributeFilter: ['data-field'] });
    check();
    return () => {
      mo.disconnect();
      window.clearTimeout(t);
    };
  }, []);
  if (gone) return null;
  return <div aria-hidden="true" className="star-still pointer-events-none fixed inset-0 z-0" style={{ backgroundImage: SKY, backgroundSize: 'cover' }} />;
}

// Je suis le spectre d'une rose que tu portais hier au bal.
