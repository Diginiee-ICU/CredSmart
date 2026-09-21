import { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from "react";
import { NetworkInvoice, NetworkNotification } from "@/types/networkInvoicing";
import { networkInvoicingService, getOrCreateB2BRealtimeChannel } from "@/services/networkInvoicingService";
import { useOrganization, OrgData } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

function playChimeAndVibrate() {
  // 1. Web Audio API synthesized pleasant 2-tone chime (Instant, offline, zero network latency)
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext; // eslint-disable-line @typescript-eslint/no-explicit-any
    if (AudioCtx) {
      const ctx = new AudioCtx();
      const now = ctx.currentTime;

      // Tone 1: 587.33 Hz (D5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = "sine";
      osc1.frequency.setValueAtTime(587.33, now);
      gain1.gain.setValueAtTime(0.18, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.28);

      // Tone 2: 880.00 Hz (A5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(880, now + 0.1);
      gain2.gain.setValueAtTime(0.22, now + 0.1);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.1);
      osc2.stop(now + 0.45);
    }
  } catch { /* empty */ }

  // 2. Audio file fallback
  try {
    const audio = new Audio("https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3");
    audio.volume = 0.6;
    audio.play().catch(() => {});
  } catch { /* empty */ }

  // 3. Mobile Haptic feedback
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate([100, 50, 100]);
    }
  } catch { /* empty */ }
}

