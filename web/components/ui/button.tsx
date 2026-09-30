import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger";
type Size = "sm" | "md" | "icon" | "icon-sm";

const variants: Record<Variant, string> = {
  primary: "btn-primary bg-accent text-accent-fg shadow-card",
  secondary: "bg-muted text-fg hover:bg-border",
  outline: "border border-border bg-surface text-fg hover:bg-surface-2 hover:border-border-strong shadow-card",
  ghost: "text-fg-muted hover:bg-muted hover:text-fg",
  danger: "bg-bad text-white hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 pointer-coarse:h-11",
  md: "h-9 px-4 text-sm gap-2 pointer-coarse:h-11",
  icon: "h-9 w-9 pointer-coarse:size-11",
  "icon-sm": "h-8 w-8 pointer-coarse:size-11",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button({ className, variant = "outline", size = "md", ...props }, ref) {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors select-none disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  );
});

export function buttonClass(variant: Variant = "outline", size: Size = "md", className?: string) {
  return cn(
    "inline-flex shrink-0 items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors select-none [&_svg]:size-4 [&_svg]:shrink-0",
    variants[variant],
    sizes[size],
    className,
  );
}
