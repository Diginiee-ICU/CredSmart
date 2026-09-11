import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { NetworkInvoice, NetworkNotification } from "@/types/networkInvoicing";
import { networkInvoicingService } from "@/services/networkInvoicingService";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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

  const loadData = useCallback(async () => {
    if (!orgId || !org) {
      setPendingInvoices([]);
      setAllInvoices([]);
      setNotifications([]);
      return;
    }

    try {
      const [pending, all, notifs] = await Promise.all([
        networkInvoicingService.getPendingInvoicesForOrg(orgId, org.phone, org.gstin),
        networkInvoicingService.getInvoicesForOrg(orgId, org.phone, org.gstin),
        networkInvoicingService.getNotificationsForOrg(orgId, org.phone, org.gstin),
      ]);

      setPendingInvoices(pending);
      setAllInvoices(all);
      setNotifications(notifs);
    } catch (e) {
      console.warn("Failed to load network invoice notifications:", e);
    }
  }, [orgId, org]);

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

    // Listen to Supabase Realtime for network_invoices (if connected)
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
  }, [loadData]);

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
