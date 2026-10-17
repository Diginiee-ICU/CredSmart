import * as React from "react";
import { Crown, Shield, LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Size variants available for CRMRolePill.
 */
export type CRMRolePillSize = "sm" | "md" | "lg";

/**
 * Props for the CRMRolePill component.
 */
export interface CRMRolePillProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Name of the custom role (e.g. "Store Manager", "Staff Associate", "HR Lead") */
  name: string;
  /**
   * Hex color assigned to the role by the user (e.g. "#FF6A00", "#1D4ED8").
   * Automatically computes 15% opacity background and 35% opacity border tints.
   * @default "#1D4ED8"
   */
  color?: string;
  /** Optional icon component rendered before role title. Defaults to Shield */
  icon?: LucideIcon | React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  /** If true, renders a gold super-admin crown icon instead of the regular role icon */
  isSuperAdmin?: boolean;
  /**
   * Size variant of the pill.
   * @default "md"
   */
  size?: CRMRolePillSize;
}

/**
 * Helper to compute hex color with alpha channel for background and border tints.
 */
function toHexAlpha(hex: string, alphaHex: string): string {
  if (hex.startsWith("#") && hex.length === 7) {
    return `${hex}${alphaHex}`;
  }
  return hex;
}

/**
 * CRMRolePill
 * Dynamic role pill with user-configured custom color tinting and super-admin crown.
 */
export function CRMRolePill({
  name,
  color = "#1D4ED8",
  icon: Icon = Shield,
  isSuperAdmin = false,
  size = "md",
  className,
  style,
  ...props
}: CRMRolePillProps): React.ReactElement {
  const sizeClasses: Record<CRMRolePillSize, string> = {
    sm: "text-[10px] px-2 py-0.5 gap-1",
    md: "text-xs px-2.5 py-0.5 gap-1.5",
    lg: "text-sm px-3 py-1 gap-2 font-medium",
  };

  // Convert hex color to 15% opacity background (26 hex) and 35% opacity border (59 hex / 4D hex)
  const customStyle: React.CSSProperties = {
    backgroundColor: toHexAlpha(color, "1A"),
    borderColor: toHexAlpha(color, "4D"),
    color: color,
    ...style,
  };

  return (
    <span
      className={cn(
        "inline-flex items-center font-bold rounded-full border transition-all duration-150 select-none",
        sizeClasses[size],
        className
      )}
      style={customStyle}
      {...props}
    >
      {isSuperAdmin ? (
        <Crown className="w-3.5 h-3.5 text-amber-500 fill-amber-400 shrink-0" />
      ) : (
        <Icon className="w-3.5 h-3.5 shrink-0" style={{ color }} />
      )}
      <span>{name}</span>
    </span>
  );
}
