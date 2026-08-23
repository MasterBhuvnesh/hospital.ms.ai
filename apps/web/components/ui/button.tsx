import * as React from "react";
import { cn } from "@/lib/utils";

export type ButtonVariant =
  | "default"
  | "secondary"
  | "outline"
  | "ghost"
  | "destructive"
  | "success";

export type ButtonSize = "sm" | "default" | "lg" | "icon";

export const buttonVariants: Record<ButtonVariant, string> = {
  default:
    "border border-primary bg-primary text-primary-foreground hover:bg-primary/90",
  secondary:
    "border border-border bg-secondary text-secondary-foreground hover:bg-secondary/70",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-surface-muted",
  ghost:
    "border border-transparent bg-transparent text-muted-foreground hover:bg-surface-muted hover:text-foreground",
  destructive:
    "border border-danger bg-danger text-danger-foreground hover:bg-danger/90",
  success:
    "border border-success-border bg-success-background text-success hover:border-success",
};

const sizes: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs",
  default: "h-9 px-4 text-sm",
  lg: "h-10 px-6 text-sm",
  icon: "size-9 p-0",
};

const base =
  "inline-flex select-none items-center justify-center gap-1.5 whitespace-nowrap rounded-md font-[500] transition-colors duration-120 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/25 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0";

export function buttonClassName(variant: ButtonVariant = "default", size: ButtonSize = "default") {
  return `${base} ${buttonVariants[variant]} ${sizes[size]}`;
}

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "default", size = "default", type, ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonClassName(variant, size), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";
