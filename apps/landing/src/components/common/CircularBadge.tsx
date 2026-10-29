import { useId } from "react";
import { ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Rotate } from "./motion";

interface CircularBadgeProps {
  /** Text set around the ring. Repeat a phrase with separators so it fills the circle. */
  text: string;
  href: string;
  label: string;
  className?: string;
}

/** A link with slowly rotating circular text around a fixed arrow. Pauses off-screen. */
export function CircularBadge({ text, href, label, className }: CircularBadgeProps) {
  const id = useId().replace(/:/g, "");
  return (
    <a
      href={href}
      aria-label={label}
      className={cn(
        "group relative inline-flex size-28 shrink-0 items-center justify-center rounded-full text-heading",
        className,
      )}
    >
      <Rotate mode="badge" className="absolute inset-0">
        <svg viewBox="0 0 120 120" className="size-full">
          <defs>
            <path id={`ring-${id}`} d="M60,60 m-46,0 a46,46 0 1,1 92,0 a46,46 0 1,1 -92,0" />
          </defs>
          <text className="fill-current font-sans text-[10.5px] font-semibold uppercase">
            <textPath href={`#ring-${id}`} textLength="286" lengthAdjust="spacing">
              {text}
            </textPath>
          </text>
        </svg>
      </Rotate>
      <span className="relative inline-flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-soft transition-transform duration-200 ease-[var(--ease-out-soft)] group-hover:scale-105">
        <ArrowDownRight aria-hidden className="rotate-on-hover size-5" />
      </span>
    </a>
  );
}
