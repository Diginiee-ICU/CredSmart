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

/**
 * Sets up Hardware Back Button navigation for Android
 */
export const setupHardwareBackButton = () => {
  if (!isNativePlatform()) return () => {};

  let lastBackPressTime = 0;

  const backListener = CapApp.addListener("backButton", ({ canGoBack }) => {
    // 1. If an open modal/dialog/sheet/alert exists, close the topmost one
    const openModals = document.querySelectorAll(
      '[data-state="open"], [role="dialog"], [role="alertdialog"], .bill-editor-shell'
    );

    if (openModals.length > 0) {
      // Find top close button or fire Escape
      const topModal = openModals[openModals.length - 1];
      const closeBtn = topModal.querySelector<HTMLElement>(
        'button[aria-label="Close"], [data-radix-collection-item], button.close, [data-modal-close]'
      );
      if (closeBtn) {
        closeBtn.click();
        return;
      }

      // Dispatch Escape key event to trigger Radix dialog dismissal
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", keyCode: 27 }));
      return;
    }

    // 2. If in browser history, navigate back
    const currentPath = window.location.pathname;
    const isRootPage = currentPath === "/" || currentPath === "/dashboard";

    if (canGoBack && !isRootPage) {
      window.history.back();
      return;
    }

    // 3. Double-tap back on root dashboard to exit app
    const now = Date.now();
    if (now - lastBackPressTime < 2000) {
      CapApp.exitApp();
    } else {
      lastBackPressTime = now;
      toast("Press back again to exit CredSmart", {
        duration: 2000,
      });
    }
  });

  return () => {
    backListener.then((sub) => sub.remove()).catch(() => {});
  };
};
