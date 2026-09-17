import { BAND_PILLS } from "@/data/navigation";
import { Container } from "@/components/common/Container";
import { Rocket } from "lucide-react";

export function ComingSoonBand() {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-navy-900 to-blue-800 py-4 sm:py-5">
      {/* Glow decoration */}
      <div className="pointer-events-none absolute -top-10 -right-20 size-[200px] rounded-full bg-blue-500/15" />

      <Container className="relative z-10 flex flex-col items-center gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-5">
        <span className="shrink-0 rounded-full bg-accent-500 px-3 py-1 text-[10px] font-extrabold uppercase tracking-wider text-navy-900">
          🌱 Coming soon
        </span>
        <span className="text-center text-sm text-white/80 sm:text-left">
          More powerful modules are on the way for Bluethub
        </span>
        <div className="flex flex-wrap justify-center gap-2.5 sm:ml-auto">
          {BAND_PILLS.map((pill) => (
            <span
              key={pill}
              className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/[0.08] px-3.5 py-[5px] text-xs font-medium text-white/75"
            >
              <Rocket className="size-3" />
              {pill}
            </span>
          ))}
        </div>
      </Container>
    </div>
  );
}
