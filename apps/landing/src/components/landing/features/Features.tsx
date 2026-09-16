import { FEATURES } from "@/data/features";
import { Container } from "@/components/common/Container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { StaggerGroup, StaggerItem } from "@/components/common/StaggerGroup";
import { FeatureCard } from "./FeatureCard";
import { FeaturedCard } from "./FeaturedCard";

export function Features() {
  const featured = FEATURES.find((f) => f.featured);
  const regular = FEATURES.filter((f) => !f.featured);

  return (
    <section id="features" className="py-[60px] sm:py-[80px] lg:py-[100px]">
      <Container>
        <div className="mb-10 grid gap-8 sm:mb-15 sm:gap-15 lg:grid-cols-2 lg:items-end">
          <ScrollReveal>
            <SectionHeading
              label="Platform Features"
              title="Built for real classrooms, real challenges"
            />
          </ScrollReveal>
          <ScrollReveal delay={0.1}>
            <p className="max-w-[560px] text-base leading-[1.75] text-muted">
              Every feature on Bluethub is designed around how African schools actually
              operate — including unstable internet, large classrooms, and parent
              involvement.
            </p>
          </ScrollReveal>
        </div>

        <StaggerGroup className="grid gap-6 md:grid-cols-2" staggerDelay={0.12}>
          {/* Featured card — spans full width */}
          {featured && (
            <StaggerItem className="md:col-span-2">
              <FeaturedCard feature={featured} />
            </StaggerItem>
          )}

          {/* Regular cards */}
          {regular.map((feature) => (
            <StaggerItem key={feature.id}>
              <FeatureCard feature={feature} />
            </StaggerItem>
          ))}
        </StaggerGroup>
      </Container>
    </section>
  );
}
