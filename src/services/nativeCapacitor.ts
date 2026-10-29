import { Capacitor } from "@capacitor/core";
import { App as CapApp } from "@capacitor/app";
import { StatusBar, Style } from "@capacitor/status-bar";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { Network, ConnectionStatus } from "@capacitor/network";
import { Haptics, ImpactStyle, NotificationType } from "@capacitor/haptics";
import { toast } from "sonner";

/**
 * Checks if running inside native Android / iOS Capacitor APK container
 */
export const isNativePlatform = (): boolean => {
  return Capacitor.isNativePlatform();
};

export const getPlatform = (): string => {
  return Capacitor.getPlatform();
};

/**
 * Initialize native device capabilities
 */
export const initNativeCapabilities = async (options?: {
  isDarkMode?: boolean;
  onNetworkChange?: (status: ConnectionStatus) => void;
}) => {
  if (!isNativePlatform()) {
    return;
  }

  // 1. Status Bar Setup
  try {
    const isDark = options?.isDarkMode ?? document.documentElement.classList.contains("dark");
    await StatusBar.setStyle({
      style: isDark ? Style.Dark : Style.Light,
    });

    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({
        color: isDark ? "#020817" : "#FFFFFF",
      });
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch (e) {
    console.warn("[Native] Status bar init warning:", e);
  }

  // 2. Keyboard Management
  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
    await Keyboard.setAccessoryBarVisible({ isVisible: true });
  } catch (e) {
    console.warn("[Native] Keyboard config warning:", e);
  }

  // 3. Network Monitoring
  try {
    const status = await Network.getStatus();
    if (!status.connected) {
      toast.warning("You are currently offline. Local changes will sync when reconnected.", {
        duration: 4000,
      });
    }

    Network.addListener("networkStatusChange", (change) => {
      if (options?.onNetworkChange) {
        options.onNetworkChange(change);
      }
      if (!change.connected) {
        toast.error("Network disconnected! Working in offline mode.", {
          duration: 5000,
        });
      } else {
        toast.success("Network connection restored!", {
          duration: 3000,
        });
      }
    });
  } catch (e) {
    console.warn("[Native] Network listener warning:", e);
  }
};

/**
 * Update native status bar color when theme toggles
 */
export const updateNativeStatusBar = async (isDarkMode: boolean) => {
  if (!isNativePlatform()) return;
  try {
    await StatusBar.setStyle({
      style: isDarkMode ? Style.Dark : Style.Light,
    });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({
        color: isDarkMode ? "#020817" : "#FFFFFF",
      });
    }
  } catch (e) {
    console.warn("[Native] Failed to update status bar style:", e);
  }
};

/**
 * Native Haptic Feedback Helpers
 */
export const nativeHaptics = {
  light: async () => {
    try {
      if (isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Light });
      }
    } catch {
      // Ignored if device lacks vibrator
    }
  },
  medium: async () => {
    try {
      if (isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Medium });
      }
    } catch {
      // Ignored
    }
  },
  heavy: async () => {
    try {
      if (isNativePlatform()) {
        await Haptics.impact({ style: ImpactStyle.Heavy });
      }
    } catch {
      // Ignored
    }
  },
  success: async () => {
    try {
      if (isNativePlatform()) {
        await Haptics.notification({ type: NotificationType.Success });
      }
    } catch {
      // Ignored
    }
  },
  error: async () => {
    try {
      if (isNativePlatform()) {
        await Haptics.notification({ type: NotificationType.Error });
      }
    } catch {
      // Ignored
    }
  },
};

// Declared at module scope to persist across successive back-press events
let lastBackPressTime = 0;

/**
 * Sets up 4-Tier Hardware Back Button navigation for Android:
 * Priority 1: Topmost modal/dialog/drawer dismissal
 * Priority 2: Deep route navigation (with /billing/pos excluded from portal roots)
 * Priority 2A: CRM Internal Tab History back (if CRM active tab != 'command')
 * Priority 3: Root of sub-portal -> Return to Cold Launch Selection Hub via SPA navigation
 * Priority 4: Selection Hub ("/") -> Double-tap within 2000ms to exit app
 */
export const setupHardwareBackButton = () => {
  if (!isNativePlatform()) return () => {};

  const backListener = CapApp.addListener("backButton", ({ canGoBack }) => {
    // Priority 1: Topmost modal/dialog/drawer dismissal
    const openModals = document.querySelectorAll(
      '[data-state="open"], [role="dialog"], [role="alertdialog"], .bill-editor-shell'
    );
    if (openModals.length > 0) {
      const topModal = openModals[openModals.length - 1];
      const closeBtn = topModal.querySelector<HTMLElement>(
        'button[aria-label="Close"], [data-radix-collection-item], button.close, [data-modal-close]'
      );
      if (closeBtn) {
        closeBtn.click();
        return;
      }
      // Fallback synthetic escape event for drawers without close buttons
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27, bubbles: true }));
      return;
    }

    const currentPath = window.location.pathname;

    // Priority 2: Deep route navigation (go back in history)
    // NOTE: /billing/pos is explicitly REMOVED from portal root so users can back out to Dashboard or Sales
    const isPortalRoot = currentPath === "/billing/dashboard" || currentPath === "/billing";

    // Priority 2A: CRM Internal Tab History back (if CRM has active tab != 'command')
    if (currentPath === "/crm") {
      const activeCrmTab = document.querySelector("[data-crm-active-tab]")?.getAttribute("data-crm-active-tab");
      if (activeCrmTab && activeCrmTab !== "command") {
        const commandTabBtn = document.querySelector<HTMLElement>('[data-crm-tab="command"]');
        if (commandTabBtn) {
          commandTabBtn.click();
          return;
        }
      }
    }

    if (canGoBack && !isPortalRoot && currentPath !== "/" && currentPath !== "/crm") {
      window.history.back();
      return;
    }

    // Priority 3: Root of sub-portal -> Return to Cold Launch Selection Hub via SPA navigation
    if (isPortalRoot || currentPath === "/crm") {
      sessionStorage.removeItem("credsmart_launch_portal_active");
      // SPA navigation avoids destructive WebView hard reloads
      window.history.pushState(null, "", "/");
      window.dispatchEvent(new PopStateEvent("popstate"));
      return;
    }

    // Priority 4: Selection Hub ("/") -> Double-tap within 2000ms to exit app
    if (currentPath === "/") {
      const now = Date.now();
      if (now - lastBackPressTime < 2000) {
        CapApp.exitApp();
      } else {
        lastBackPressTime = now;
        toast("Press back again to exit CredSmart", {
          duration: 2000,
        });
      }
    }
  });

  return () => {
    backListener.then((sub) => sub.remove()).catch(() => {});
  };
};
