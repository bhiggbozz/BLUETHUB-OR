import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger" | "glass";
export type ButtonSize = "sm" | "md" | "lg";

const variantCls: Record<ButtonVariant, string> = {
  primary:
    "bg-(--pp-solid) text-(--pp-solid-fg) shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_6px_16px_-6px_rgba(11,13,31,0.5)] hover:bg-(--pp-solid-hover)",
  secondary:
    "bg-(--pp-surface) text-(--pp-text) border border-(--pp-line) shadow-(--pp-shadow-sm) hover:border-(--pp-line-strong) hover:bg-(--pp-sunken)",
  ghost: "text-(--pp-muted) hover:text-(--pp-text) hover:bg-(--pp-text)/5",
  danger: "bg-(--pp-absent) text-white hover:brightness-110 shadow-[0_6px_16px_-6px_rgba(214,31,75,0.55)]",
  glass: "bg-white/10 text-white border border-white/15 hover:bg-white/15 backdrop-blur-sm",
};

const sizeCls: Record<ButtonSize, string> = {
  sm: "h-9 px-3 text-[13px] gap-1.5 rounded-[10px]",
  md: "h-11 px-4 text-sm gap-2 rounded-xl",
  lg: "h-12 px-5 text-[15px] gap-2 rounded-xl",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  icon?: ReactNode;
  trailing?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", loading, icon, trailing, className, children, disabled, type = "button", ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        "inline-flex select-none items-center justify-center font-semibold whitespace-nowrap",
        "transition-[background-color,border-color,color,transform,filter] duration-150 active:scale-[0.98]",
        "disabled:cursor-not-allowed disabled:opacity-45 disabled:active:scale-100",
        variantCls[variant],
        sizeCls[size],
        className,
      )}
      {...rest}
    >
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : icon}
      {children}
      {trailing}
    </button>
  );
});

export const IconButton = forwardRef<HTMLButtonElement, ButtonHTMLAttributes<HTMLButtonElement> & { label: string }>(
  function IconButton({ label, className, children, type = "button", ...rest }, ref) {
    return (
      <button
        ref={ref}
        type={type}
        aria-label={label}
        title={label}
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-xl text-(--pp-muted) transition-colors",
          "hover:bg-(--pp-text)/5 hover:text-(--pp-text) active:scale-95",
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);
