import { Suspense, lazy, useEffect, useLayoutEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import CustomCursor from "@/components/CustomCursor";
import WebMcpTools from "@/components/WebMcpTools";
import RouteEnhancer from "@/components/RouteEnhancer";
import DiveHost from "@/components/dive/DiveHost";
import { RenderModeProvider, useRenderMode } from "@/hooks/useRenderMode";
import { routeChunks } from "@/lib/routeChunks";
import { startHalation } from "@/lib/halation";

const PrivacyPolicy = lazy(routeChunks.privacy);
const Licensing = lazy(routeChunks.licensing);
const Collaborate = lazy(routeChunks.collaborate);
const Experiences = lazy(routeChunks.experiences);
const Statement = lazy(routeChunks.statement);
const WorkCase = lazy(routeChunks.work);
const NotFound = lazy(routeChunks.notFound);

const RouteFallback = () => (
  <div className="min-h-screen bg-background" aria-hidden="true" />
);

// Full mode only: the red halation on large display headlines. Idle at rest.
const SiteLight = () => {
  const { mode } = useRenderMode();
  useEffect(() => {
    if (mode !== 'full') return;
    return startHalation();
  }, [mode]);
  return null;
};

// A route change (e.g. clicking "View full case study") should land at the
// top of the new page — the browser otherwise keeps whatever scroll offset
// the previous page was at. Only fires on pathname change, not on in-page
// hash navigation (Index handles its own #section scrolling).
const ScrollToTop = () => {
  const { pathname } = useLocation();
  // Layout effect, so the reset lands before paint and inside a view
  // transition's update (see RouteEnhancer) rather than after the snapshot.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

const App = () => (
  <RenderModeProvider>
    <BrowserRouter basename="/">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[100] focus:bg-background focus:text-primary-legible focus:border focus:border-primary focus:px-4 focus:py-2 focus:font-mono focus:uppercase focus:text-sm focus:tracking-widest"
      >
        Skip to content
      </a>
      <ScrollToTop />
      <RouteEnhancer />
      <DiveHost />
      {/* site-wide, every route: the red arrow in both modes, on Void and on Chalk (#175) */}
      <CustomCursor />
      <SiteLight />
      <WebMcpTools />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/licensing" element={<Licensing />} />
          <Route path="/license" element={<Navigate to="/licensing" replace />} />
          <Route path="/collaborate" element={<Collaborate />} />
          <Route path="/experiences" element={<Experiences />} />
          <Route path="/statement" element={<Statement />} />
          {/* Old routes live in shared links and search results — keep redirecting */}
          <Route path="/booking" element={<Navigate to="/collaborate" replace />} />
          <Route path="/press" element={<Navigate to="/collaborate" replace />} />
          <Route path="/work/:slug" element={<WorkCase />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </RenderModeProvider>
);

export default App;
