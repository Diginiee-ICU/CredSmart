import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-lg text-xs font-semibold ring-offset-background transition-colors duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0 cursor-pointer select-none",
  {
    variants: {
      variant: {
        default:
          "bg-primary text-primary-foreground shadow-2xs hover:bg-primary/90",
        destructive:
          "bg-destructive text-destructive-foreground shadow-2xs hover:bg-destructive/90",
        outline:
          "border border-border/80 bg-background text-foreground hover:bg-muted/60 hover:text-foreground shadow-2xs",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80 border border-border/60 shadow-2xs",
        ghost:
          "hover:bg-muted/60 hover:text-foreground",
        link:
          "text-primary underline-offset-4 hover:underline",
        // Backward-compatibility aliases for legacy calls
        ruby:
          "bg-rose-600 text-white shadow-2xs hover:bg-rose-700",
        gold:
          "bg-amber-500 text-slate-950 font-bold shadow-2xs hover:bg-amber-600",
        glass:
          "border border-border/80 bg-background/80 text-foreground hover:bg-muted/60 shadow-2xs",
      },
      size: {
        // 34px Standard Action Button
        default: "h-8.5 px-3 rounded-lg text-xs font-semibold shadow-2xs",
        // 28px Small / Table Action Button
        sm: "h-7 px-2.5 rounded-md text-[11px] font-medium",
        table: "h-7 px-2.5 rounded-md text-[11px] font-medium",
        // 30px Micro / Inline Icon Button
        icon: "w-7.5 h-7.5 rounded-md p-0 flex items-center justify-center",
        "icon-sm": "w-7 h-7 rounded-md p-0 flex items-center justify-center",
        // 46px Mobile Center Elevated CTA
        cta: "w-[46px] h-[46px] rounded-xl font-bold shadow-sm p-0 flex items-center justify-center",
        // Proportional standard overrides (replaces bloated 44px bubbles)
        lg: "h-9.5 px-4 rounded-lg text-sm font-semibold shadow-2xs",
        pill: "h-8.5 px-3.5 rounded-full text-xs font-semibold shadow-2xs",
        "pill-lg": "h-9.5 px-4 rounded-full text-sm font-semibold shadow-2xs",
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

// eslint-disable-next-line react-refresh/only-export-components
export { Button, buttonVariants };
