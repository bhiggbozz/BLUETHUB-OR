import { cn } from "@/lib/utils";
import { initialsOf } from "../../lib/format";

/** Deterministic hue per child, so siblings are easy to tell apart at a glance. */
const PALETTES = [
  ["#4b44e0", "#7c83ff"],
  ["#0e7490", "#22c3ee"],
  ["#7c3aed", "#c084fc"],
  ["#be185d", "#f472b6"],
  ["#047857", "#34d399"],
  ["#b45309", "#fbbf24"],
] as const;

function paletteFor(seed: string) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return PALETTES[h % PALETTES.length];
}

interface ChildAvatarProps {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeCls = {
  sm: "size-8 text-[11px] rounded-[10px]",
  md: "size-10 text-[13px] rounded-xl",
  lg: "size-14 text-[17px] rounded-2xl",
};

export function ChildAvatar({ id, firstName, lastName, size = "md", className }: ChildAvatarProps) {
  const [a, b] = paletteFor(id);
  return (
    <span
      aria-hidden
      className={cn(
        "pp-display inline-flex shrink-0 items-center justify-center font-semibold text-white",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_12px_-4px_rgba(16,18,43,0.35)]",
        sizeCls[size],
        className,
      )}
      style={{ background: `linear-gradient(140deg, ${a}, ${b})` }}
    >
      {initialsOf(firstName, lastName)}
    </span>
  );
}
