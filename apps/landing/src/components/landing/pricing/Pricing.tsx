// Parked: not rendered on the site right now (see pages/LandingPage.tsx).
// The tiers in data/pricing.ts describe the school platform and need review before re-enabling.
import { PRICING_TIERS } from "@/data/pricing";
import { Reveal } from "@/components/common/Reveal";
import { Section } from "@/components/common/Section";
import { SectionHeader } from "@/components/common/SectionHeader";
import { PricingCard } from "./PricingCard";

export function Pricing() {
  return (
    <Section id="pricing" tone="tint" labelledBy="pricing-title">
      <SectionHeader
        id="pricing-title"
        eyebrow="Pricing"
        title="Simple, school-friendly pricing"
        lede="No hidden charges. Start free and scale as your school grows."
      />
      <div className="grid gap-6 md:grid-cols-3">
        {PRICING_TIERS.map((tier, i) => (
          <Reveal key={tier.name} delay={i * 0.06}>
            <PricingCard tier={tier} />
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
