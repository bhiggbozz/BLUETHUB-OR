import { Navbar } from "@/components/landing/navbar/Navbar";
import { Hero } from "@/components/landing/hero/Hero";
import { Services } from "@/components/landing/services/Services";
import { Products } from "@/components/landing/products/Products";
import { HowItWorks } from "@/components/landing/how-it-works/HowItWorks";
import { Proof } from "@/components/landing/proof/Proof";
import { About } from "@/components/landing/about/About";
import { Contact } from "@/components/landing/contact/Contact";
import { Footer } from "@/components/landing/footer/Footer";
// Pricing is parked for now. To bring it back, uncomment the import and the
// <Pricing /> line below, then add { label: "Pricing", href: "#pricing" } to NAV_LINKS.
// import { Pricing } from "@/components/landing/pricing/Pricing";

export default function LandingPage() {
  return (
    <>
      <Navbar />
      <main id="main" tabIndex={-1} className="outline-none">
        <Hero />
        <Services />
        <Products />
        <HowItWorks />
        <Proof />
        <About />
        {/* <Pricing /> */}
        <Contact />
      </main>
      <Footer />
    </>
  );
}
