import React, { useState, useEffect, useMemo, useRef } from "react";
import {
  Radio,
  Plus,
  Search,
  Bell,
  AlertTriangle,
  Pin,
  CheckCircle,
  Users,
  Shield,
  Clock,
  Sparkles,
  ChevronRight,
  Filter,
  Megaphone,
  Check,
  Send,
  Eye,
} from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useCRMPermission } from "@/hooks/useCRMPermission";
import { ROUTE_PATHS } from "@/config/routes";
import {
  CRMCard,
  CRMBadge,
  CRMPageHeader,
  CRMCommandHeader,
  CRMStatCard,
  CRMPermissionGate,
} from "@/components/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export type BroadcastUrgency = "urgent" | "operational" | "general" | "policy";
export type TargetAudience = "all" | "cashiers" | "warehouse" | "managers";

export interface CRMBroadcast {
  id: string;
  org_id: string;
  title: string;
  content: string;
  urgency: BroadcastUrgency;
  target_audience: TargetAudience;
  is_pinned: boolean;
  author_name: string;
  created_at: string;
  acknowledged_by: string[]; // user IDs or names who acknowledged
}

const INITIAL_BROADCASTS: CRMBroadcast[] = [
  {
    id: "bcast-1",
    org_id: "",
    title: "Diwali Weekend Operational Guidelines & Shift Extended Hours",
    content:
      "All store branches will remain open until 10:30 PM this Saturday & Sunday. Overtime wages (1.5x hourly multiplier) will automatically reflect in the Phase 3 payroll ledger for staff on closing shifts.",
    urgency: "urgent",
    target_audience: "all",
    is_pinned: true,
    author_name: "Store Administration",
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    acknowledged_by: ["Rahul Sharma", "Pooja Verma", "Amit Patel"],
  },
  {
    id: "bcast-2",
    org_id: "",
    title: "GST Invoice HSN Requirement Update for Wholesale Counter",
    content:
      "Mandatory 6-digit HSN codes are now enforced on all B2B sales vouchers exceeding ₹50,000. Cashiers must verify customer GSTIN before finalizing thermal bills.",
    urgency: "policy",
    target_audience: "cashiers",
    is_pinned: true,
    author_name: "Finance Department",
    created_at: new Date(Date.now() - 3600000 * 18).toISOString(),
    acknowledged_by: ["Pooja Verma", "Suresh Kumar"],
  },
  {
    id: "bcast-3",
    org_id: "",
    title: "Warehouse Inward Truck Arrival — Godown 2 Clearance",
    content:
      "FMCG delivery container arriving at 3:00 PM today at Godown 2. Warehouse assistants please prepare the pallet jacks and inspect physical tamper seals.",
    urgency: "operational",
    target_audience: "warehouse",
    is_pinned: false,
    author_name: "Inventory Manager",
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    acknowledged_by: ["Suresh Kumar"],
  },
  {
    id: "bcast-4",
    org_id: "",
    title: "Quarterly Team Huddle & Performance Rewards Announcement",
    content:
      "Quarterly review meet is scheduled for this Friday at 6:30 PM in CredSmart Meet Room. Best Performing Cashier of the Month award will be presented.",
    urgency: "general",
    target_audience: "all",
    is_pinned: false,
    author_name: "General Manager",
    created_at: new Date(Date.now() - 3600000 * 40).toISOString(),
    acknowledged_by: ["Rahul Sharma", "Amit Patel"],
  },
];

