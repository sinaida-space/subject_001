import { useEffect, useRef, useState, useCallback } from 'react';

const SERVICES = [
  {
    code: 'SRV.001',
    title: 'Immersive Visuals',
    description: 'Visual systems for event spaces, stages, exhibitions, and projection mapping. Interactive and realtime environments.',
  },
  {
    code: 'SRV.002',
    title: 'Creative Direction',
    description: 'Developing consistent visual languages across video, static media, and interactive installations.',
  },
  {
    code: 'SRV.003',
    title: 'Digital Art',
    description: 'Custom audio-reactive and data-driven procedural animations for performances and curated environments.',
  },
  {
    code: 'SRV.004',
    title: 'Conceptual Storytelling',
    description: 'Translating complex philosophical and ethical themes into compelling visual narratives.',
  },
];

const GLITCH_CHARS = '█▓▒░⣿⠿╗╔║═';
const SEPARATOR = '────────────────────────────────────────────';

function splitDescription(desc: string, maxLen = 58): string[] {
  const words = desc.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if (current.length + word.length + 1 > maxLen && current) {
      lines.push(current);
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

function useTypingSequence(
  lines: { text: string; speed: number; preDelay?: number; type: 'type' | 'fill' | 'instant' }[],
  active: boolean,
  onNameTyped?: () => void,
  nameLineIndex?: number
) {
  const [outputs, setOutputs] = useState<string[]>([]);
  const [currentLine, setCurrentLine] = useState(-1);
  const [done, setDone] = useState(false);
  const cancelled = useRef(false);

  const reset = useCallback(() => {
    cancelled.current = true;
    setOutputs([]);
    setCurrentLine(-1);
    setDone(false);
  }, []);

  useEffect(() => {
    if (!active) return;
    cancelled.current = false;

    let timeouts: ReturnType<typeof setTimeout>[] = [];

    async function run() {
      for (let i = 0; i < lines.length; i++) {
        if (cancelled.current) return;
        const line = lines[i];

        // pre-delay
        if (line.preDelay) {
          await new Promise<void>(r => {
            const t = setTimeout(r, line.preDelay);
            timeouts.push(t);
          });
        }
        if (cancelled.current) return;

        setCurrentLine(i);

        if (line.type === 'instant') {
          setOutputs(prev => {
            const next = [...prev];
            next[i] = line.text;
            return next;
          });
        } else if (line.type === 'type') {
          for (let c = 0; c <= line.text.length; c++) {
            if (cancelled.current) return;
            const charIndex = c;
            await new Promise<void>(r => {
              const t = setTimeout(() => {
                setOutputs(prev => {
                  const next = [...prev];
                  next[i] = line.text.slice(0, charIndex);
                  return next;
                });
                r();
              }, line.speed);
              timeouts.push(t);
            });
          }
          if (i === nameLineIndex && onNameTyped) {
            onNameTyped();
          }
        } else if (line.type === 'fill') {
          const total = 10;
          for (let f = 0; f <= total; f++) {
            if (cancelled.current) return;
            const fillCount = f;
            await new Promise<void>(r => {
              const t = setTimeout(() => {
                const filled = '█'.repeat(fillCount) + '░'.repeat(total - fillCount);
                setOutputs(prev => {
                  const next = [...prev];
                  next[i] = filled;
                  return next;
                });
                r();
              }, 60);
              timeouts.push(t);
            });
          }
        }
      }
      if (!cancelled.current) setDone(true);
    }

    run();
    return () => {
      cancelled.current = true;
      timeouts.forEach(clearTimeout);
    };
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  return { outputs, currentLine, done, reset };
}

function ServiceBlock({
  service,
  active,
  onDone,
}: {
  service: typeof SERVICES[0];
  active: boolean;
  onDone: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [glitchName, setGlitchName] = useState<string | null>(null);
  const [evaporated, setEvaporated] = useState(false);
  const [evaporating, setEvaporating] = useState(false);
  const descLines = splitDescription(service.description);

  const lines = [
    { text: `$ load_module --id=${service.code} --name="${service.title}"`, speed: 12, type: 'type' as const },
    { text: '> initializing...', speed: 8, type: 'type' as const, preDelay: 30 },
    { text: 'fill', speed: 25, type: 'fill' as const, preDelay: 30 },
    ...descLines.map((l, i) => ({
      text: `  │ ${l}`,
      speed: 8,
      type: 'type' as const,
      preDelay: i === 0 ? 30 : 0,
    })),
    { text: '> module loaded.', speed: 0, type: 'instant' as const, preDelay: 60 },
  ];

  const handleNameTyped = useCallback(() => {
    const name = service.title;
    let glitchCount = 0;
    const glitchInterval = setInterval(() => {
      if (glitchCount >= 3) {
        clearInterval(glitchInterval);
        setGlitchName(null);
        return;
      }
      const chars = name.split('');
      const numReplace = 2 + Math.floor(Math.random() * 3);
      for (let i = 0; i < numReplace; i++) {
        const idx = Math.floor(Math.random() * chars.length);
        chars[idx] = GLITCH_CHARS[Math.floor(Math.random() * GLITCH_CHARS.length)];
      }
      setGlitchName(chars.join(''));
      setTimeout(() => setGlitchName(null), 60);
      glitchCount++;
    }, 130);
  }, [service.title]);

  const { outputs, done } = useTypingSequence(lines, active, handleNameTyped, 0);

  useEffect(() => {
    if (done) {
      onDone();
      // Start evaporation after 3 seconds
      const t = setTimeout(() => {
        setEvaporating(true);
        // After animation completes, hide terminal chrome
        const t2 = setTimeout(() => setEvaporated(true), 800);
        return () => clearTimeout(t2);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [done, onDone]);

  if (!active && outputs.length === 0) return null;

  const commandLine = outputs[0] ?? '';
  const displayCommand = glitchName
    ? commandLine.replace(`--name="${service.title}"`, `--name="${glitchName}"`)
    : commandLine;

  // After evaporation, show only the clean content
  if (evaporated) {
    return (
      <div
        className={`transition-all duration-200 font-mono text-sm leading-relaxed ${hovered ? 'translate-x-2' : ''}`}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          borderBottom: hovered ? '1px solid #00e5ff' : '1px solid transparent',
          paddingBottom: '1rem',
          marginBottom: '0.5rem',
        }}
      >
        <h3 className="font-mono text-base font-medium mb-2" style={{ color: '#00e5ff' }}>
          {service.title}
        </h3>
        {descLines.map((line, i) => (
          <div key={i} className="font-mono text-[13px]" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {`  │ ${line}`}
          </div>
        ))}
        {hovered && (
          <span className="animate-terminal-cursor" style={{ color: '#00e5ff' }}>{`> _`}</span>
        )}
      </div>
    );
  }

  const chromeOpacity = evaporating ? 0 : 1;
  const chromeFilter = evaporating ? 'blur(8px)' : 'none';

  return (
    <div
      className={`transition-all duration-200 font-mono text-sm leading-relaxed ${hovered && done ? 'translate-x-2' : ''}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        borderBottom: hovered && done ? '1px solid #00e5ff' : '1px solid transparent',
        paddingBottom: '1rem',
        marginBottom: '0.5rem',
      }}
    >
      {/* Line 1: command */}
      <div
        className="whitespace-pre-wrap"
        style={{
          color: '#00e5ff',
          textShadow: glitchName ? '2px 0 #ff0000, -2px 0 #00ffff' : 'none',
          opacity: chromeOpacity,
          filter: chromeFilter,
          transition: 'opacity 0.8s ease-out, filter 0.8s ease-out',
        }}
      >
        {displayCommand}
        {outputs[0] !== undefined && !done && outputs.length === 1 && (
          <span className="animate-terminal-cursor">█</span>
        )}
      </div>

      {/* Line 2: initializing */}
      {outputs[1] !== undefined && (
        <div style={{
          color: 'rgba(255,255,255,0.5)',
          opacity: chromeOpacity,
          filter: chromeFilter,
          transition: 'opacity 0.8s ease-out, filter 0.8s ease-out',
        }}>{outputs[1]}</div>
      )}

      {/* Line 3: progress bar */}
      {outputs[2] !== undefined && (
        <div style={{
          opacity: chromeOpacity,
          filter: chromeFilter,
          transition: 'opacity 0.8s ease-out, filter 0.8s ease-out',
        }}>
          <span style={{ color: '#ff3333' }}>{`> STATUS: ACTIVE `}</span>
          <span style={{ color: '#00ff88' }}>{outputs[2]}</span>
          <span style={{ color: 'rgba(255,255,255,0.5)' }}> 100%</span>
        </div>
      )}

      {/* Description lines */}
      {descLines.map((_, i) => {
        const idx = 3 + i;
        if (outputs[idx] === undefined) return null;
        return (
          <div key={i} className="font-mono text-[13px]" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {outputs[idx]}
          </div>
        );
      })}

      {/* Module loaded */}
      {outputs[lines.length - 1] !== undefined && (
        <div style={{
          color: '#00e5ff',
          opacity: evaporating ? 0 : 0.4,
          filter: chromeFilter,
          transition: 'opacity 0.8s ease-out, filter 0.8s ease-out',
        }}>{outputs[lines.length - 1]}</div>
      )}

      {/* Hover blinking cursor */}
      {hovered && done && !evaporating && (
        <span className="animate-terminal-cursor" style={{ color: '#00e5ff' }}>{`> _`}</span>
      )}
    </div>
  );
}

export default function ServicesTerminal() {
  const sectionRef = useRef<HTMLElement>(null);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [key, setKey] = useState(0);
  const [skipAnimation, setSkipAnimation] = useState(false);
  const hasPlayedRef = useRef(false);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    // Check if user is NOT at the top on mount — if so, skip animation
    if (window.scrollY > 200) {
      setSkipAnimation(true);
      setActiveIndex(SERVICES.length - 1);
      hasPlayedRef.current = true;
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasPlayedRef.current) {
          hasPlayedRef.current = true;
          setKey(k => k + 1);
          setActiveIndex(0);
        }
      },
      { threshold: 0.15 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleServiceDone = useCallback((index: number) => {
    if (index < SERVICES.length - 1) {
      setActiveIndex(index + 1);
    }
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative z-10 py-24"
    >
      <div className="container mx-auto px-6 max-w-7xl">
        <div className="flex flex-col md:flex-row gap-8 md:gap-12">
          {/* LEFT COLUMN */}
          <div className="md:w-[200px] shrink-0 md:sticky md:top-[15vh] md:self-start">
            <div
              className="font-mono uppercase text-primary"
              style={{ letterSpacing: '0.2em', fontSize: 12 }}
            >
              Services
            </div>
            <div
              className="font-mono mt-2"
              style={{ color: 'rgba(255,255,255,0.4)', fontSize: 12 }}
            >
              [ VALUE // ACTIVE ]
            </div>
          </div>

          {/* RIGHT COLUMN */}
          <div className="flex-1 font-mono">
          {/* Terminal header */}
          <div style={{ opacity: 0.35 }} className="text-sm mb-8 leading-relaxed">
            <div>{`SINAIDA_OS v2.4.1 — CREATIVE SYSTEMS TERMINAL`}</div>
            <div>{`Loading service modules... [████████████] 100%`}</div>
            <div>{`4 modules active. Type index to expand.`}</div>
          </div>

          {/* Service blocks */}
          <div key={key} className="space-y-2">
            {SERVICES.map((service, i) => (
              <div key={service.code}>
                <ServiceBlock
                  service={service}
                  active={activeIndex >= i}
                  onDone={() => handleServiceDone(i)}
                />
                {i < SERVICES.length - 1 && activeIndex > i && (
                  <div className="my-4 font-mono text-sm" style={{ opacity: 0.12 }}>
                    {SEPARATOR}
                  </div>
                )}
              </div>
            ))}
          </div>
          </div>
        </div>
      </div>
    </section>
  );
