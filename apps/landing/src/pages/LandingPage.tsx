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

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <Problem />
        <Solution />
        <Features />
        <Roadmap />
        <HowItWorks />
        <Results />
        <Security />
        <Pilot />
        <Faq />
        <Demo />
      </main>
      <Footer />
    </>
  );
}
