import { COMPANY } from "@/data/home";
import { Confirm } from "@/components/common/Confirm";
import { Container } from "@/components/common/Container";
import { Cta } from "@/components/common/Cta";

/** The company first; Bluetsch, its product, follows in the hero below. */
export function Company() {
  return (
    <section aria-labelledby="company-title" className="border-b border-border bg-background">
      <Container className="pt-12 pb-10 md:pt-16 md:pb-14">
        <p className="eyebrow">{COMPANY.eyebrow}</p>
        <h1 id="company-title" className="text-display mt-4 max-w-[20ch]">
          {COMPANY.title}
        </h1>
        <p className="text-lede mt-5 measure">
          {COMPANY.lede}
          <Confirm note={COMPANY.confirm} />
        </p>
        <Cta href={COMPANY.action.href} size="lg" arrow className="mt-8 max-sm:w-full">
          {COMPANY.action.label}
        </Cta>
      </Container>
    </section>
  );
}
