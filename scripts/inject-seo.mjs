import { readFileSync, writeFileSync } from 'fs';

const file = 'dist/index.html';
const html = readFileSync(file, 'utf8');

const seoContent = `
<div id="seo-content" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;">
  <h1>Sinaida Krivchenko — Visual Artist and Creative Director, Prague</h1>
  <p>Prague-based visual artist and creative director working at the intersection of generative AI, live performance, and immersive experience. Background in biomedical engineering (MSc) and corporate IT leadership across four countries. Creating visual worlds for stages, exhibitions, and cultural institutions.</p>
  <h2>Services</h2>
  <ul>
    <li>Generative AI visual direction — campaign imagery, key art, and production visuals</li>
    <li>Stage and projection design — real-time generative environments for live performance using TouchDesigner</li>
    <li>Creative direction for cultural institutions — visual identity, digital infrastructure, audience strategy</li>
    <li>Immersive installation design — interactive and responsive visual systems</li>
    <li>Digital content and social campaigns for arts organisations</li>
  </ul>
  <h2>Selected Work</h2>
  <ul>
    <li>Submerged Realities — projection mapping study, AI-generated aesthetics mapped onto fluid surfaces</li>
    <li>Legacy in the Age of Stochastic Output — image series on infertility, biological finality, and generative AI</li>
    <li>Synesthetic Bloom — audio-responsive digital organism built in TouchDesigner</li>
  </ul>
  <h2>Skills</h2>
  <p>TouchDesigner, Midjourney, Generative AI, Real-time audio-reactive visuals, Procedural animation, AI-assisted visual pipelines, Post-production, Color grading, Creative direction, Visual narrative development, Biomedical engineering MSc, Systems design thinking, Algorithmic visual systems, Creative web development.</p>
  <h2>Contact</h2>
  <p>Based in Prague, working globally. Instagram: sin.ai.da. LinkedIn: linkedin.com/in/sinaida</p>
</div>`;

const injected = html.replace('<div id="root"></div>', `<div id="root"></div>${seoContent}`);
writeFileSync(file, injected);
console.log('SEO content injected into dist/index.html');