interface NetworkInvoicesContextType {
  pendingInvoices: NetworkInvoice[];
  pendingCount: number;
  allInvoices: NetworkInvoice[];
  notifications: NetworkNotification[];
  unreadCount: number;
  loading: boolean;
  approvingId: string | null;
  rejectingId: string | null;
  approveInvoice: (invoiceId: string) => Promise<boolean>;
  rejectInvoice: (invoiceId: string, reason?: string) => Promise<boolean>;
  markAsRead: (notificationId: string) => void;
  markAllAsRead: () => void;
  simulateTestInvoice: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NetworkInvoicesContext = createContext<NetworkInvoicesContextType>({
  pendingInvoices: [],
  pendingCount: 0,
  allInvoices: [],
  notifications: [],
  unreadCount: 0,
  loading: false,
  approvingId: null,
  rejectingId: null,
  approveInvoice: async () => false,
  rejectInvoice: async () => false,
  markAsRead: () => {},
  markAllAsRead: () => {},
  simulateTestInvoice: async () => {},
  refresh: async () => {},
});

export function NetworkInvoicesProvider({ children }: { children: ReactNode }) {
  const { org, orgId } = useOrganization();
  const { user } = useAuth();

  const [pendingInvoices, setPendingInvoices] = useState<NetworkInvoice[]>([]);
  const [allInvoices, setAllInvoices] = useState<NetworkInvoice[]>([]);
  const [notifications, setNotifications] = useState<NetworkNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const userName = (user?.user_metadata?.full_name as string) || (user?.user_metadata?.name as string) || undefined;
  const userEmail = user?.email || undefined;
  const userPhone = user?.phone || (user?.user_metadata?.phone as string) || undefined;

  // Keep live references so realtime handlers always have access without tearing down the WebSocket
  const orgRef = useRef<OrgData | null>(org);
  orgRef.current = org;

  const userRef = useRef({ userName, userEmail, userPhone });
  userRef.current = { userName, userEmail, userPhone };

  const loadData = useCallback(async () => {
    const currentOrg = orgRef.current;
    if (!orgId || !currentOrg) {
      setPendingInvoices([]);
      setAllInvoices([]);
      setNotifications([]);
      return;
    }

    try {
      const u = userRef.current;
      const [pending, all, notifs] = await Promise.all([
        networkInvoicingService.getPendingInvoicesForOrg(orgId, currentOrg.phone, currentOrg.gstin, currentOrg.name, u.userName, u.userEmail, u.userPhone),
        networkInvoicingService.getInvoicesForOrg(orgId, currentOrg.phone, currentOrg.gstin, currentOrg.name, u.userName, u.userEmail, u.userPhone),
        networkInvoicingService.getNotificationsForOrg(orgId, currentOrg.phone, currentOrg.gstin, currentOrg.name, u.userName, u.userEmail, u.userPhone),
      ]);

      setPendingInvoices(pending);
      setAllInvoices(all);
      setNotifications(notifs);
    } catch (e) {
      console.warn("Failed to load network invoice notifications:", e);
    }
  }, [orgId]);

  useEffect(() => {
    loadData();

    // Listen to custom DOM events (cross-component sync)
    const handleNetworkUpdate = () => {
      loadData();
    };

    window.addEventListener("credsmart_network_update", handleNetworkUpdate);
    window.addEventListener("credsmart_notification_update", handleNetworkUpdate);
    window.addEventListener("credsmart_org_changed", handleNetworkUpdate);
    window.addEventListener("storage", handleNetworkUpdate);

    // Listen to BroadcastChannel for cross-tab sync
    let channel: BroadcastChannel | null = null;
    try {
      if ("BroadcastChannel" in window) {
        channel = new BroadcastChannel("credsmart_network_channel");
        channel.onmessage = () => {
          loadData();
        };
      }
    } catch { /* empty */ }

    // Listen to Supabase Realtime Broadcast across all devices & browsers globally
    const isTestEnv = typeof process !== "undefined" && process.env?.NODE_ENV === "test";
    let b2bChannel: ReturnType<typeof supabase.channel> | null = null;
    if (!isTestEnv) {
      try {
        b2bChannel = getOrCreateB2BRealtimeChannel();
        if (b2bChannel) {
          b2bChannel
            .on("broadcast", { event: "INVOICE_CREATED" }, (eventPayload) => {
              const payload = eventPayload?.payload;
              const networkInvoice: NetworkInvoice = payload?.networkInvoice;
              const notification: NetworkNotification = payload?.notification;
              const currentOrg = orgRef.current;

              if (!networkInvoice || !currentOrg) return;

              const u = userRef.current;
              // Check if invoice is addressed to this organization or user
              const isTargetRecipient = networkInvoicingService.isInvoiceForOrg(
                networkInvoice,
                currentOrg.id,
                currentOrg.phone,
                currentOrg.gstin,
                currentOrg.name,
                u.userName,
                u.userEmail,
                u.userPhone
              );

              if (isTargetRecipient) {
                // Ingest immediately into local storage
                networkInvoicingService.ingestIncomingNetworkInvoice(networkInvoice, notification, currentOrg.id);

                // Play pleasant sound chime & haptic feedback
                playChimeAndVibrate();

                // Show real-time actionable toast notification
                toast.info(`⚡ New Sales Invoice on your name!`, {
                  description: `${networkInvoice.senderOrgName} has created Sales Invoice #${networkInvoice.invoiceNumber} for ₹${Number(networkInvoice.grandTotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })} on your name.`,
                  duration: 9000,
                  action: {
                    label: "Review & Inward",
                    onClick: () => {
                      window.dispatchEvent(
                        new CustomEvent("credsmart_open_notifications", { detail: { tab: "inward" } })
                      );
                    },
                  },
                });

                loadData();
              }
            })
            .on("broadcast", { event: "INVOICE_APPROVED" }, () => {
              loadData();
            })
            .on("broadcast", { event: "INVOICE_REJECTED" }, () => {
              loadData();
            })
            .on("broadcast", { event: "INVOICE_CANCELLED" }, () => {
              loadData();
            });
        }
      } catch (err) {
        console.warn("B2B Realtime listener init error:", err);
      }
    }

    // Listen to Supabase Realtime for network_invoices table changes (if connected)
    let sub: any /* eslint-disable-line @typescript-eslint/no-explicit-any */ = null; // eslint-disable-line @typescript-eslint/no-explicit-any
    try {
      sub = supabase
        .channel("public:network_invoices")
        .on(
          "postgres_changes",
          { event: "*", schema: "public", table: "network_invoices" },
          () => {
            loadData();
          }
        )
        .subscribe();
    } catch { /* empty */ }

    return () => {
      window.removeEventListener("credsmart_network_update", handleNetworkUpdate);
      window.removeEventListener("credsmart_notification_update", handleNetworkUpdate);
      window.removeEventListener("credsmart_org_changed", handleNetworkUpdate);
      window.removeEventListener("storage", handleNetworkUpdate);
      channel?.close();
      if (sub) {
        try {
          supabase.removeChannel(sub);
        } catch { /* empty */ }
      }
    };
  }, [loadData, orgId]);

  const approveInvoice = async (invoiceId: string): Promise<boolean> => {
    if (!org) {
      toast.error("Active store organization not found");
      return false;
    }

    setApprovingId(invoiceId);
    try {
      const result = await networkInvoicingService.approveNetworkInvoice(invoiceId, org, user?.id);
      if (result.success && result.purchaseDoc) {
        toast.success(
          `✅ Sales Invoice Approved! Added into Purchases as Bill #${result.purchaseDoc.documentNumber} from ${result.purchaseDoc.partyName}`,
          { duration: 6000 }
        );
        await loadData();
        return true;
      } else {
        toast.error(result.error || "Failed to approve invoice");
        return false;
      }
    } catch (e: unknown) {
      toast.error(e?.message || "Error approving invoice");
      return false;
    } finally {
      setApprovingId(null);
    }
  };

  const rejectInvoice = async (invoiceId: string, reason?: string): Promise<boolean> => {
    if (!org) {
      toast.error("Active store organization not found");
      return false;
    }

    setRejectingId(invoiceId);
    try {
      const result = await networkInvoicingService.rejectNetworkInvoice(invoiceId, org, reason);
      if (result.success) {
        toast.info("Invoice rejected. Seller has been notified.", { duration: 4000 });
        await loadData();
        return true;
      } else {
        toast.error(result.error || "Failed to reject invoice");
        return false;
      }
    } catch (e: unknown) {
      toast.error(e?.message || "Error rejecting invoice");
      return false;
    } finally {
      setRejectingId(null);
    }
  };

  const markAsRead = (notificationId: string) => {
    networkInvoicingService.markNotificationAsRead(notificationId);
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, status: "read" as const } : n))
    );
  };

  const markAllAsRead = () => {
    if (!orgId) return;
    networkInvoicingService.markAllNotificationsAsRead(orgId);
    setNotifications((prev) => prev.map((n) => ({ ...n, status: "read" as const })));
  };

  const simulateTestInvoice = async () => {
    if (!org) {
      toast.error("Active store organization not found");
      return;
    }

    try {
      const sim = await networkInvoicingService.simulatePartnerInvoice(org);
      toast.success(
        `🚀 Simulated sales invoice #${sim.invoiceNumber} created from "${sim.senderOrgName}" to "${org.name}"!`,
        { duration: 5000 }
      );
      await loadData();
    } catch (e: unknown) {
      toast.error(e?.message || "Failed to simulate test invoice");
    }
  };

  const pendingCount = pendingInvoices.length;
  const unreadCount = notifications.filter((n) => n.status === "unread").length;

  return (
    <NetworkInvoicesContext.Provider
      value={{
        pendingInvoices,
        pendingCount,
        allInvoices,
        notifications,
        unreadCount,
        loading,
        approvingId,
        rejectingId,
        approveInvoice,
        rejectInvoice,
        markAsRead,
        markAllAsRead,
        simulateTestInvoice,
        refresh: loadData,
      }}
    >
      {children}
    </NetworkInvoicesContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useNetworkInvoices() {
  return useContext(NetworkInvoicesContext);
}
