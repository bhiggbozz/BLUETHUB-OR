import { ArrowRight } from "lucide-react";
import { Button } from "@bluethub/ui-kit/components/ui/button";
import { cn } from "@/lib/utils";

type Tone = "primary" | "secondary" | "ghost" | "inkPrimary" | "inkSecondary";

const tone: Record<Tone, { variant: "default" | "outline" | "ghost" | "link"; cls: string }> = {
  primary: { variant: "default", cls: "shadow-soft hover:bg-primary-strong" },
  secondary: { variant: "outline", cls: "border-border-strong bg-card text-heading hover:bg-accent" },
  ghost: { variant: "link", cls: "h-auto px-0 text-primary has-[>svg]:px-0" },
  inkPrimary: { variant: "default", cls: "bg-white text-navy-900 hover:bg-blue-50" },
  inkSecondary: { variant: "outline", cls: "border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white dark:bg-transparent" },
};

interface CtaProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  tone?: Tone;
  size?: "md" | "lg";
  /** Arrow that slides right on hover. */
  arrow?: boolean;
}

/**
 * Call-to-action link built on the shared shadcn Button (packages/ui) via asChild,
 * sized up for a marketing page.
 */
export function Cta({ tone: t = "primary", size = "md", arrow, className, children, ...rest }: CtaProps) {
  const { variant, cls } = tone[t];
  return (
    <Button
      asChild
      variant={variant}
      className={cn(
        "group font-semibold",
        t !== "ghost" && (size === "lg" ? "h-12 px-6 text-base" : "h-11 px-5 text-[0.9375rem]"),
        cls,
        className,
      )}
    >
      <a {...rest}>
        {children}
        {arrow && <ArrowRight aria-hidden className="arrow-nudge size-4" />}
      </a>
    </Button>
  );
}
