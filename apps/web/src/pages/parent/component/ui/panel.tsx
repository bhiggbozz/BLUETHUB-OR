import type { HTMLAttributes, ReactNode } from "react";
import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";
import { fadeUp } from "./motion";

interface PanelProps extends HTMLMotionProps<"section"> {
  flat?: boolean;
}

/** The base surface. Participates in a parent `stagger` container automatically. */
export function Panel({ flat, className, children, ...rest }: PanelProps) {
  return (
    <motion.section variants={fadeUp} className={cn(flat ? "pp-surface-flat" : "pp-surface", className)} {...rest}>
      {children}
    </motion.section>
  );
}

interface PanelHeaderProps extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  eyebrow?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
}

export function PanelHeader({ title, eyebrow, description, action, icon, className, ...rest }: PanelHeaderProps) {
  return (
    <div className={cn("flex items-start justify-between gap-3 px-5 pt-5 sm:px-6 sm:pt-6", className)} {...rest}>
      <div className="flex min-w-0 items-start gap-3">
        {icon && (
          <span className="mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-(--pp-iris-soft) text-(--pp-iris)">
            {icon}
          </span>
        )}
        <div className="min-w-0">
          {eyebrow && <p className="pp-eyebrow mb-1">{eyebrow}</p>}
          <h2 className="pp-display text-[17px] font-semibold leading-6 text-(--pp-text)">{title}</h2>
          {description && <p className="mt-1 text-[13px] leading-5 text-(--pp-muted)">{description}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

interface PageHeaderProps {
  eyebrow?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ eyebrow, title, description, actions }: PageHeaderProps) {
  return (
    <motion.header variants={fadeUp} className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="pp-eyebrow mb-2">{eyebrow}</p>}
        <h1 className="pp-display text-[28px] font-semibold leading-[1.1] text-(--pp-text) sm:text-[34px]">{title}</h1>
        {description && (
          <p className="mt-2 max-w-xl text-[14px] leading-6 text-(--pp-muted) sm:text-[15px]">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </motion.header>
  );
}
