import { cn } from "@/lib/utils";

/**
 * Phone treatment for product mockups. Below 640px the mockup keeps its
 * designed width (so its text stays legible) and is cropped on the right with a
 * soft fade, like a peek at the real screen. From 640px up it simply fills the
 * column.
 */
export function MockupViewport({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={cn(
        "max-sm:-mr-4 max-sm:overflow-hidden max-sm:pr-0",
        "max-sm:[mask-image:linear-gradient(to_right,black_78%,transparent)]",
        className,
      )}
    >
      <div className="max-sm:w-[34rem]">{children}</div>
    </div>
  );
}
