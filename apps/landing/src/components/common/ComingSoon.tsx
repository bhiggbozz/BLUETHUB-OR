import { Badge } from "@bluethub/ui-kit/components/ui/badge";
import { cn } from "@/lib/utils";

/** "Coming soon" tag on the shared shadcn Badge, in the warm highlight colour. */
export function ComingSoon({ className, children = "Coming soon" }: { className?: string; children?: React.ReactNode }) {
  return (
    <Badge
      variant="outline"
      className={cn("border-highlight/40 bg-highlight-soft font-semibold text-highlight-text", className)}
    >
      {children}
    </Badge>
  );
}
