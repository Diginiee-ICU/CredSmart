import React from "react";
import { SuitePreference } from "@/config/routes";
import { cn } from "@/lib/utils";

export interface OnboardingSuiteSelectorProps {
  value: SuitePreference;
  onChange: (val: SuitePreference) => void;
  className?: string;
}

export function OnboardingSuiteSelector({
  value,
  onChange,
  className,
}: OnboardingSuiteSelectorProps) {
  return (
    <div data-testid="onboarding-suite-selector" className={cn("space-y-3", className)}>
      <label className="text-sm font-semibold text-foreground">
        Choose Your Primary Operational Hub
      </label>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {/* POS & Billing Option */}
        <div
          data-testid="suite-option-billing"
          data-selected={value === "billing"}
          onClick={() => onChange("billing")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChange("billing");
            }
          }}
          tabIndex={0}
          role="button"
          aria-label="POS & Billing"
          className={cn(
            "cursor-pointer p-4 rounded-xl border transition-all select-none",
            value === "billing"
              ? "border-amber-500 bg-amber-50/50 dark:bg-amber-950/20 ring-2 ring-amber-500/20"
              : "border-border hover:border-muted-foreground/30"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm">POS & Billing</span>
            {value === "billing" && (
              <span className="text-[11px] font-bold text-amber-600 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full">
                Selected
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Retail billing, barcode scanning, live inventory, GST invoices, and khata ledger.
          </p>
        </div>

        {/* CRM Option */}
        <div
          data-testid="suite-option-crm"
          data-selected={value === "crm"}
          onClick={() => onChange("crm")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChange("crm");
            }
          }}
          tabIndex={0}
          role="button"
          aria-label="CRM & Workforce"
          className={cn(
            "cursor-pointer p-4 rounded-xl border transition-all select-none",
            value === "crm"
              ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20 ring-2 ring-emerald-500/20"
              : "border-border hover:border-muted-foreground/30"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm">CRM & Workforce</span>
            {value === "crm" && (
              <span className="text-[11px] font-bold text-emerald-600 bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full">
                Selected
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Staff biometric attendance, salary payroll, task tracking, roles & RBAC.
          </p>
        </div>

        {/* Both / All-in-One Option */}
        <div
          data-testid="suite-option-both"
          data-selected={value === "both"}
          onClick={() => onChange("both")}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              onChange("both");
            }
          }}
          tabIndex={0}
          role="button"
          aria-label="Both (Complete)"
          className={cn(
            "cursor-pointer p-4 rounded-xl border transition-all select-none",
            value === "both"
              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20 ring-2 ring-blue-500/20"
              : "border-border hover:border-muted-foreground/30"
          )}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm">Complete Suite (Both)</span>
            {value === "both" && (
              <span className="text-[11px] font-bold text-blue-600 bg-blue-100 dark:bg-blue-900/50 px-2 py-0.5 rounded-full">
                Selected
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            All features: POS, billing, inventory, CRM, staff attendance & payroll.
          </p>
        </div>
      </div>
    </div>
  );
}

export default OnboardingSuiteSelector;
