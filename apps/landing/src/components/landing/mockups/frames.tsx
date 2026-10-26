import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Device frames for product mockups. Mockups mirror the real apps/web screens
 * (labels, layout, the app's #292382 indigo) and stay light in both site themes,
 * the way a screenshot would.
 */

export const APP = {
  indigo: "#292382",
  ink: "#12122A",
} as const;

interface BrowserFrameProps {
  /** Path after the school's subdomain, e.g. "/admin". */
  path: string;
  label: string;
  className?: string;
  children: React.ReactNode;
}

export function BrowserFrame({ path, label, className, children }: BrowserFrameProps) {
  return (
    <figure
      role="img"
      aria-label={label}
      className={cn("overflow-hidden rounded-lg border border-black/10 bg-white text-[#12122A] shadow-float", className)}
    >
      <div aria-hidden className="flex items-center gap-3 border-b border-black/[0.07] bg-[#f4f5f9] px-3 py-2.5">
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-[#ff5f57]" />
          <span className="size-2.5 rounded-full bg-[#febc2e]" />
          <span className="size-2.5 rounded-full bg-[#28c840]" />
        </span>
        <span className="mx-auto flex min-w-0 max-w-[70%] items-center gap-1.5 truncate rounded-md bg-white px-3 py-1 text-[10px] text-slate-500 ring-1 ring-black/5">
          <Lock className="size-2.5 shrink-0" />
          <span className="truncate">yourschool.bluethub.com{path}</span>
        </span>
        <span className="w-10" />
      </div>
      <div aria-hidden className="pointer-events-none select-none">
        {children}
      </div>
    </figure>
  );
}

export function PhoneFrame({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <figure
      role="img"
      aria-label={label}
      className={cn("w-[230px] rounded-[2rem] bg-[#0b0d1f] p-2 shadow-float ring-1 ring-black/20", className)}
    >
      <div aria-hidden className="pointer-events-none relative overflow-hidden rounded-[1.6rem] bg-white text-[#12122A] select-none">
        <div className="absolute top-1.5 left-1/2 z-10 h-4 w-16 -translate-x-1/2 rounded-full bg-[#0b0d1f]" />
        {children}
      </div>
    </figure>
  );
}
