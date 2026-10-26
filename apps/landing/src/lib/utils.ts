import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge doesn't know our custom type utilities (index.css @utility),
 * so by default it treats e.g. `text-h2` and `text-ink-foreground` as the same
 * "text colour" group and drops one. Register them as font sizes instead.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "h1", "h2", "h3", "h4", "lede", "body", "caption"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
