import { lazy, Suspense, useState } from 'react';
import { usePageMeta } from '@/hooks/usePageMeta';
import { useRenderMode } from '@/hooks/useRenderMode';
import Header from '@/components/Header';
import ContactChannel from '@/components/ContactChannel';
import Footer from '@/components/Footer';
import Starway from '@/components/Starway';
import { BackLink, H1_CLASS, KICKER_CLASS, LEAD_CLASS, PAGE_MAIN_CLASS, RuledRows } from '@/components/PageParts';

const ParticleField = lazy(() => import('@/components/ParticleField'));

const MCP_URL = 'https://sinaida.eu/mcp';

/* The page for people about the site's second entrance: the MCP server in
   workers/agent-gateway. Kept short on purpose; the machines get the long
   version at /agent-api.md and /.well-known/mcp/server-card.json. */

function CopyAddress() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(MCP_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* Clipboard blocked: the address stays selectable as text. */
    }
  };
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <code className="select-all break-all text-foreground">{MCP_URL}</code>
      <button
        type="button"
        onClick={copy}
        className="clinical-label border border-foreground/30 px-3 py-1.5 text-foreground transition-colors hover:border-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-legible"
      >
        <span aria-live="polite">{copied ? 'Copied' : 'Copy'}</span>
      </button>
    </span>
  );
}

const Machines = () => {
  usePageMeta({
    title: 'For machines | Sinaida Krivchenko',
    description: 'This site has a second entrance for AI assistants: an MCP server that lets them read the work first hand.',
    canonical: 'https://sinaida.eu/machines/',
  });

  const { mode } = useRenderMode();

  return (
    <div className="relative min-h-screen bg-background">
      {mode === 'full' && (
        <Suspense fallback={null}>
          <ParticleField />
        </Suspense>
      )}
      <Header />
      <main id="main-content" tabIndex={-1} className={PAGE_MAIN_CLASS}>
        <BackLink />
        <div className={KICKER_CLASS}>MCP server</div>
        <h1 className={H1_CLASS}>For machines</h1>
        <p className={LEAD_CLASS}>
          The internet is now read by machines as much as by&nbsp;people. I build for that meeting point, so this site
          has a second entrance: an MCP server that lets AI assistants read my work first&nbsp;hand.
        </p>
        <RuledRows
          className="mt-16"
          rows={[
            {
              label: 'Address',
              value: <CopyAddress />,
              note: <>Add it as a connector in Claude, ChatGPT or any assistant that speaks MCP. No sign-in&nbsp;needed.</>,
            },
            { label: 'Read', value: <>My bio, works and contacts, straight from the&nbsp;source.</> },
            { label: 'Show', value: <>A gallery of my works inside the chat, with video and links to the live&nbsp;pieces.</> },
            {
              label: 'Portrait',
              value: <>A few words from your conversation, turned into a live portrait in my visual&nbsp;language.</>,
              note: (
                <a href="/portrait/" className="text-primary-legible underline underline-offset-4 transition-opacity hover:opacity-70">
                  Try it here
                </a>
              ),
            },
            {
              label: 'Starway',
              value: <>One star for each of the last ninety nights, brighter on nights with more calls to this server. The sky opens right in the&nbsp;chat.</>,
              note: (
                <a href="#starway" className="text-primary-legible underline underline-offset-4 transition-opacity hover:opacity-70">
                  Fly through it below
                </a>
              ),
            },
            { label: 'Skills', value: <>My open skills for agents, straight from&nbsp;GitHub.</> },
          ]}
        />
      </main>
      <Starway />
      <ContactChannel question={'Human? Let\u2019s\u00a0talk.'} />
      <Footer />
    </div>
  );
};

export default Machines;

