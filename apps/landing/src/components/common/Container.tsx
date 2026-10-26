import { cn } from "@/lib/utils";

interface ContainerProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

/** 1200px content column with 16 / 24 / 32px gutters. Pair with `grid-cols-12` inside. */
export function Container({ children, className, as: Component = "div" }: ContainerProps) {
  return (
    <Component className={cn("mx-auto w-full max-w-[75rem] px-4 sm:px-6 lg:px-8", className)}>{children}</Component>
  );
}
