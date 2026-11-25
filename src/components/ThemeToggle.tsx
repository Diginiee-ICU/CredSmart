import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  size?: "default" | "sm" | "icon";
  showLabel?: boolean;
}

export function ThemeToggle({
  className,
  size = "icon",
  showLabel = false,
}: ThemeToggleProps) {
  const { theme, setTheme, resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted ? resolvedTheme === "dark" : false;

  const toggleTheme = () => {
    setTheme(isDark ? "light" : "dark");
  };

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle Dark Mode"
        className={cn(
          "h-8.5 w-8.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 flex items-center justify-center shrink-0 shadow-2xs opacity-60",
          className
        )}
        disabled
      >
        <span className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 animate-pulse" />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className={cn(
        "h-8.5 rounded-lg border border-slate-200/80 dark:border-slate-800 bg-white/80 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center shrink-0 shadow-2xs active:scale-95 transition-all duration-150 cursor-pointer select-none",
        showLabel ? "px-3 gap-2 text-xs font-semibold" : "w-8.5",
        className
      )}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-500 animate-in spin-in-90 duration-200 stroke-[2.2]" />
      ) : (
        <Moon className="w-4 h-4 text-slate-700 dark:text-slate-300 animate-in -spin-in-90 duration-200 stroke-[2.2]" />
      )}
      {showLabel && (
        <span>{isDark ? "Light Mode" : "Dark Mode"}</span>
      )}
    </button>
  );
}

export default ThemeToggle;
