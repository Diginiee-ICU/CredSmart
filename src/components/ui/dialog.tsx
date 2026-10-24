import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-modal-overlay bg-black/60 backdrop-blur-xs data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

// Visually hidden utility for accessibility – keeps element in DOM for screen readers
const VisuallyHidden = ({ children }: { children: React.ReactNode }) => (
  <span style={{ position: "absolute", width: 1, height: 1, padding: 0, margin: -1, overflow: "hidden", clip: "rect(0,0,0,0)", whiteSpace: "nowrap", border: 0 }}>
    {children}
  </span>
);

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, forwardedRef) => {
  const innerRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const el = innerRef.current;
    if (el) {
      el.scrollTop = 0;
      el.scrollTo({ top: 0, left: 0, behavior: "instant" });
      const scrollables = el.querySelectorAll(".overflow-y-auto, [data-scrollable], form");
      scrollables.forEach((s) => {
        (s as HTMLElement).scrollTop = 0;
        s.scrollTo({ top: 0, left: 0, behavior: "instant" });
      });
    }
  }, []);

  const setRefs = React.useCallback(
    (node: any /* eslint-disable-line @typescript-eslint/no-explicit-any */) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      innerRef.current = node;
      if (typeof forwardedRef === "function") {
        forwardedRef(node);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<any> /* eslint-disable-line @typescript-eslint/no-explicit-any */).current = node; // eslint-disable-line @typescript-eslint/no-explicit-any
      }
    },
    [forwardedRef]
  );

  // Check if children already include a DialogTitle to avoid duplicates
  const hasTitle = React.Children.toArray(children).some((child) => {
    if (!React.isValidElement(child)) return false;
    // Check direct DialogTitle or DialogHeader (which typically contains DialogTitle)
    const type = (child as React.ReactElement).type;
    return type === DialogPrimitive.Title || (type as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)?.displayName === DialogPrimitive.Title.displayName || (type as any /* eslint-disable-line @typescript-eslint/no-explicit-any */)?.displayName === "DialogHeader"; // eslint-disable-line @typescript-eslint/no-explicit-any
  });

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={setRefs}
        aria-describedby={props["aria-describedby"] || undefined}
        className={cn(
          "fixed left-[50%] top-[50%] z-modal grid w-[calc(100%-2rem)] max-w-lg max-h-[90dvh] overflow-y-auto scrollbar-thin translate-x-[-50%] translate-y-[-50%] gap-4 rounded-xl sm:rounded-2xl border border-border/80 bg-background dark:bg-card p-5 sm:p-6 shadow-lg duration-200 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%]",
          className,
        )}
        {...props}
      >
        {!hasTitle && (
          <VisuallyHidden>
            <DialogPrimitive.Title>Dialog</DialogPrimitive.Title>
          </VisuallyHidden>
        )}
        {children}
        <DialogPrimitive.Close className="absolute right-4 top-4 rounded-full p-1 opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:bg-muted hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col space-y-1.5 text-center sm:text-left", className)} {...props} />
);
DialogHeader.displayName = "DialogHeader";

const DialogFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2", className)} {...props} />
);
DialogFooter.displayName = "DialogFooter";

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
