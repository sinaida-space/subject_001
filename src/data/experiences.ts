// ── Single source of truth for the /experiences page: Daria Blokhina x
// Sinaida Krivchenko, exhibition and event spaces. Source: duo-data.json
// (proposal doc). The page component reads only from this module. ──

export interface ExperienceGalleryImage {
  src: string;
  alt: string;
}

export interface ExperienceProject {
  id: string;
  title: string;
  client: string;
  detail: string;
  images: ExperienceGalleryImage[];
}

export interface ExperienceVideo {
  id: string;
  title: string;
  caseHref: string;
  caption: string;
}

export interface ExperienceSection {
  heading: string;
  paragraphs: string[];
}

export interface ExperienceCtq {
  description: string;
  target: string;
  measure: string;
}

export interface ExperienceRisk {
  risk: string;
  level: string;
  mitigation: string;
}

export const EXPERIENCES_META: {
  headline: string;
  headlineLead: string;
  headlineAccent: string;
  whoLine: string;
  hook: string;
  golden: { why: string; how: string; what: string };
} = {
  headline: 'Space and system, built by the same hands.',
  headlineLead: 'Space and system,',
  headlineAccent: 'built by the same hands.',
  whoLine:
    'Daria Blokhina, spatial design and build, Valencia. Sinaida Krivchenko, interactive systems, Prague. Working together on exhibition and event spaces.',
  hook: 'Most booths and installations arrive as two purchased line items. A designer draws the room, then a vendor drops screens and motion graphics into it afterward. The content doesn’t know the space, and the space wasn’t built for what runs inside.',
  golden: {
    why: 'A stand and its interactive layer belong to one design process, not two separate hires briefed one after another.',
    how: 'Daria designs and builds the physical structure. Sinaida designs the real-time system that runs inside it, in TouchDesigner and GLSL.',
    what: 'One team, briefed once, for the next stand, activation, or installation.',
  },
};

export const DARIA_PROJECTS: ExperienceProject[] = [
  {
    id: 'mipim-cannes-2025',
    title: 'MIPIM Cannes 2025',
    client: 'Invest Saudi',
    detail: '600 m² two-floor pavilion',
    images: [
      { src: '/experiences/mipim-cannes-2025/01.jpg', alt: 'Invest Saudi pavilion at MIPIM Cannes 2025, main approach' },
      { src: '/experiences/mipim-cannes-2025/02.jpg', alt: 'Invest Saudi pavilion at MIPIM Cannes 2025, ground-floor interior' },
      { src: '/experiences/mipim-cannes-2025/03.jpg', alt: 'Invest Saudi pavilion at MIPIM Cannes 2025, upper-floor lounge area' },
      { src: '/experiences/mipim-cannes-2025/04.jpg', alt: 'Invest Saudi pavilion at MIPIM Cannes 2025, meeting space' },
      { src: '/experiences/mipim-cannes-2025/05.jpg', alt: 'Invest Saudi pavilion at MIPIM Cannes 2025, staircase connecting the two floors' },
      { src: '/experiences/mipim-cannes-2025/06.jpg', alt: 'Invest Saudi pavilion at MIPIM Cannes 2025, exterior facade at night' },
      { src: '/experiences/mipim-cannes-2025/07.jpg', alt: 'Invest Saudi pavilion at MIPIM Cannes 2025, structural floor plan' },
      { src: '/experiences/mipim-cannes-2025/08.jpg', alt: 'Invest Saudi pavilion at MIPIM Cannes 2025, reception desk detail' },
    ],
  },
  {
    id: 'smart-city-barcelona',
    title: 'Smart City Expo World Congress',
    client: 'New Murabba',
    detail: '154 m² booth, 360° LED cube',
    images: [
      { src: '/experiences/smart-city-barcelona/01.jpg', alt: 'New Murabba booth at Smart City Expo World Congress Barcelona, central LED cube' },
      { src: '/experiences/smart-city-barcelona/02.jpg', alt: 'New Murabba booth at Smart City Expo World Congress Barcelona, booth overview' },
      { src: '/experiences/smart-city-barcelona/03.jpg', alt: 'New Murabba booth at Smart City Expo World Congress Barcelona, visitor approach' },
      { src: '/experiences/smart-city-barcelona/04.jpg', alt: 'New Murabba booth at Smart City Expo World Congress Barcelona, LED cube content close-up' },
      { src: '/experiences/smart-city-barcelona/05.jpg', alt: 'New Murabba booth at Smart City Expo World Congress Barcelona, seating and meeting zone' },
      { src: '/experiences/smart-city-barcelona/06.jpg', alt: 'New Murabba booth at Smart City Expo World Congress Barcelona, structural floor plan' },
      { src: '/experiences/smart-city-barcelona/07.jpg', alt: 'New Murabba booth at Smart City Expo World Congress Barcelona, signage detail' },
      { src: '/experiences/smart-city-barcelona/08.jpg', alt: 'New Murabba booth at Smart City Expo World Congress Barcelona, evening lighting' },
      { src: '/experiences/smart-city-barcelona/09.jpg', alt: 'New Murabba booth at Smart City Expo World Congress Barcelona, full booth from the aisle' },
    ],
  },
];