export default function Broadcasts(): React.ReactElement {
  const { orgId, org } = useOrganization();
  const { hasPermission, isSuperAdmin } = useCRMPermission();

  const canSend = isSuperAdmin || hasPermission("broadcasts", "send");
  const storageKey = `credsmart_crm_broadcasts_${orgId || "default"}`;

  const [broadcasts, setBroadcasts] = useState<CRMBroadcast[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return INITIAL_BROADCASTS;
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [urgencyFilter, setUrgencyFilter] = useState<string>("all");
  const [audienceFilter, setAudienceFilter] = useState<string>("all");
  const [isComposeOpen, setIsComposeOpen] = useState(false);

  // New broadcast form
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newUrgency, setNewUrgency] = useState<BroadcastUrgency>("general");
  const [newAudience, setNewAudience] = useState<TargetAudience>("all");
  const [newPinned, setNewPinned] = useState(false);

  const loadedOrgRef = useRef<string | null>(orgId);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setBroadcasts(JSON.parse(saved));
        loadedOrgRef.current = orgId;
        return;
      }
    } catch {}
    setBroadcasts(INITIAL_BROADCASTS.map((b) => ({ ...b, org_id: orgId || "" })));
    loadedOrgRef.current = orgId;
  }, [storageKey, orgId]);

  useEffect(() => {
    if (orgId && loadedOrgRef.current === orgId && broadcasts.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(broadcasts));
    }
  }, [broadcasts, storageKey, orgId]);

  // Metrics
  const metrics = useMemo(() => {
    const total = broadcasts.length;
    const urgentCount = broadcasts.filter((b) => b.urgency === "urgent").length;
    const pinnedCount = broadcasts.filter((b) => b.is_pinned).length;
    const totalAcks = broadcasts.reduce((acc, b) => acc + b.acknowledged_by.length, 0);
    return { total, urgentCount, pinnedCount, totalAcks };
  }, [broadcasts]);

  // Filtered list
  const filteredBroadcasts = useMemo(() => {
    return broadcasts
      .filter((b) => {
        const matchSearch =
          b.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
          b.author_name.toLowerCase().includes(searchQuery.toLowerCase());
        const matchUrgency = urgencyFilter === "all" ? true : b.urgency === urgencyFilter;
        const matchAudience = audienceFilter === "all" ? true : b.target_audience === audienceFilter;
        return matchSearch && matchUrgency && matchAudience;
      })
      .sort((a, b) => {
        // Pinned first, then by date descending
        if (a.is_pinned && !b.is_pinned) return -1;
        if (!a.is_pinned && b.is_pinned) return 1;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
  }, [broadcasts, searchQuery, urgencyFilter, audienceFilter]);

  const handleAcknowledge = (broadcastId: string) => {
    const currentUser = "You";
    setBroadcasts((prev) =>
      prev.map((b) => {
        if (b.id === broadcastId) {
          const already = b.acknowledged_by.includes(currentUser);
          return {
            ...b,
            acknowledged_by: already
              ? b.acknowledged_by.filter((u) => u !== currentUser)
              : [...b.acknowledged_by, currentUser],
          };
        }
        return b;
      })
    );
    toast({
      title: "Acknowledgment Updated",
      description: "Your receipt confirmation has been logged for store records.",
    });
  };

  const handleTogglePin = (broadcastId: string) => {
    if (!canSend) return;
    setBroadcasts((prev) =>
      prev.map((b) => (b.id === broadcastId ? { ...b, is_pinned: !b.is_pinned } : b))
    );
    toast({
      title: "Pinned State Updated",
      description: "Circular pin status changed.",
    });
  };

  const handleCreateBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) {
      toast({ title: "Validation Error", description: "Title and message content are required", variant: "destructive" });
      return;
    }

    const created: CRMBroadcast = {
      id: `bcast-${Date.now()}`,
      org_id: orgId || "",
      title: newTitle.trim(),
      content: newContent.trim(),
      urgency: newUrgency,
      target_audience: newAudience,
      is_pinned: newPinned,
      author_name: org?.name ? `${org.name} Admin` : "Management",
      created_at: new Date().toISOString(),
      acknowledged_by: ["You"],
    };

    setBroadcasts((prev) => [created, ...prev]);
    setIsComposeOpen(false);
    setNewTitle("");
    setNewContent("");
    setNewPinned(false);
    toast({
      title: "Broadcast Published",
      description: `"${created.title}" sent to ${created.target_audience} team members.`,
    });
  };

  const getUrgencyBadge = (u: BroadcastUrgency) => {
    switch (u) {
      case "urgent":
        return <CRMBadge variant="error" size="sm" dot>Urgent Notice</CRMBadge>;
      case "operational":
        return <CRMBadge variant="orange" size="sm">Operational</CRMBadge>;
      case "policy":
        return <CRMBadge variant="info" size="sm">Policy</CRMBadge>;
      case "general":
        return <CRMBadge variant="neutral" size="sm">General</CRMBadge>;
    }
  };

  const getAudienceLabel = (a: TargetAudience) => {
    switch (a) {
      case "all":
        return "All Staff";
      case "cashiers":
        return "Billing & POS";
      case "warehouse":
        return "Warehouse";
      case "managers":
        return "Managers";
    }
  };

  return (
    <CRMPermissionGate
      module="broadcasts"
      action="view"
      fallback={
        <div className="p-8 max-w-xl mx-auto text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <Radio className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Broadcast Access Restricted</h2>
          <p className="text-sm text-slate-600">
            You do not have permission to view store broadcasts. Contact your manager for access.
          </p>
        </div>
      }
    >
      <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 pb-32 sm:pb-20">
        <CRMCommandHeader
          title="Live Broadcasts & Circulars"
          subtitle={`${org?.name ? `${org.name} • ` : ""}Publish urgent notices, operational policies, and company announcements`}
          breadcrumbs={[
            { label: "Home", href: "/" },
            { label: "CRM", href: ROUTE_PATHS.crm },
            { label: "Broadcasts", href: ROUTE_PATHS.crmBroadcasts },
          ]}
          showBack={true}
          backTo={ROUTE_PATHS.crm}
          badge={
            <div className="flex items-center gap-1.5">
              <CRMBadge variant="info" size="sm">Phase 4 Active</CRMBadge>
              <CRMBadge variant="success" size="sm" dot>
                Push Alerts Ready
              </CRMBadge>
            </div>
          }
          actions={
            canSend && (
              <Button
                onClick={() => setIsComposeOpen(true)}
                size="sm"
                className="h-8.5 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs shadow-2xs gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Publish Broadcast</span>
              </Button>
            )
          }
        />

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
          {/* Metrics */}
          <section aria-label="Broadcast Metrics">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <CRMStatCard
                label="Total Circulars"
                value={metrics.total}
                icon={Radio}
                accent="navy"
                description="Published Bulletins"
              />
              <CRMStatCard
                label="Urgent Alerts"
                value={metrics.urgentCount}
                icon={AlertTriangle}
                accent="orange"
                description="High Priority Action"
              />
              <CRMStatCard
                label="Pinned Notices"
                value={metrics.pinnedCount}
                icon={Pin}
                accent="blue"
                description="Active Header Banners"
              />
              <CRMStatCard
                label="Staff Confirmations"
                value={metrics.totalAcks}
                icon={CheckCircle}
                accent="emerald"
                description="Logged Receipts"
              />
            </div>
          </section>

          {/* Filter Bar */}
          <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search bulletins or topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-8.5 text-xs rounded-lg border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Select value={urgencyFilter} onValueChange={setUrgencyFilter}>
                <SelectTrigger className="w-[130px] h-8.5 text-xs rounded-lg border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="Urgency" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Urgency</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="operational">Operational</SelectItem>
                  <SelectItem value="policy">Policy</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>

              <Select value={audienceFilter} onValueChange={setAudienceFilter}>
                <SelectTrigger className="w-[140px] h-8.5 text-xs rounded-lg border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="Audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="cashiers">Billing & POS</SelectItem>
                  <SelectItem value="warehouse">Warehouse</SelectItem>
                  <SelectItem value="managers">Managers</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          {/* Broadcasts Feed */}
          <section className="space-y-4">
            {filteredBroadcasts.length === 0 ? (
              <div className="p-12 text-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200/80 dark:border-slate-800">
                <Megaphone className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  No broadcasts found
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust your search filters or publish a new team circular.
                </p>
              </div>
            ) : (
              filteredBroadcasts.map((b) => {
                const isAckedByMe = b.acknowledged_by.includes("You");
                return (
                  <div
                    key={b.id}
                    className={cn(
                      "bg-white dark:bg-slate-900 rounded-xl border transition-all p-4 sm:p-5 shadow-2xs space-y-3.5",
                      b.is_pinned
                        ? "border-pink-300/80 dark:border-pink-900/60 ring-1 ring-pink-500/10"
                        : "border-slate-200/80 dark:border-slate-800 hover:border-slate-300"
                    )}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        {b.is_pinned && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/50 px-2 py-0.5 rounded-md border border-pink-200 dark:border-pink-900">
                            <Pin className="w-3 h-3 fill-pink-500" />
                            Pinned Circular
                          </span>
                        )}
                        {getUrgencyBadge(b.urgency)}
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">
                          <Users className="w-3 h-3 text-slate-400" />
                          {getAudienceLabel(b.target_audience)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono tabular-nums">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(b.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                        {b.title}
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 mt-1.5 leading-relaxed">
                        {b.content}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span>
                          Published by <strong className="text-slate-700 dark:text-slate-200">{b.author_name}</strong>
                        </span>
                        <span>•</span>
                        <span className="flex items-center gap-1 font-mono text-slate-600 dark:text-slate-400">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{b.acknowledged_by.length} acknowledged</span>
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        {canSend && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleTogglePin(b.id)}
                            className="h-8 text-xs text-slate-500 hover:text-pink-600"
                            title={b.is_pinned ? "Unpin notice" : "Pin notice to top"}
                          >
                            <Pin className={cn("w-3.5 h-3.5", b.is_pinned && "fill-pink-500 text-pink-500")} />
                          </Button>
                        )}

                        <Button
                          size="sm"
                          variant={isAckedByMe ? "outline" : "default"}
                          onClick={() => handleAcknowledge(b.id)}
                          className={cn(
                            "h-8 text-xs font-semibold gap-1.5",
                            isAckedByMe
                              ? "border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100/50"
                              : "bg-[#1D4ED8] hover:bg-blue-700 text-white"
                          )}
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>{isAckedByMe ? "Acknowledged ✓" : "Confirm Receipt"}</span>
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </section>
        </main>

        {/* Modal: Compose Broadcast */}
        <Dialog open={isComposeOpen} onOpenChange={setIsComposeOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Publish Team Broadcast</DialogTitle>
              <DialogDescription className="text-xs">
                Send an immediate announcement, operational alert, or policy bulletin.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateBroadcast} className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Headline Title *
                </label>
                <Input
                  required
                  placeholder="e.g. Mandatory stock audit this evening"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Urgency Level
                  </label>
                  <Select value={newUrgency} onValueChange={(v) => setNewUrgency(v as BroadcastUrgency)}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgent Notice</SelectItem>
                      <SelectItem value="operational">Operational</SelectItem>
                      <SelectItem value="policy">Policy Update</SelectItem>
                      <SelectItem value="general">General</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Target Audience
                  </label>
                  <Select value={newAudience} onValueChange={(v) => setNewAudience(v as TargetAudience)}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Staff</SelectItem>
                      <SelectItem value="cashiers">Billing & POS</SelectItem>
                      <SelectItem value="warehouse">Warehouse</SelectItem>
                      <SelectItem value="managers">Managers</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Message Content *
                </label>
                <Textarea
                  required
                  placeholder="Detailed guidelines, affected shifts, or instructions..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  className="text-xs min-h-[100px]"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="pinToTop"
                  checked={newPinned}
                  onChange={(e) => setNewPinned(e.target.checked)}
                  className="rounded text-pink-600 focus:ring-pink-500"
                />
                <label htmlFor="pinToTop" className="text-xs text-slate-600 dark:text-slate-400">
                  Pin this circular to top of staff noticeboard
                </label>
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsComposeOpen(false)}
                  className="text-xs h-9"
                >
                  Cancel
                </Button>
                <Button type="submit" className="text-xs h-9 bg-[#EC4899] hover:bg-pink-600 text-white font-semibold">
                  Publish to Team
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </CRMPermissionGate>
  );
}
