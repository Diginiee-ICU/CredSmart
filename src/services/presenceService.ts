import { apiPost } from "@/lib/apiClient";
import { isNativePlatform } from "@/services/nativeCapacitor";

let heartbeatInterval: any = null;
let lastHeartbeatTime = 0;
const MIN_INTERVAL_MS = 25000; // Throttle: maximum 1 heartbeat per 25s
const HEARTBEAT_INTERVAL_MS = 60000; // Default periodic heartbeat: every 60s

export interface HeartbeatPayload {
  orgId: string;
  userId: string;
  email?: string;
  name?: string;
  role?: string;
  currentPath?: string;
}

export function detectPlatform(): string {
  if (typeof window === "undefined") return "server";
  if (isNativePlatform()) return "capacitor-mobile";
  if (Boolean((window as any).credsmartDesktop?.isDesktop) || window.location.protocol === "file:") {
    return "desktop-electron";
  }
  if (window.matchMedia("(display-mode: standalone)").matches) {
    return "pwa-standalone";
  }
  return "desktop-web";
}

export async function sendHeartbeat(payload: HeartbeatPayload): Promise<boolean> {
  if (!payload.orgId || !payload.userId) return false;

  const now = Date.now();
  if (now - lastHeartbeatTime < MIN_INTERVAL_MS) {
    return false; // Throttled
  }
  lastHeartbeatTime = now;

  try {
    const platform = detectPlatform();
    const currentPath = payload.currentPath || (typeof window !== "undefined" ? window.location.pathname : "");

    const { error } = await apiPost<{ success: boolean }>(
      "/presence/heartbeat",
      {
        user_email: payload.email || "",
        user_name: payload.name || "",
        user_role: payload.role || "cashier",
        current_path: currentPath,
        platform,
      },
      { organizationId: payload.orgId }
    );

    return !error;
  } catch {
    return false;
  }
}

export function startHeartbeatLoop(getPayload: () => HeartbeatPayload | null): () => void {
  if (heartbeatInterval) {
    clearInterval(heartbeatInterval);
    heartbeatInterval = null;
  }

  // Initial immediate heartbeat
  const initial = getPayload();
  if (initial) {
    sendHeartbeat(initial);
  }

  // Periodic timer
  heartbeatInterval = setInterval(() => {
    if (typeof document !== "undefined" && document.hidden) {
      return; // Save server bandwidth while tab is in background
    }
    const current = getPayload();
    if (current) {
      sendHeartbeat(current);
    }
  }, HEARTBEAT_INTERVAL_MS);

  // Tab visibility change listener: ping immediately when operator returns to tab
  const handleVisibilityChange = () => {
    if (typeof document !== "undefined" && !document.hidden) {
      const current = getPayload();
      if (current) {
        sendHeartbeat(current);
      }
    }
  };

  if (typeof document !== "undefined") {
    document.addEventListener("visibilitychange", handleVisibilityChange);
  }

  return () => {
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval);
      heartbeatInterval = null;
    }
    if (typeof document !== "undefined") {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    }
  };
}