export const SINAIDA_VIDEOS: ExperienceVideo[] = [
  {
    id: 'bDDAXRlz5FQ',
    title: 'Redkie Ptitsy, live at Sklad №3',
    caseHref: '/work/redkie-ptitsy',
    caption: 'A commissioned real-time interactive system for a live concert in Moscow: nine audio-reactive projections, one per song, listening to the mix straight from the desk.',
  },
  {
    id: 'dvNl1G2fVLM',
    title: 'The Eyes Chico',
    caseHref: '/work/the-eyes-chico',
    caption: 'A painting translated into a navigable field, prototyped as a projection installation: a raised palm steers the scene, in real time, on-device.',
  },
];

export const EXPERIENCES_SECTIONS: {
  execSummary: ExperienceSection;
  problem: ExperienceSection;
  beforeAfter: { before: string; after: string };
  clientBenefit: ExperienceSection;
  goal: { statement: string; ctqs: ExperienceCtq[] };
  scope: { inScope: string[]; outScope: string[] };
  differentiation: ExperienceSection;
  progress: ExperienceSection;
  team: ExperienceSection;
  resources: { have: string[]; need: string[] };
  risks: ExperienceRisk[];
  market: ExperienceSection;
  businessModel: ExperienceSection;
  nextSteps: ExperienceSection;
} = {
  execSummary: {
    heading: 'Summary',
    paragraphs: [
      'Exhibition stands and their interactive elements are usually commissioned separately: a spatial designer first, a technology vendor later, briefed one after another instead of together. The result is content squeezed onto surfaces that weren’t designed for it, and interaction that has to work around fixed geometry instead of inside it.',
      'Daria Blokhina designs and builds physical exhibition spaces at full scale. Sinaida Krivchenko designs real-time interactive systems in TouchDesigner and GLSL. Together, the two design a stand and its interactive layer from the same first sketch.',
    ],
  },
  problem: {
    heading: 'The problem',
    paragraphs: [
      'A stand built without its interactive content in mind ends up with that content squeezed onto whatever surface is left over: a screen mounted where a wall happened to be flat, a sensor added after the electrical plan was already fixed. Fixing this after the fact costs more than designing for it upfront, and it shows on the floor as interaction that feels stapled on rather than native to the space.',
      'Trade-show and festival production schedules are tight. A single team briefed once, instead of two vendors coordinating through a client, is a timeline advantage as much as a design one.',
    ],
  },
  beforeAfter: {
    before: 'A client separately briefs a stand designer and, later, a technology vendor. Two proposals, two invoices, two timelines to reconcile, and content decisions made after the structural plan is already locked.',
    after: 'One team is briefed once. The spatial plan and the interactive system are designed together from the first sketch, with materials and sensor placement chosen already knowing what will run through them.',
  },
  clientBenefit: {
    heading: 'What the client gets',
    paragraphs: [
      'One point of contact for both the structure and the interactive layer. One integrated timeline instead of two vendors to coordinate. Content that reads as part of the architecture, built for the specific surfaces and sightlines of the space rather than adapted to them afterward.',
    ],
  },
  goal: {
    statement: 'Deliver exhibition and event spaces where the physical structure and the real-time interactive system are designed as one integrated brief.',
    ctqs: [
      { description: 'Single integrated brief', target: 'One combined proposal covering structure and interaction', measure: 'Delivered as one document, one timeline, one point of contact' },
      { description: 'On-time installation', target: 'Structure and interactive system both operational before doors open', measure: 'Confirmed on-site ahead of event start' },
      { description: 'System reliability on the floor', target: 'Interactive system runs for the full event window without manual restarts', measure: 'Monitored during event hours' },
    ],
  },
  scope: {
    inScope: [
      'Spatial concept design and buildable 3D models (Daria)',
      'Structural and material planning, and construction management, for assembly, teardown, and the trade-show floor (Daria)',
      'Real-time interactive systems in TouchDesigner and GLSL: generative visuals, audio-reactive and sensor-driven interaction (Sinaida)',
      'On-site installation and live operation, remote or in person as the project requires',
    ],
    outScope: [
      'Ongoing day-to-day staffing or operation of the space after handover',
      'Marketing, PR, or lead-generation services',
      'Software or systems unrelated to the physical stand and its interactive layer',
    ],
  },
  differentiation: {
    heading: 'What makes this different',
    paragraphs: [
      'Stand-building companies typically treat interactive content as a purchased add-on. Motion and AV studios typically treat the physical space as someone else’s problem. This team designs both from the same brief, structure and system together, from the start.',
    ],
  },
  progress: {
    heading: 'Track record',
    paragraphs: [
      'Daria has designed and built exhibition stands and pavilions for clients including Invest Saudi at MIPIM Cannes 2025 (a 600 m² two-floor pavilion) and New Murabba at Smart City Expo World Congress in Barcelona (a 154 m² booth built around a 360° LED cube). Sinaida has delivered a commissioned real-time interactive system for Redkie Ptitsy in Moscow, and a prototyped installation for The Eyes Chico. Structural delivery at full exhibition scale and real-time interactive delivery are each independently proven; this page is where the two combine.',
    ],
  },
  team: {
    heading: 'Team',
    paragraphs: [
      'Daria Blokhina, spatial design and build, based in Valencia. Owns the physical stand: concept, buildable model, materials, and construction management. Project archive: github.com/onlystrikes/Released-Projects.',
      'Sinaida Krivchenko, interactive systems, based in Prague. Owns the interactive layer: real-time visuals and sensor systems built in TouchDesigner and GLSL. Portfolio: sinaida.eu.',
      'Both are available on-site or remote, depending on the project.',
    ],
  },
  resources: {
    have: [
      'Daria’s existing production relationships and build experience from delivered stands (MIPIM Cannes 2025, Smart City Expo Barcelona)',
      'Sinaida’s TouchDesigner and GLSL pipeline, proven live with Redkie Ptitsy',
    ],
    need: [
      'A confirmed brief and venue or booth specification for each new project',
      'Local production and build crew, and AV hardware, sourced per project',
    ],
  },
  risks: [
    { risk: 'Interactive system installed on unfamiliar venue hardware or conditions', level: 'Medium', mitigation: 'On-site testing scheduled ahead of doors-open, not assumed to work first time cold' },
    { risk: 'Two-city coordination (Prague / Valencia) slows decisions', level: 'Low', mitigation: 'Single integrated brief and shared timeline from project start, not sequential handoffs' },
    { risk: 'First joint delivery as a combined team', level: 'Low', mitigation: 'Scope is split cleanly by domain, structure versus interactive system, each partner accountable for their own delivery' },
  ],
  market: {
    heading: 'Market',
    paragraphs: [
      'Interactive technology in exhibition and event spaces is still early in adoption compared to broadcast or gaming. Booth designers rarely have in-house real-time system capability. Motion and AV studios rarely have spatial or structural design capability. That gap is the space this team is built to work in.',
    ],
  },
  businessModel: {
    heading: 'How we work',
    paragraphs: [
      'Every project is scoped and quoted individually. Structure and interactive-system work can be quoted together as one proposal, or broken out by domain where useful. Fee is on request.',
    ],
  },
  nextSteps: {
    heading: 'Next steps',
    paragraphs: [
      'Reply by email to set up a short call.',
    ],
  },
};
