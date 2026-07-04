import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import Booking from "./pages/Booking";
import Press from "./pages/Press";
import WorkCase from "./pages/WorkCase";
import NotFound from "./pages/NotFound";
import { RenderModeProvider } from "@/hooks/useRenderMode";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <RenderModeProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename="/">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route path="/booking" element={<Booking />} />
            <Route path="/press" element={<Press />} />
            <Route path="/work/:slug" element={<WorkCase />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </RenderModeProvider>
  </QueryClientProvider>
);

export default App;
