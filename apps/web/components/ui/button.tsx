import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "success"
  | "cta";

export type ButtonSize = "sm" | "default" | "lg" | "icon" | "icon-sm";

export const buttonVariants: Record<ButtonVariant, string> = {
  default:
    "border border-primary bg-primary text-primary-foreground hover:bg-primary/90",
  secondary:
    "border border-border bg-secondary text-secondary-foreground hover:bg-secondary/70",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-accent",
  ghost:
    "border border-transparent bg-transparent text-muted-foreground hover:bg-muted hover:text-foreground",
  destructive:
    "border border-danger bg-danger text-danger-foreground hover:bg-danger/90",
  success:
    "border border-success-border bg-success-background text-success hover:border-success",
  cta: "bg-cta text-white hover:bg-cta/90",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-7 px-2.5 text-xs",
  default: "h-8 px-4 text-sm",
  lg: "h-9 px-5 text-sm",
  icon: "size-8 p-0",
  "icon-sm": "size-7 p-0",
};

const base =
  "inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-[500] transition-all duration-120 ease-out active:translate-y-px focus-visible:border-ring focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

function hasInlineStartIcon(children: React.ReactNode): boolean {
  return React.Children.toArray(children).some(
    (child) =>
      React.isValidElement(child) &&
      (child.props as { "data-icon"?: string })["data-icon"] === "inline-start",
  );
}

export function buttonClassName(variant: ButtonVariant = "default", size: ButtonSize = "default") {
  return `${base} ${buttonVariants[variant]} ${sizes[size]}`;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type, children, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        buttonClassName(variant, size),
        hasInlineStartIcon(children) && "pl-2",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  ),
);
Button.displayName = "Button";
