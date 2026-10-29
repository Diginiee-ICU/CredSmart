import { useId, cloneElement, isValidElement, type ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import type { Employee } from "@/crm/lib/store";
export { Button };
export const inputCls =
  "w-full h-9 rounded-xl bg-input border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-ring";
export function Field({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="block space-y-1.5">
      <span id={id} className="block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {isValidElement<{ "aria-labelledby"?: string }>(children)
        ? cloneElement(children, { "aria-labelledby": id })
        : children}
    </div>
  );
}
export function Sheet({
  title,
  children,
  onClose,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
}) {
  return (
    <Drawer
      open
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
      shouldScaleBackground={false}
    >
      <DrawerContent className="max-h-[92dvh] bg-popover rounded-t-3xl sm:max-w-lg sm:mx-auto">
        <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-2">
          <DrawerTitle className="text-base tracking-normal">{title}</DrawerTitle>
          <Button variant="ghost" size="icon" aria-label="Close" onClick={onClose}>
            <X />
          </Button>
        </div>
        <DrawerDescription className="sr-only">{title}</DrawerDescription>
        <div className="overflow-y-auto px-4 pb-6 space-y-4">{children}</div>
      </DrawerContent>
    </Drawer>
  );
}
export function Avatar({ e, live }: { e: Employee; live?: boolean }) {
  return (
    <div
      className="staff-avatar relative w-8 h-8 shrink-0 rounded-full grid place-items-center text-[11px] font-bold text-primary-foreground"
      style={{ "--employee-color": e.color } as React.CSSProperties}
    >
      {e.name
        .split(" ")
        .map((n) => n[0])
        .slice(0, 2)
        .join("")
        .toUpperCase()}
      {live && (
        <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-success border-2 border-card" />
      )}
    </div>
  );
}
export function Dot({ e }: { e: Employee }) {
  return (
    <span
      className="staff-dot w-2 h-2 rounded-full shrink-0"
      style={{ "--employee-color": e.color } as React.CSSProperties}
    />
  );
}
