import { Suspense, lazy, useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Index from "./pages/Index";
import CustomCursor from "@/components/CustomCursor";
import { RenderModeProvider, useRenderMode } from "@/hooks/useRenderMode";

const PrivacyPolicy = lazy(() => import("./pages/PrivacyPolicy"));
const Collaborate = lazy(() => import("./pages/Collaborate"));
const WorkCase = lazy(() => import("./pages/WorkCase"));
const NotFound = lazy(() => import("./pages/NotFound"));

const RouteFallback = () => (
  <div className="min-h-screen bg-background" aria-hidden="true" />
);

// Site-wide, not per-page — every route gets the custom cursor (previously it
// only existed on Index/NotFound, so it silently vanished on every other page).
const SiteCursor = () => {
  const { mode } = useRenderMode();
  return mode === 'full' ? <CustomCursor /> : null;
};

// A route change (e.g. clicking "View full case study") should land at the
// top of the new page — the browser otherwise keeps whatever scroll offset
// the previous page was at. Only fires on pathname change, not on in-page
// hash navigation (Index handles its own #section scrolling).
const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
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
      <SiteCursor />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/privacy" element={<PrivacyPolicy />} />
          <Route path="/collaborate" element={<Collaborate />} />
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
