import { useEffect, useState } from "react";
import { Navbar } from "@/components/landing/navbar/Navbar";
import { Hero } from "@/components/landing/sections/Hero";
import { Problem } from "@/components/landing/sections/Problem";
import { Solution } from "@/components/landing/sections/Solution";
import { Features } from "@/components/landing/sections/Features";
import { Roadmap } from "@/components/landing/sections/Roadmap";
import { HowItWorks } from "@/components/landing/sections/HowItWorks";
import { Results } from "@/components/landing/sections/Results";
import { Security } from "@/components/landing/sections/Security";
import { Pilot } from "@/components/landing/sections/Pilot";
import { Faq } from "@/components/landing/sections/Faq";
import { Demo } from "@/components/landing/sections/Demo";
import { Footer } from "@/components/landing/footer/Footer";
// Pricing is parked: the pilot offer replaces it for now. To restore, import
// "@/components/landing/pricing/Pricing" and render <Pricing /> after <Pilot />.

/**
 * First paint renders only what the first screen needs (hero + problem).
 * Everything below mounts in the browser's next idle period (at most ~1.2s
 * later), which splits one long main-thread task into two short ones.
 * If the URL already targets a section (e.g. /#demo), mount everything at once
 * so the browser can scroll straight to it.
 */
function useBelowFoldReady() {
  const [ready, setReady] = useState(() => {
    const hash = typeof window !== "undefined" ? window.location.hash : "";
    return hash.length > 1 && hash !== "#main";
  });

  useEffect(() => {
    if (ready) return;
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
      cancelIdleCallback?: (id: number) => void;
    };
    if (w.requestIdleCallback) {
      const id = w.requestIdleCallback(() => setReady(true), { timeout: 1200 });
      return () => w.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(() => setReady(true), 200);
    return () => window.clearTimeout(id);
  }, [ready]);

  // Once mounted, honour an in-page hash the user may have followed meanwhile.
  useEffect(() => {
    if (!ready || window.location.hash.length < 2) return;
    document.getElementById(window.location.hash.slice(1))?.scrollIntoView();
  }, [ready]);

  return ready;
}

export default function LandingPage() {
  const ready = useBelowFoldReady();

  return (
    <>
      <Navbar />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <Problem />
        {ready ? (
          <>
            <Solution />
            <Features />
            <Roadmap />
            <HowItWorks />
            <Results />
            <Security />
            <Pilot />
            <Faq />
            <Demo />
          </>
        ) : (
          // Reserve space below the fold so nothing above can move when it mounts.
          <div aria-hidden className="min-h-[200vh]" />
        )}
      </main>
      {ready && <Footer />}
    </>
  );
}
