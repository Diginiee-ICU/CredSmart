import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-all duration-300 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 cursor-pointer ripple-surface",
  {
    variants: {
      variant: {
        default:
          "text-primary-foreground shadow-soft [background-image:var(--gradient-primary)] hover:-translate-y-0.5 hover:shadow-lift",
        ruby:
          "text-white shadow-soft [background-image:var(--gradient-ruby)] hover:-translate-y-0.5 hover:shadow-lift",
        gold:
          "text-foreground shadow-soft [background-image:var(--gradient-gold)] hover:-translate-y-0.5 hover:shadow-lift",
        destructive:
          "bg-destructive text-destructive-foreground shadow-soft hover:bg-destructive/90 hover:shadow-lift",
        outline:
          "glass-input text-foreground hover:border-[color-mix(in_oklab,var(--accent)_40%,transparent)] hover:text-accent",
        secondary:
          "bg-secondary/70 text-secondary-foreground hover:bg-secondary border border-border/60",
        ghost:
          "hover:bg-accent/10 hover:text-accent",
        link:
          "text-accent underline-offset-4 hover:underline",
        glass:
          "liquid-glass-soft text-foreground hover:border-accent/40 hover:text-accent shadow-xs",
      },
      size: {
        default: "h-9 px-4 py-2 text-xs font-semibold rounded-xl",
        sm: "h-8 rounded-lg px-3 text-xs",
        lg: "h-11 rounded-full px-8 text-sm font-semibold",
        pill: "h-9 px-5 rounded-full text-xs font-semibold",
        "pill-lg": "h-11 px-8 rounded-full text-sm font-semibold",
        icon: "h-9 w-9 rounded-xl",
        "icon-sm": "h-8 w-8 rounded-lg",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
