import { forwardRef } from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "inkPrimary" | "inkSecondary";
export type ButtonSize = "md" | "lg";

const base =
  "group inline-flex items-center justify-center gap-2 whitespace-nowrap font-semibold no-underline " +
  "transition-[background-color,border-color,color,box-shadow] duration-200 ease-out " +
  "disabled:pointer-events-none disabled:opacity-50";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground shadow-soft hover:bg-primary-strong",
  secondary: "border border-border-strong bg-card text-heading hover:border-heading/40 hover:bg-tint",
  ghost: "text-primary hover:text-primary-strong underline-offset-4 hover:underline",
  inkPrimary: "bg-white text-navy-900 hover:bg-blue-50",
  inkSecondary: "border border-white/25 text-white hover:border-white/50 hover:bg-white/[0.06]",
};

const sizes: Record<ButtonSize, string> = {
  md: "h-11 rounded-md px-5 text-[0.9375rem]",
  lg: "h-12 rounded-md px-6 text-base",
};

/** Ghost buttons are text links: no fixed height or padding. */
const ghostSize = "h-auto px-0 text-[0.9375rem]";

interface CommonProps {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Adds a small arrow that nudges on hover. */
  arrow?: boolean;
}

function classes(variant: ButtonVariant, size: ButtonSize, className?: string) {
  return cn(base, variants[variant], variant === "ghost" ? ghostSize : sizes[size], className);
}

function Arrow() {
  return (
    <ArrowRight
      aria-hidden
      className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none"
    />
  );
}

export const ButtonLink = forwardRef<HTMLAnchorElement, React.AnchorHTMLAttributes<HTMLAnchorElement> & CommonProps>(
  function ButtonLink({ variant = "primary", size = "md", arrow, className, children, ...rest }, ref) {
    return (
      <a ref={ref} className={classes(variant, size, className)} {...rest}>
        {children}
        {arrow && <Arrow />}
      </a>
    );
  },
);

export const Button = forwardRef<HTMLButtonElement, React.ButtonHTMLAttributes<HTMLButtonElement> & CommonProps>(
  function Button({ variant = "primary", size = "md", arrow, className, children, type = "button", ...rest }, ref) {
    return (
      <button ref={ref} type={type} className={classes(variant, size, className)} {...rest}>
        {children}
        {arrow && <Arrow />}
      </button>
    );
  },
);
