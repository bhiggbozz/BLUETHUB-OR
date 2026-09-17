import { ROLES } from "@/data/roles";
import { Container } from "@/components/common/Container";
import { SectionHeading } from "@/components/common/SectionHeading";
import { ScrollReveal } from "@/components/common/ScrollReveal";
import { StaggerGroup, StaggerItem } from "@/components/common/StaggerGroup";
import { RoleCard } from "./RoleCard";
import { AdminBanner } from "./AdminBanner";

export function Roles() {
  return (
    <section id="roles" className="bg-surface-white py-[60px] sm:py-[80px] lg:py-[100px] dark:bg-navy-600">
      <Container>
        <ScrollReveal>
          <SectionHeading
            label="Who it's for"
            title="One platform, every role"
            subtitle="Bluethub is designed so each user gets exactly the experience they need — whether checking grades or uploading content."
          />
        </ScrollReveal>

        <StaggerGroup className="grid gap-6 md:grid-cols-3" staggerDelay={0.12}>
          {ROLES.map((role) => (
            <StaggerItem key={role.id}>
              <RoleCard role={role} />
            </StaggerItem>
          ))}
        </StaggerGroup>

        <ScrollReveal delay={0.3} className="mt-6">
          <AdminBanner />
        </ScrollReveal>
      </Container>
    </section>
  );
}
