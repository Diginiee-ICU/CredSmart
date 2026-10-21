import React, { useState, useEffect, useMemo } from "react";
import {
  LifeBuoy,
  Plus,
  Search,
  Clock,
  AlertCircle,
  CheckCircle2,
  Filter,
  MessageSquare,
  User,
  Phone,
  MessageCircle,
  Building,
  Tag,
  Send,
  Sparkles,
  ChevronRight,
  Shield,
  AlertTriangle,
} from "lucide-react";
import { useOrganization } from "@/hooks/useOrganization";
import { useCRMPermission } from "@/hooks/useCRMPermission";
import { ROUTE_PATHS } from "@/config/routes";
import {
  CRMCard,
  CRMBadge,
  CRMPageHeader,
  CRMStatCard,
  CRMDataTable,
  type CRMColumnDef,
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

export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type TicketPriority = "urgent" | "high" | "normal" | "low";
export type TicketChannel = "whatsapp" | "phone" | "walk_in" | "internal";

export interface TicketMessage {
  id: string;
  sender_name: string;
  is_staff: boolean;
  message: string;
  created_at: string;
}

export interface CRMSupportTicket {
  id: string;
  ticket_number: string;
  org_id: string;
  subject: string;
  customer_name: string;
  customer_contact: string;
  channel: TicketChannel;
  priority: TicketPriority;
  status: TicketStatus;
  assigned_to: string;
  sla_hours_remaining: number; // positive = hours left, negative = overdue
  created_at: string;
  updated_at: string;
  messages: TicketMessage[];
}

const INITIAL_TICKETS: CRMSupportTicket[] = [
  {
    id: "tick-1",
    ticket_number: "TICK-1042",
    org_id: "",
    subject: "GST Credit Note Adjustment on Tax Invoice #INV-2026-088",
    customer_name: "Apex Retail Solutions (Rajesh Gupta)",
    customer_contact: "+91 98765 43210",
    channel: "whatsapp",
    priority: "urgent",
    status: "open",
    assigned_to: "Head Accountant",
    sla_hours_remaining: 1.5,
    created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 1).toISOString(),
    messages: [
      {
        id: "msg-101",
        sender_name: "Rajesh Gupta",
        is_staff: false,
        message: "Invoice #INV-2026-088 was charged at 18% GST instead of 5% for food grains. Need immediate revised e-invoice.",
        created_at: new Date(Date.now() - 3600000 * 2).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ],
  },
  {
    id: "tick-2",
    ticket_number: "TICK-1043",
    org_id: "",
    subject: "EDC Pos Terminal Timeout on ₹14,200 Payment",
    customer_name: "Sri Balaji Traders (Mohan Lal)",
    customer_contact: "+91 98111 22334",
    channel: "phone",
    priority: "high",
    status: "in_progress",
    assigned_to: "Pooja Verma",
    sla_hours_remaining: 4.0,
    created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 3).toISOString(),
    messages: [
      {
        id: "msg-102",
        sender_name: "Mohan Lal",
        is_staff: false,
        message: "Bank debited ₹14,200 but cashier terminal showed network error and did not print tax invoice.",
        created_at: new Date(Date.now() - 3600000 * 5).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
      {
        id: "msg-103",
        sender_name: "Pooja Verma",
        is_staff: true,
        message: "Requested payment gateway RRN log. Bank confirms settlement will reflect within 2 hours.",
        created_at: new Date(Date.now() - 3600000 * 3).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ],
  },
  {
    id: "tick-3",
    ticket_number: "TICK-1044",
    org_id: "",
    subject: "Missing 5 Crates of Basmati Rice from Inward Delivery",
    customer_name: "Internal Warehouse (Godown 1)",
    customer_contact: "Ext: 204",
    channel: "internal",
    priority: "normal",
    status: "in_progress",
    assigned_to: "Suresh Kumar",
    sla_hours_remaining: 12.0,
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 8).toISOString(),
    messages: [
      {
        id: "msg-104",
        sender_name: "Suresh Kumar",
        is_staff: true,
        message: "PO-402 specifies 50 crates, delivery truck unloader only delivered 45. Delivery challan marked with shortfall.",
        created_at: new Date(Date.now() - 3600000 * 12).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ],
  },
  {
    id: "tick-4",
    ticket_number: "TICK-1045",
    org_id: "",
    subject: "Loyalty Points Redemption on Customer Mobile #9872200112",
    customer_name: "Sunita Mehra (Walk-in)",
    customer_contact: "+91 98722 00112",
    channel: "walk_in",
    priority: "low",
    status: "resolved",
    assigned_to: "Rahul Sharma",
    sla_hours_remaining: 24.0,
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    updated_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    messages: [
      {
        id: "msg-105",
        sender_name: "Sunita Mehra",
        is_staff: false,
        message: "Unable to apply 500 reward points on billing counter.",
        created_at: new Date(Date.now() - 3600000 * 24).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
      {
        id: "msg-106",
        sender_name: "Rahul Sharma",
        is_staff: true,
        message: "OTP re-verified on POS system and ₹250 discount voucher applied successfully.",
        created_at: new Date(Date.now() - 3600000 * 4).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      },
    ],
  },
];

export default function Support(): React.ReactElement {
  const { orgId, org } = useOrganization();
  const { hasPermission, isSuperAdmin } = useCRMPermission();

  const canManage = isSuperAdmin || hasPermission("support", "manage");
  const storageKey = `credsmart_crm_support_tickets_${orgId || "default"}`;

  const [tickets, setTickets] = useState<CRMSupportTicket[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return INITIAL_TICKETS;
  });

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTicket, setActiveTicket] = useState<CRMSupportTicket | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [replyText, setReplyText] = useState("");

  // New ticket state
  const [newSubject, setNewSubject] = useState("");
  const [newCustomer, setNewCustomer] = useState("");
  const [newContact, setNewContact] = useState("");
  const [newChannel, setNewChannel] = useState<TicketChannel>("whatsapp");
  const [newPriority, setNewPriority] = useState<TicketPriority>("normal");
  const [newDescription, setNewDescription] = useState("");

  useEffect(() => {
    if (orgId) {
      localStorage.setItem(storageKey, JSON.stringify(tickets));
    }
  }, [tickets, storageKey, orgId]);

  // Metrics
  const metrics = useMemo(() => {
    const total = tickets.length;
    const openCount = tickets.filter((t) => t.status === "open").length;
    const inProgressCount = tickets.filter((t) => t.status === "in_progress").length;
    const atRiskCount = tickets.filter(
      (t) => (t.status === "open" || t.status === "in_progress") && t.sla_hours_remaining < 2
    ).length;
    const resolvedCount = tickets.filter((t) => t.status === "resolved" || t.status === "closed").length;
    const resolutionRate = total > 0 ? Math.round((resolvedCount / total) * 100) : 0;
    return { openCount, inProgressCount, atRiskCount, resolutionRate };
  }, [tickets]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const matchSearch =
        t.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.customer_name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchStatus = statusFilter === "all" ? true : t.status === statusFilter;
      const matchPriority = priorityFilter === "all" ? true : t.priority === priorityFilter;
      return matchSearch && matchStatus && matchPriority;
    });
  }, [tickets, searchQuery, statusFilter, priorityFilter]);

  const handleSendReply = () => {
    if (!activeTicket || !replyText.trim()) return;

    const newMsg: TicketMessage = {
      id: `msg-${Date.now()}`,
      sender_name: "You (Support Staff)",
      is_staff: true,
      message: replyText.trim(),
      created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const updated = {
      ...activeTicket,
      updated_at: new Date().toISOString(),
      messages: [...activeTicket.messages, newMsg],
    };

    setTickets((prev) => prev.map((t) => (t.id === activeTicket.id ? updated : t)));
    setActiveTicket(updated);
    setReplyText("");
    toast({
      title: "Reply Sent",
      description: "Note added to ticket history.",
    });
  };

  const handleUpdateStatus = (ticketId: string, nextStatus: TicketStatus) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === ticketId ? { ...t, status: nextStatus, updated_at: new Date().toISOString() } : t))
    );
    if (activeTicket && activeTicket.id === ticketId) {
      setActiveTicket((prev) => (prev ? { ...prev, status: nextStatus } : null));
    }
    toast({
      title: "Ticket Status Updated",
      description: `Marked as ${nextStatus.replace("_", " ")}.`,
    });
  };

  const handleCreateTicket = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newCustomer.trim()) {
      toast({ title: "Validation Error", description: "Subject and customer name are required", variant: "destructive" });
      return;
    }

    const created: CRMSupportTicket = {
      id: `tick-${Date.now()}`,
      ticket_number: `TICK-${Math.floor(1000 + Math.random() * 9000)}`,
      org_id: orgId || "",
      subject: newSubject.trim(),
      customer_name: newCustomer.trim(),
      customer_contact: newContact.trim() || "N/A",
      channel: newChannel,
      priority: newPriority,
      status: "open",
      assigned_to: "Unassigned",
      sla_hours_remaining: newPriority === "urgent" ? 2 : newPriority === "high" ? 6 : 24,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      messages: [
        {
          id: `msg-${Date.now()}`,
          sender_name: newCustomer.trim(),
          is_staff: false,
          message: newDescription.trim() || "Ticket opened by staff.",
          created_at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
      ],
    };

    setTickets((prev) => [created, ...prev]);
    setIsCreateOpen(false);
    setNewSubject("");
    setNewCustomer("");
    setNewContact("");
    setNewDescription("");
    toast({
      title: "Support Ticket Opened",
      description: `Ticket ${created.ticket_number} created successfully.`,
    });
  };

  const getPriorityBadge = (p: TicketPriority) => {
    switch (p) {
      case "urgent":
        return <CRMBadge variant="error" size="sm" dot>Urgent</CRMBadge>;
      case "high":
        return <CRMBadge variant="orange" size="sm">High</CRMBadge>;
      case "normal":
        return <CRMBadge variant="info" size="sm">Normal</CRMBadge>;
      case "low":
        return <CRMBadge variant="neutral" size="sm">Low</CRMBadge>;
    }
  };

  const getStatusBadge = (s: TicketStatus) => {
    switch (s) {
      case "open":
        return <CRMBadge variant="error" size="sm">Open</CRMBadge>;
      case "in_progress":
        return <CRMBadge variant="info" size="sm" dot>In Progress</CRMBadge>;
      case "resolved":
        return <CRMBadge variant="success" size="sm">Resolved</CRMBadge>;
      case "closed":
        return <CRMBadge variant="neutral" size="sm">Closed</CRMBadge>;
    }
  };

  const getChannelIcon = (c: TicketChannel) => {
    switch (c) {
      case "whatsapp":
        return <MessageCircle className="w-3.5 h-3.5 text-emerald-600" title="WhatsApp" />;
      case "phone":
        return <Phone className="w-3.5 h-3.5 text-blue-600" title="Phone Call" />;
      case "walk_in":
        return <User className="w-3.5 h-3.5 text-purple-600" title="Store Walk-in" />;
      case "internal":
        return <Building className="w-3.5 h-3.5 text-amber-600" title="Internal Staff" />;
    }
  };

  const columns: CRMColumnDef<CRMSupportTicket>[] = [
    {
      key: "ticket_number",
      header: "Ticket ID",
      accessor: (row) => (
        <span className="font-mono text-xs font-bold text-[#1D4ED8]">
          {row.ticket_number}
        </span>
      ),
      sortable: true,
    },
    {
      key: "subject",
      header: "Subject & Customer",
      accessor: (row) => (
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm line-clamp-1">
            {row.subject}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
            {getChannelIcon(row.channel)}
            <span className="truncate max-w-[200px]">{row.customer_name}</span>
          </div>
        </div>
      ),
      sortable: true,
    },
    {
      key: "priority",
      header: "Priority",
      accessor: (row) => getPriorityBadge(row.priority),
      sortable: true,
    },
    {
      key: "status",
      header: "Status",
      accessor: (row) => getStatusBadge(row.status),
      sortable: true,
    },
    {
      key: "sla_hours_remaining",
      header: "SLA Target",
      accessor: (row) => {
        const isClosed = row.status === "resolved" || row.status === "closed";
        if (isClosed) {
          return <span className="text-[11px] font-mono text-slate-400">Resolved ✓</span>;
        }
        const isBreached = row.sla_hours_remaining <= 0;
        const isWarning = row.sla_hours_remaining <= 2;
        return (
          <span
            className={cn(
              "font-mono text-[11px] font-bold tabular-nums px-2 py-0.5 rounded",
              isBreached
                ? "bg-rose-50 text-rose-700 border border-rose-200"
                : isWarning
                ? "bg-amber-50 text-amber-700 border border-amber-200"
                : "text-slate-600 dark:text-slate-400"
            )}
          >
            {isBreached ? "SLA Breached" : `${row.sla_hours_remaining}h left`}
          </span>
        );
      },
      sortable: true,
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (row) => (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setActiveTicket(row)}
          className="h-7 text-xs px-2.5 text-blue-600 border-blue-200 hover:bg-blue-50"
        >
          View Thread
        </Button>
      ),
    },
  ];

  return (
    <CRMPermissionGate
      module="support"
      action="view"
      fallback={
        <div className="p-8 max-w-xl mx-auto text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <LifeBuoy className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Support Desk Access Restricted</h2>
          <p className="text-sm text-slate-600">
            You do not have permission to view support desk tickets. Contact your manager for access.
          </p>
        </div>
      }
    >
      <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 pb-20">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-5">
          <div className="max-w-7xl mx-auto">
            <CRMPageHeader
              title="Customer & Internal Support Desk"
              subtitle={`${org?.name ? `${org.name} • ` : ""}Omnichannel customer tickets, resolution SLA tracking, and internal escalation queue`}
              breadcrumbs={[
                { label: "Home", href: "/" },
                { label: "CRM", href: ROUTE_PATHS.crm },
                { label: "Support", href: ROUTE_PATHS.crmSupport },
              ]}
              badge={
                <div className="flex items-center gap-2">
                  <CRMBadge variant="info" size="sm">
                    Phase 6 Active
                  </CRMBadge>
                  <CRMBadge variant="success" size="sm" dot>
                    SLA Live
                  </CRMBadge>
                </div>
              }
              actions={
                <Button
                  onClick={() => setIsCreateOpen(true)}
                  size="sm"
                  className="bg-[#0EA5E9] hover:bg-sky-600 text-white gap-1.5 text-xs h-9 shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Open Ticket</span>
                </Button>
              }
            />
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
          {/* Metrics */}
          <section aria-label="Support Desk Metrics">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <CRMStatCard
                label="Open Tickets"
                value={metrics.openCount}
                icon={LifeBuoy}
                accent="navy"
                description="Needs Attention"
              />
              <CRMStatCard
                label="In Progress"
                value={metrics.inProgressCount}
                icon={Clock}
                accent="blue"
                description="Being Handled"
              />
              <CRMStatCard
                label="SLA At Risk"
                value={metrics.atRiskCount}
                icon={AlertTriangle}
                accent="orange"
                description="Less than 2h Left"
              />
              <CRMStatCard
                label="Resolution Rate"
                value={`${metrics.resolutionRate}%`}
                icon={CheckCircle2}
                accent="emerald"
                description="Closed Successfully"
              />
            </div>
          </section>

          {/* Filter Bar */}
          <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search ticket #, customer, or subject..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[130px] h-9 text-xs border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[130px] h-9 text-xs border-slate-200 dark:border-slate-800">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </section>

          {/* Tickets Data Table */}
          <CRMCard variant="default" className="shadow-2xs">
            <CRMDataTable
              data={filteredTickets}
              columns={columns}
              searchPlaceholder=""
              pageSize={10}
              emptyMessage="No support tickets match the selected criteria."
            />
          </CRMCard>
        </main>

        {/* Modal: View Ticket Thread & Reply */}
        <Dialog open={Boolean(activeTicket)} onOpenChange={(open) => !open && setActiveTicket(null)}>
          <DialogContent className="sm:max-w-xl">
            {activeTicket && (
              <>
                <DialogHeader>
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-bold text-[#1D4ED8]">
                      {activeTicket.ticket_number}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {getPriorityBadge(activeTicket.priority)}
                      {getStatusBadge(activeTicket.status)}
                    </div>
                  </div>
                  <DialogTitle className="text-base font-bold text-left pt-1">
                    {activeTicket.subject}
                  </DialogTitle>
                  <DialogDescription className="text-xs text-left">
                    Customer: <strong>{activeTicket.customer_name}</strong> • Contact: {activeTicket.customer_contact}
                  </DialogDescription>
                </DialogHeader>

                {/* Status Switcher */}
                {canManage && (
                  <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/70 text-xs">
                    <span className="text-slate-500 font-medium">Update Status:</span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="sm"
                        variant={activeTicket.status === "in_progress" ? "default" : "outline"}
                        onClick={() => handleUpdateStatus(activeTicket.id, "in_progress")}
                        className="h-7 text-[11px] px-2"
                      >
                        In Progress
                      </Button>
                      <Button
                        size="sm"
                        variant={activeTicket.status === "resolved" ? "default" : "outline"}
                        onClick={() => handleUpdateStatus(activeTicket.id, "resolved")}
                        className="h-7 text-[11px] px-2 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                      >
                        Mark Resolved
                      </Button>
                    </div>
                  </div>
                )}

                {/* Message Thread */}
                <div className="space-y-3 max-h-[280px] overflow-y-auto p-1">
                  {activeTicket.messages.map((m) => (
                    <div
                      key={m.id}
                      className={cn(
                        "p-3 rounded-xl text-xs space-y-1",
                        m.is_staff
                          ? "bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 ml-6"
                          : "bg-slate-50 dark:bg-slate-800 border border-slate-200/80 mr-6"
                      )}
                    >
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-700 dark:text-slate-200">
                        <span>{m.sender_name}</span>
                        <span className="font-mono text-[10px] text-slate-400 font-normal">{m.created_at}</span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-300 leading-relaxed">{m.message}</p>
                    </div>
                  ))}
                </div>

                {/* Add Reply */}
                <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <Textarea
                    placeholder="Type an internal note or customer reply..."
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    className="text-xs min-h-[60px]"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveTicket(null)}
                      className="text-xs h-8"
                    >
                      Close
                    </Button>
                    <Button
                      type="button"
                      onClick={handleSendReply}
                      disabled={!replyText.trim()}
                      className="text-xs h-8 bg-[#0EA5E9] hover:bg-sky-600 text-white gap-1"
                    >
                      <Send className="w-3 h-3" />
                      <span>Post Reply</span>
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* Modal: Open Support Ticket */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Open Support Ticket</DialogTitle>
              <DialogDescription className="text-xs">
                Log a customer grievance, payment mismatch, or internal store issue.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateTicket} className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Subject *
                </label>
                <Input
                  required
                  placeholder="e.g. GST Credit Note adjustment on bill"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Customer / Source *
                  </label>
                  <Input
                    required
                    placeholder="Customer name..."
                    value={newCustomer}
                    onChange={(e) => setNewCustomer(e.target.value)}
                    className="text-xs h-9"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Phone / Contact
                  </label>
                  <Input
                    placeholder="+91 98..."
                    value={newContact}
                    onChange={(e) => setNewContact(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Intake Channel
                  </label>
                  <Select value={newChannel} onValueChange={(v) => setNewChannel(v as TicketChannel)}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="whatsapp">WhatsApp</SelectItem>
                      <SelectItem value="phone">Phone Call</SelectItem>
                      <SelectItem value="walk_in">Store Walk-in</SelectItem>
                      <SelectItem value="internal">Internal Staff</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Priority
                  </label>
                  <Select value={newPriority} onValueChange={(v) => setNewPriority(v as TicketPriority)}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgent (2h SLA)</SelectItem>
                      <SelectItem value="high">High (6h SLA)</SelectItem>
                      <SelectItem value="normal">Normal (24h SLA)</SelectItem>
                      <SelectItem value="low">Low (48h SLA)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Initial Description
                </label>
                <Textarea
                  placeholder="Details of the issue or request..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="text-xs min-h-[70px]"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                  className="text-xs h-9"
                >
                  Cancel
                </Button>
                <Button type="submit" className="text-xs h-9 bg-[#0EA5E9] hover:bg-sky-600 text-white font-semibold">
                  Open Ticket
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </CRMPermissionGate>
  );
}
