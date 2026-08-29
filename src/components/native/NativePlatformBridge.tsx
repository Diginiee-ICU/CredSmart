import React, { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  isNativePlatform,
  initNativeCapabilities,
  updateNativeStatusBar,
  setupHardwareBackButton,
} from "@/services/nativeCapacitor";
import { WifiOff } from "lucide-react";
import { ConnectionStatus } from "@capacitor/network";

/**
 * Global Native Platform Bridge Component
 * Automatically sets up Android/iOS native listeners, status bar styling,
 * hardware back-button navigation, and offline indicators.
 */
export const NativePlatformBridge: React.FC = () => {
  const { resolvedTheme } = useTheme();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // 1. Initialize native capabilities
    const isDark = resolvedTheme === "dark";
    initNativeCapabilities({
      isDarkMode: isDark,
      onNetworkChange: (status: ConnectionStatus) => {
        setIsOffline(!status.connected);
      },
    });

    // 2. Setup hardware back button navigation
    const cleanupBackButton = setupHardwareBackButton();

    return () => {
      cleanupBackButton();
    };
// eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 3. Update status bar when theme changes
  useEffect(() => {
    if (resolvedTheme) {
      updateNativeStatusBar(resolvedTheme === "dark");
    }
  }, [resolvedTheme]);

  if (!isOffline) return null;

  return (
    <aside
      aria-label="Offline notice"
      className="fixed top-0 inset-x-0 z-banner bg-amber-500 text-slate-950 px-3 py-1.5 text-xs font-bold flex items-center justify-center gap-2 shadow-md animate-in slide-in-from-top duration-200"
    >
      <WifiOff className="w-3.5 h-3.5" />
      <span>Working in Offline Mode. POS entries will sync when network is restored.</span>
    </aside>
  );
};
