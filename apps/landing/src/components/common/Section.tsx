import { cn } from "@/lib/utils";
import { Container } from "./Container";

type Tone = "plain" | "tint" | "ink";

interface SectionProps {
  id?: string;
  tone?: Tone;
  /** id of the heading that names this section, for screen readers. */
  labelledBy?: string;
  className?: string;
  containerClassName?: string;
  children: React.ReactNode;
}

const toneCls: Record<Tone, string> = {
  plain: "bg-background",
  tint: "bg-tint",
  ink: "bg-ink text-ink-foreground",
};

/** Page section with the shared vertical rhythm and an alternating surface. */
export function Section({ id, tone = "plain", labelledBy, className, containerClassName, children }: SectionProps) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={cn("section-y relative", toneCls[tone], tone !== "ink" && "border-t border-border", className)}
    >
      <Container className={containerClassName}>{children}</Container>
    </section>
  );
}
