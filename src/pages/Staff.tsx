import { useState, useEffect, useMemo, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useOrganization } from "@/hooks/useOrganization";
import { useAuth } from "@/hooks/useAuth";
import {
  UserPlus,
  Shield,
  Users,
  Trash2,
  Clock,
  Mail,
  XCircle,
  CheckCircle2,
  ShieldCheck,
  UserCheck,
  KeyRound,
  RotateCw,
  Crown,
  Briefcase,
  User,
  ShoppingBag,
  Truck,
  Boxes,
  Handshake,
  Laptop,
  Calculator,
  Check,
  X,
  Sparkles,
  Info,
  ChevronRight,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { normalizeError } from "@/lib/normalizeError";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MANAGER_ROLES, DetailedAppRole } from "@/config/routes";

type AppRole =
  | "admin"
  | "partner"
  | "stock_manager"
  | "salesman"
  | "delivery_boy"
  | "accountant"
  | "cashier"
  | "store_owner"
  | "super_admin"
  | "manager";

type InviteStatus = "pending" | "accepted" | "expired" | "cancelled";

interface Member {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  profile?: { full_name: string | null; avatar_url: string | null };
}

interface Invitation {
  id: string;
  email: string;
  role: AppRole;
  status: InviteStatus;
  created_at: string;
  expires_at: string;
}

interface RoleDefinition {
  id: AppRole;
  title: string;
  tagline: string;
  colorClass: string;
  bgLightClass: string;
  badgeClass: string;
  icon: LucideIcon;
  illustrationSvg: ReactNode;
  summary: string;
  permissions: {
    sales: boolean | string;
    pos: boolean | string;
    purchases: boolean | string;
    inventory: boolean | string;
    reports: boolean | string;
    cashBank: boolean | string;
    staffManagement: boolean | string;
    settings: boolean | string;
    deleteRecords: boolean | string;
  };
}

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    id: "salesman",
    title: "Salesman",
    tagline: "Field & Counter Sales",
    colorClass: "text-blue-600 dark:text-blue-400",
    bgLightClass: "bg-blue-50/60 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800/60",
    badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300 border-blue-200 dark:border-blue-800",
    icon: ShoppingBag,
    summary: "Take customer sales orders, generate quotations, issue sales invoices, and manage customer directory on phone or counter.",
    illustrationSvg: (
      <svg className="w-full h-full max-h-24 object-contain" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="140" rx="12" fill="#EFF6FF" />
        {/* Background Decorative */}
        <circle cx="150" cy="40" r="28" fill="#DBEAFE" />
        <path d="M20 120H180" stroke="#93C5FD" strokeWidth="2" strokeDasharray="4 4" />
        {/* Character with phone */}
        <path d="M100 120V78C100 68 108 60 118 60H122C132 60 140 68 140 78V120" fill="#1E40AF" />
        <circle cx="120" cy="42" r="16" fill="#FDBA74" />
        <path d="M110 38C110 30 116 26 126 26C134 26 138 30 138 38C134 38 128 35 120 35C114 35 110 38 110 38Z" fill="#1E293B" />
        {/* Smartphone in hand */}
        <rect x="72" y="55" width="24" height="42" rx="4" fill="#3B82F6" stroke="#1D4ED8" strokeWidth="2" />
        <rect x="76" y="60" width="16" height="24" rx="2" fill="#FFFFFF" />
        <path d="M80 66H88M80 72H85" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="84" cy="91" r="2" fill="#EFF6FF" />
        <path d="M96 74L105 82" stroke="#FDBA74" strokeWidth="4" strokeLinecap="round" />
      </svg>
    ),
    permissions: {
      sales: "Create & View Invoices, Quotations",
      pos: "Full POS Billing Terminal Access",
      purchases: false,
      inventory: "View Item Catalog & Rates",
      reports: false,
      cashBank: false,
      staffManagement: false,
      settings: false,
      deleteRecords: false,
    },
  },
  {
    id: "delivery_boy",
    title: "Delivery Boy",
    tagline: "Order Delivery & Cash Collection",
    colorClass: "text-amber-600 dark:text-amber-400",
    bgLightClass: "bg-amber-50/60 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60",
    badgeClass: "bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300 border-amber-200 dark:border-amber-800",
    icon: Truck,
    summary: "View delivery dispatch orders, update status (Out for Delivery / Delivered / Returned), collect cash or UPI, and view customer address.",
    illustrationSvg: (
      <svg className="w-full h-full max-h-24 object-contain" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="140" rx="12" fill="#FFFBEB" />
        <circle cx="60" cy="50" r="32" fill="#FEF3C7" />
        <path d="M10 120H190" stroke="#FDE68A" strokeWidth="2" strokeDasharray="4 4" />
        {/* Scooter */}
        <circle cx="65" cy="105" r="14" fill="#475569" stroke="#0F172A" strokeWidth="3" />
        <circle cx="145" cy="105" r="14" fill="#475569" stroke="#0F172A" strokeWidth="3" />
        <path d="M65 105L85 85H125L145 105" stroke="#D97706" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        {/* Parcel Box on rear */}
        <rect x="50" y="65" width="25" height="22" rx="3" fill="#D97706" stroke="#92400E" strokeWidth="2" />
        <path d="M50 76H75M62 65V87" stroke="#FEF3C7" strokeWidth="1.5" />
        {/* Rider */}
        <circle cx="108" cy="45" r="11" fill="#FDBA74" />
        <path d="M100 42C100 34 105 32 114 32C122 32 126 34 126 42H100Z" fill="#D97706" />
        <path d="M98 56C98 56 102 80 115 80C125 80 130 56 130 56" fill="#047857" />
      </svg>
    ),
    permissions: {
      sales: "View Assigned Delivery Challans",
      pos: "Record Payment Collected",
      purchases: false,
      inventory: false,
      reports: false,
      cashBank: false,
      staffManagement: false,
      settings: false,
      deleteRecords: false,
    },
  },
  {
    id: "stock_manager",
    title: "Stock Manager",
    tagline: "Warehouse & Inventory Control",
    colorClass: "text-emerald-600 dark:text-emerald-400",
    bgLightClass: "bg-emerald-50/60 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60",
    badgeClass: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800",
    icon: Boxes,
    summary: "Manage product stock levels, create items, record inward purchase bills, transfer between godowns, and print barcode labels.",
    illustrationSvg: (
      <svg className="w-full h-full max-h-24 object-contain" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="140" rx="12" fill="#ECFDF5" />
        <circle cx="140" cy="50" r="30" fill="#D1FAE5" />
        <path d="M15 120H185" stroke="#A7F3D0" strokeWidth="2" strokeDasharray="4 4" />
        {/* Stack of boxes */}
        <rect x="40" y="80" width="36" height="34" rx="3" fill="#D97706" stroke="#B45309" strokeWidth="2" />
        <rect x="78" y="75" width="38" height="39" rx="3" fill="#F59E0B" stroke="#D97706" strokeWidth="2" />
        <rect x="55" y="48" width="34" height="30" rx="3" fill="#FBBF24" stroke="#D97706" strokeWidth="2" />
        {/* Stock Manager Character */}
        <circle cx="142" cy="42" r="14" fill="#FDBA74" />
        <path d="M130 38C130 28 138 24 148 24C156 24 160 28 160 38H130Z" fill="#065F46" />
        <path d="M125 120V72C125 64 133 58 142 58C151 58 160 64 160 72V120" fill="#047857" />
        {/* Clipboard */}
        <rect x="110" y="65" width="18" height="26" rx="2" fill="#FFFFFF" stroke="#065F46" strokeWidth="1.5" />
        <path d="M114 72H124M114 78H120" stroke="#047857" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    ),
    permissions: {
      sales: false,
      pos: "Item Stock Adjustments & Scanning",
      purchases: "Full Inward Purchase Bills & Returns",
      inventory: "Complete Items, Batches, Godowns & Barcode Labels",
      reports: "Stock Summary & Low Stock Reports",
      cashBank: false,
      staffManagement: false,
      settings: false,
      deleteRecords: false,
    },
  },
  {
    id: "partner",
    title: "Partner",
    tagline: "Co-Owner & Business Partner",
    colorClass: "text-purple-600 dark:text-purple-400",
    bgLightClass: "bg-purple-50/60 dark:bg-purple-950/40 border-purple-200 dark:border-purple-800/60",
    badgeClass: "bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300 border-purple-200 dark:border-purple-800",
    icon: Handshake,
    summary: "Full operational authority and financial oversight across Sales, Purchases, Ledgers, Cash & Bank, Profit & Loss, and Analytics.",
    illustrationSvg: (
      <svg className="w-full h-full max-h-24 object-contain" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="140" rx="12" fill="#FAF5FF" />
        <circle cx="100" cy="50" r="35" fill="#F3E8FF" />
        <path d="M20 120H180" stroke="#E9D5FF" strokeWidth="2" strokeDasharray="4 4" />
        {/* Partner 1 */}
        <circle cx="70" cy="40" r="13" fill="#FDBA74" />
        <path d="M60 36C60 28 66 25 76 25C84 25 88 28 88 36H60Z" fill="#1E1B4B" />
        <path d="M52 120V70C52 62 60 56 70 56C78 56 84 60 86 66L95 80L80 95V120" fill="#4338CA" />
        {/* Partner 2 */}
        <circle cx="130" cy="40" r="13" fill="#FDBA74" />
        <path d="M120 36C120 28 126 25 136 25C144 25 148 28 148 36H120Z" fill="#064E3B" />
        <path d="M148 120V70C148 62 140 56 130 56C122 56 116 60 114 66L105 80L120 95V120" fill="#047857" />
        {/* Handshake center */}
        <circle cx="100" cy="80" r="8" fill="#FDBA74" stroke="#4338CA" strokeWidth="1.5" />
      </svg>
    ),
    permissions: {
      sales: "Full Unrestricted Access",
      pos: "Full POS Access",
      purchases: "Full Unrestricted Access",
      inventory: "Full Catalog & Godowns Access",
      reports: "Full Profit & Loss, GSTR & Analytics",
      cashBank: "Full Cash, Bank & UPI Access",
      staffManagement: "View Staff & Monitor Activity",
      settings: "Store & Invoice Configurations",
      deleteRecords: "Authorized with Audit Trail",
    },
  },
  {
    id: "admin",
    title: "Admin",
    tagline: "Super Admin / Complete Control",
    colorClass: "text-rose-600 dark:text-rose-400",
    bgLightClass: "bg-rose-50/60 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800/60",
    badgeClass: "bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300 border-rose-200 dark:border-rose-800",
    icon: Laptop,
    summary: "100% unrestricted administrative authority across the entire business. Manage staff invitations, permissions, store settings, tax rules, and ledgers.",
    illustrationSvg: (
      <svg className="w-full h-full max-h-24 object-contain" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="140" rx="12" fill="#FFF1F2" />
        <circle cx="100" cy="45" r="32" fill="#FFE4E6" />
        <path d="M15 120H185" stroke="#FECDD3" strokeWidth="2" strokeDasharray="4 4" />
        {/* Admin Desk & Computer */}
        <rect x="50" y="90" width="100" height="28" rx="4" fill="#BE123C" />
        <rect x="75" y="58" width="50" height="32" rx="3" fill="#0F172A" stroke="#475569" strokeWidth="2" />
        <rect x="79" y="62" width="42" height="24" rx="2" fill="#38BDF8" />
        <path d="M96 90V98M88 98H112" stroke="#475569" strokeWidth="2" strokeLinecap="round" />
        {/* Shield Icon on screen */}
        <circle cx="100" cy="74" r="6" fill="#FFFFFF" />
        {/* Admin Crown/User */}
        <circle cx="100" cy="30" r="12" fill="#FDBA74" />
        <path d="M92 18L96 22L100 18L104 22L108 18L106 24H94L92 18Z" fill="#F59E0B" />
      </svg>
    ),
    permissions: {
      sales: "100% Full Access",
      pos: "100% Full Access",
      purchases: "100% Full Access",
      inventory: "100% Full Access",
      reports: "100% Full Access",
      cashBank: "100% Full Access",
      staffManagement: "100% Full Access (Invite / Remove / Roles)",
      settings: "100% Full Access",
      deleteRecords: "100% Full Access",
    },
  },
  {
    id: "accountant",
    title: "Accountant",
    tagline: "Tax, Ledgers & CA Reporting",
    colorClass: "text-indigo-600 dark:text-indigo-400",
    bgLightClass: "bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800/60",
    badgeClass: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800",
    icon: Calculator,
    summary: "Manage cash & bank reconciliations, expenses, GSTR-1 & GSTR-3B tax reports, sales & purchase registers, and CA audit sharing.",
    illustrationSvg: (
      <svg className="w-full h-full max-h-24 object-contain" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="140" rx="12" fill="#EEF2FF" />
        <circle cx="150" cy="45" r="28" fill="#E0E7FF" />
        <path d="M20 120H180" stroke="#C7D2FE" strokeWidth="2" strokeDasharray="4 4" />
        {/* Accountant */}
        <circle cx="75" cy="40" r="14" fill="#FDBA74" />
        <path d="M64 36C64 26 72 22 82 22C90 22 96 26 96 36H64Z" fill="#1E1B4B" />
        <path d="M58 120V72C58 64 66 58 76 58C86 58 94 64 94 72V120" fill="#4338CA" />
        {/* Calculator / Ledger */}
        <rect x="110" y="55" width="45" height="58" rx="4" fill="#312E81" stroke="#1E1B4B" strokeWidth="2" />
        <rect x="116" y="62" width="33" height="14" rx="2" fill="#A5B4FC" />
        <circle cx="122" cy="85" r="3" fill="#FFFFFF" />
        <circle cx="132" cy="85" r="3" fill="#FFFFFF" />
        <circle cx="142" cy="85" r="3" fill="#FFFFFF" />
        <circle cx="122" cy="98" r="3" fill="#FFFFFF" />
        <circle cx="132" cy="98" r="3" fill="#FFFFFF" />
        <circle cx="142" cy="98" r="3" fill="#10B981" />
      </svg>
    ),
    permissions: {
      sales: "View All Sales Invoices & Registers",
      pos: false,
      purchases: "View All Purchase Bills & Registers",
      inventory: "View Valuation & Stock Registers",
      reports: "Complete GSTR, P&L, Balance Sheet, Ledger Statement",
      cashBank: "Full Cash & Bank Reconciliations",
      staffManagement: false,
      settings: "CA Sharing & Tax Rates",
      deleteRecords: false,
    },
  },
  {
    id: "cashier",
    title: "Cashier",
    tagline: "Counter Checkout & POS Terminal",
    colorClass: "text-teal-600 dark:text-teal-400",
    bgLightClass: "bg-teal-50/60 dark:bg-teal-950/40 border-teal-200 dark:border-teal-800/60",
    badgeClass: "bg-teal-100 text-teal-800 dark:bg-teal-900/60 dark:text-teal-300 border-teal-200 dark:border-teal-800",
    icon: User,
    summary: "Dedicated POS billing cashier terminal. Search items, scan barcodes, print receipts, collect payments, and manage customer contacts.",
    illustrationSvg: (
      <svg className="w-full h-full max-h-24 object-contain" viewBox="0 0 200 140" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="200" height="140" rx="12" fill="#F0FDFA" />
        <circle cx="60" cy="45" r="28" fill="#CCFBF1" />
        <path d="M15 120H185" stroke="#99F6E4" strokeWidth="2" strokeDasharray="4 4" />
        {/* POS Counter Terminal */}
        <rect x="90" y="70" width="70" height="48" rx="4" fill="#0F766E" />
        <rect x="100" y="50" width="50" height="28" rx="3" fill="#134E4A" />
        <rect x="104" y="54" width="42" height="20" rx="2" fill="#5EEAD4" />
        {/* Cashier Person */}
        <circle cx="60" cy="45" r="14" fill="#FDBA74" />
        <path d="M48 40C48 30 56 26 66 26C74 26 80 30 80 40H48Z" fill="#134E4A" />
        <path d="M42 120V72C42 64 50 58 60 58C70 58 78 64 78 72V120" fill="#0D9488" />
        {/* Barcode Scanner Gun */}
        <path d="M78 80L90 74L88 88L78 86" fill="#F59E0B" />
      </svg>
    ),
    permissions: {
      sales: "Create POS Sales & Print Receipts",
      pos: "Full POS Billing Terminal Access",
      purchases: false,
      inventory: "View Item Prices & Search",
      reports: false,
      cashBank: false,
      staffManagement: false,
      settings: false,
      deleteRecords: false,
    },
  },
];

const roleLabelsMap: Record<string, string> = {
  admin: "Admin (Full Control)",
  super_admin: "Admin (Full Control)",
  store_owner: "Store Owner (Admin)",
  partner: "Partner (Co-Owner)",
  stock_manager: "Stock Manager (Inventory & Purchases)",
  salesman: "Salesman (Field & Counter Sales)",
  delivery_boy: "Delivery Boy (Dispatch & Payments)",
  accountant: "Accountant (Taxes & Ledgers)",
  cashier: "Cashier (POS & Billing)",
  manager: "Partner / Manager",
};

const statusIcons: Record<InviteStatus, React.ReactNode> = {
  pending: <Clock className="w-3.5 h-3.5 text-amber-600" />,
  accepted: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
  expired: <XCircle className="w-3.5 h-3.5 text-muted-foreground" />,
  cancelled: <XCircle className="w-3.5 h-3.5 text-rose-600" />,
};

export default function Staff() {
  const { orgId, loading: orgLoading, userRole } = useOrganization();
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  // Invite Form
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("salesman");
  const [inviting, setInviting] = useState(false);

  // Active Role Modal Details
  const [selectedRoleDetail, setSelectedRoleDetail] = useState<RoleDefinition | null>(null);

  const canManageStaff =
    userRole === "admin" ||
    userRole === "partner" ||
    (userRole ? MANAGER_ROLES.includes(userRole as (typeof MANAGER_ROLES)[number]) : false);

  useEffect(() => {
    if (orgLoading) return;

    if (!orgId) {
      setMembers([]);
      setInvitations([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    Promise.all([fetchMembers(orgId), fetchInvitations(orgId)]).finally(() => {
      setLoading(false);
    });
  }, [orgId, orgLoading]);

  const fetchMembers = async (oid: string) => {
    try {
      const { data, error } = await supabase
        .from("organization_memberships")
        .select("id, user_id, role, created_at")
        .eq("organization_id", oid)
        .order("created_at", { ascending: true });

      if (error) throw error;
      if (!data) {
        setMembers([]);
        return;
      }

      const userIds = data.map((m) => m.user_id).filter(Boolean);
      let profiles: Array<{ id: string; full_name: string | null; avatar_url: string | null }> | undefined = [];
      if (userIds.length > 0) {
        const { data: profilesData, error: profilesErr } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);
        if (profilesErr) console.warn("Failed to load profiles:", profilesErr.message);
        profiles = profilesData || [];
      }

      const enriched: Member[] = data.map((m) => ({
        ...m,
        role: (m.role as AppRole) || "cashier",
        profile: profiles?.find((p) => p.id === m.user_id) || undefined,
      }));
      setMembers(enriched);
    } catch (err: unknown) {
      console.error("fetchMembers failed:", err);
      setMembers([]);
      toast({ title: "Error", description: normalizeError(err), variant: "destructive" });
    }
  };

  const fetchInvitations = async (oid: string) => {
    try {
      const { data, error } = await supabase
        .from("staff_invitations")
        .select("id, email, role, status, created_at, expires_at")
        .eq("organization_id", oid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setInvitations((data as Invitation[]) || []);
    } catch (err: unknown) {
      console.error("fetchInvitations failed:", err);
      setInvitations([]);
      toast({ title: "Error", description: normalizeError(err), variant: "destructive" });
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail.trim() || !orgId) return;
    setInviting(true);

    const email = inviteEmail.trim().toLowerCase();

    try {
      const res = await supabase.functions.invoke("invite-staff", {
        body: {
          email,
          role: inviteRole,
          organization_id: orgId,
        },
      });

      const result = (res as any)?.data;
      if (res.error || !result || result.error) {
        throw new Error(res.error?.message || result?.error || "Edge function invite failed");
      }

      toast({ title: "Invitation Sent!", description: result?.message || `Invite sent to ${email} as ${roleLabelsMap[inviteRole]}` });
      setInviteEmail("");
      fetchInvitations(orgId);
    } catch (err: unknown) {
      console.warn("Edge function invite failed, using direct DB fallback:", normalizeError(err));
      try {
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
        const { error: dbError } = await supabase
          .from("staff_invitations")
          .insert({
            organization_id: orgId,
            email,
            role: inviteRole,
            status: "pending",
            invited_by: user?.id || "",
            expires_at: expiresAt,
          });

        if (dbError) throw dbError;

        toast({
          title: "Invitation Recorded",
          description: `Invitation for ${email} as ${roleLabelsMap[inviteRole]} created successfully.`,
        });
        setInviteEmail("");
        fetchInvitations(orgId);
      } catch (fallbackError: unknown) {
        console.error("Direct invitation fallback error:", fallbackError);
        toast({
          title: "Invite Failed",
          description: normalizeError(fallbackError) || "Failed to invite staff member",
          variant: "destructive",
        });
      }
    } finally {
      setInviting(false);
    }
  };

  const cancelInvitation = async (invId: string) => {
    const { error } = await supabase
      .from("staff_invitations")
      .update({ status: "cancelled" })
      .eq("id", invId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Invitation Cancelled" });
      if (orgId) fetchInvitations(orgId);
    }
  };

  const resendInvite = async (inv: Invitation) => {
    if (!orgId) return;
    setInviting(true);
    try {
      await supabase.from("staff_invitations").update({ status: "cancelled" }).eq("id", inv.id);

      const res = await supabase.functions.invoke("invite-staff", {
        body: { email: inv.email, role: inv.role, organization_id: orgId },
      });

      if (res.error || !res.data || (res.data as any).error) {
        throw new Error(res.error?.message || (res.data as any)?.error || "Failed to resend invite via Edge Function");
      }

      toast({ title: "Invitation Resent", description: `New invite sent to ${inv.email}` });
      fetchInvitations(orgId);
    } catch (err: unknown) {
      console.warn("Resend Edge function failed, using DB fallback:", normalizeError(err));
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      const { error: insertErr } = await supabase.from("staff_invitations").insert({
        organization_id: orgId,
        email: inv.email,
        role: inv.role,
        status: "pending",
        invited_by: user?.id || "",
        expires_at: expiresAt,
      });

      if (insertErr) {
        toast({ title: "Error", description: insertErr.message, variant: "destructive" });
      } else {
        toast({ title: "Invitation Renewed", description: `Pending invite renewed for ${inv.email}` });
        fetchInvitations(orgId);
      }
    } finally {
      setInviting(false);
    }
  };

  const updateRole = async (membershipId: string, newRole: AppRole) => {
    if (!canManageStaff) {
      toast({ title: "Permission Denied", description: "Only admins or owners can update roles.", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("organization_memberships")
      .update({ role: newRole })
      .eq("id", membershipId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role Updated", description: `Role changed to ${roleLabelsMap[newRole] || newRole}` });
      if (orgId) fetchMembers(orgId);
    }
  };

  const removeMember = async (membershipId: string, userId: string) => {
    if (!canManageStaff) {
      toast({ title: "Permission Denied", description: "Only owners or admins can remove staff.", variant: "destructive" });
      return;
    }
    if (userId === user?.id) {
      toast({ title: "Error", description: "You cannot remove yourself", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("organization_memberships")
      .delete()
      .eq("id", membershipId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Member Removed" });
      if (orgId) fetchMembers(orgId);
    }
  };

  const pendingInvites = invitations.filter((i) => i.status === "pending");
  const pastInvites = invitations.filter((i) => i.status !== "pending");

  if (orgLoading || loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="page-wrapper max-w-6xl space-y-6 font-sans">
      {/* Header */}
      <div className="page-header flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="page-title flex items-center gap-2.5 text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-sans">
              <Users className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              Staff Roles &amp; Team Permissions
            </h1>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>RBAC SYSTEM</span>
            </span>
          </div>
          <p className="page-subtitle text-sm text-slate-500 dark:text-slate-400 mt-1">
            Configure salesmen, delivery boys, stock managers, partners, accountants, and cashier terminals
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-3 py-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-slate-200 dark:border-slate-800 text-xs font-semibold gap-1.5 shadow-xs rounded-xl">
            <UserCheck className="w-3.5 h-3.5 text-emerald-600 mr-1" />
            {members.length} Active {members.length === 1 ? "Member" : "Members"}
          </Badge>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 1. VISUAL ROLE EXPLORER RIBBON - 3D Frosted Glass */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="glass-card-3d p-4 sm:p-5 space-y-3 rounded-2xl">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
              Explore User Roles &amp; Capabilities
            </h2>
          </div>
          <span className="text-xs text-slate-500 dark:text-slate-400">Click any role to inspect permissions</span>
        </div>

        {/* Roles Carousel Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 pt-1">
          {ROLE_DEFINITIONS.map((r) => {
            const isSelected = inviteRole === r.id;
            const Icon = r.icon;
            return (
              <div
                key={r.id}
                onClick={() => {
                  setInviteRole(r.id);
                  setSelectedRoleDetail(r);
                }}
                className={cn(
                  "rounded-2xl border p-2.5 flex flex-col items-center justify-between text-center transition-all cursor-pointer group hover:shadow-md",
                  isSelected
                    ? "border-amber-500/80 ring-2 ring-amber-500/30 bg-amber-50/20 dark:bg-amber-950/20 shadow-sm"
                    : "border-slate-200/80 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 hover:border-amber-400/50"
                )}
              >
                {/* Visual Illustration */}
                <div className="w-full h-20 rounded-xl overflow-hidden flex items-center justify-center p-1 bg-white/90 dark:bg-slate-950/80 mb-2 border border-slate-100 dark:border-slate-800 group-hover:scale-105 transition-transform">
                  {r.illustrationSvg}
                </div>

                <div className="space-y-0.5 w-full">
                  <div className="flex items-center justify-center gap-1">
                    <Icon className={cn("w-3.5 h-3.5", r.colorClass)} />
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate">
                      {r.title}
                    </span>
                  </div>
                  <p className="text-[10px] text-muted-foreground truncate leading-tight">
                    {r.tagline}
                  </p>
                </div>

                <div className="mt-2 w-full pt-1.5 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-center">
                  <span className={cn("text-[10px] font-semibold flex items-center gap-0.5", isSelected ? "text-amber-600 dark:text-amber-400 font-bold" : "text-slate-500")}>
                    {isSelected ? <Check className="w-3 h-3" /> : null}
                    {isSelected ? "Selected" : "Select"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 2. INVITE NEW STAFF MEMBER - 3D Frosted Glass */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="glass-card-3d p-5 sm:p-6 space-y-4 rounded-2xl">
        <div className="flex items-center gap-2.5 pb-2 border-b border-slate-200/80 dark:border-slate-800">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <UserPlus className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Invite New Staff Member</h2>
            <p className="text-xs text-muted-foreground">
              Select a role and enter their email address to send sign-in access.
            </p>
          </div>
        </div>

        {!canManageStaff && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 font-medium">
            Read-only mode: Administrator or Owner privileges are required to invite new staff members or update roles.
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 pt-1">
          <div className="relative flex-1">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              type="email"
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              placeholder="colleague@example.com"
              className="pl-10 h-10 rounded-xl text-xs"
              disabled={!canManageStaff}
              onKeyDown={(e) => e.key === "Enter" && canManageStaff && handleInvite()}
            />
          </div>

          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as AppRole)}
            disabled={!canManageStaff}
            className="h-10 px-3 rounded-xl border border-input bg-background text-xs font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 w-full sm:w-64 disabled:opacity-60 cursor-pointer"
          >
            {ROLE_DEFINITIONS.map((r) => (
              <option key={r.id} value={r.id}>
                {r.title} ({r.tagline})
              </option>
            ))}
          </select>

          <Button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim() || !canManageStaff}
            className="h-10 px-5 rounded-xl text-xs font-bold shadow-sm cursor-pointer"
          >
            {inviting ? (
              <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <UserPlus className="w-4 h-4 mr-2" />
            )}
            Send Invite
          </Button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 3. PENDING INVITATIONS */}
      {/* ───────────────────────────────────────────────────────────── */}
      {pendingInvites.length > 0 && (
        <div className="card-base p-5 border-amber-500/30 bg-amber-500/5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-amber-500/20">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              <h2 className="text-sm font-bold text-foreground">Pending Invitations</h2>
            </div>
            <span className="badge badge-warning text-xs">
              {pendingInvites.length} Pending
            </span>
          </div>

          <div className="space-y-2">
            {pendingInvites.map((inv) => {
              const rDef = ROLE_DEFINITIONS.find((r) => r.id === inv.role);
              return (
                <div
                  key={inv.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl bg-card border border-border/80 shadow-sm"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-600">
                      <Mail className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{inv.email}</p>
                      <p className="text-xs text-muted-foreground">
                        Sent {new Date(inv.created_at).toLocaleDateString()} · Expires{" "}
                        {new Date(inv.expires_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={cn("px-2.5 py-1 rounded-lg text-xs font-bold border", rDef?.badgeClass || "badge-info")}>
                      {rDef?.title || inv.role}
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => resendInvite(inv)}
                      disabled={inviting}
                      className="h-8 text-xs cursor-pointer"
                    >
                      <RotateCw className="w-3 h-3 mr-1" /> Resend
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => cancelInvitation(inv.id)}
                      className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10 cursor-pointer"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 4. ACTIVE TEAM MEMBERS */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="card-base p-5 sm:p-6 space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center justify-between pb-3 border-b border-border/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Active Staff Members</h2>
              <p className="text-xs text-muted-foreground">Colleagues and terminals currently accessing your store</p>
            </div>
          </div>
          <span className="badge badge-neutral text-xs">
            {members.length} {members.length === 1 ? "staff" : "staff members"}
          </span>
        </div>

        {members.length === 0 ? (
          <div className="py-12 text-center text-muted-foreground text-sm">
            <Users className="w-8 h-8 mx-auto mb-2 text-muted-foreground/40" />
            No team members added yet. Invite your colleagues using the form above.
          </div>
        ) : (
          <div className="space-y-2.5">
            {members.map((member) => {
              const isCurrentUser = member.user_id === user?.id;
              const initials = (member.profile?.full_name || "Staff Member")
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              const rDef = ROLE_DEFINITIONS.find((r) => r.id === member.role);

              return (
                <div
                  key={member.id}
                  className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3.5 rounded-xl bg-muted/20 border border-border/60 hover:bg-muted/40 transition-colors"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 border border-primary/20">
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-bold text-foreground truncate">
                          {member.profile?.full_name || "Staff Member"}
                        </p>
                        {isCurrentUser && (
                          <span className="badge badge-info text-[10px] py-0 px-1.5">
                            You
                          </span>
                        )}
                        <span className={cn("px-2 py-0.5 rounded-md text-[10px] font-bold border", rDef?.badgeClass || "badge-info")}>
                          {rDef?.title || member.role}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Joined {new Date(member.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="relative">
                      <select
                        value={member.role}
                        onChange={(e) => updateRole(member.id, e.target.value as AppRole)}
                        disabled={isCurrentUser || !canManageStaff}
                        className={cn(
                          "h-8 px-3 rounded-lg text-xs font-semibold border border-input bg-card transition-all cursor-pointer",
                          (isCurrentUser || !canManageStaff) && "opacity-70 cursor-not-allowed"
                        )}
                      >
                        {ROLE_DEFINITIONS.map((r) => (
                          <option key={r.id} value={r.id}>
                            {r.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {!isCurrentUser && canManageStaff && (
                      <button
                        onClick={() => removeMember(member.id, member.user_id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors cursor-pointer"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* 5. ROLE & PERMISSIONS BREAKDOWN MATRIX */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="card-base p-5 sm:p-6 space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="flex items-center gap-2 pb-2 border-b border-border/70">
          <KeyRound className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Role Permissions Overview Matrix</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ROLE_DEFINITIONS.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.id}
                className="p-4 rounded-xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex flex-col justify-between space-y-3"
              >
                <div>
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200/60 dark:border-slate-700/60">
                    <div className="flex items-center gap-2">
                      <div className={cn("p-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800", r.colorClass)}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-slate-900 dark:text-white block">
                          {r.title}
                        </span>
                        <span className="text-[10px] text-muted-foreground">{r.tagline}</span>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed mt-2.5">
                    {r.summary}
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 space-y-1 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Sales &amp; POS:</span>
                    <span className="font-semibold">{r.permissions.sales ? "✅ Enabled" : "❌ No"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Purchases &amp; Stock:</span>
                    <span className="font-semibold">{r.permissions.purchases ? "✅ Enabled" : "❌ No"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Financial Reports:</span>
                    <span className="font-semibold">{r.permissions.reports ? "✅ Enabled" : "❌ No"}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cash &amp; Bank:</span>
                    <span className="font-semibold">{r.permissions.cashBank ? "✅ Enabled" : "❌ No"}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Role Detail Modal */}
      <Dialog open={!!selectedRoleDetail} onOpenChange={(o) => !o && setSelectedRoleDetail(null)}>
        <DialogContent className="max-w-lg rounded-2xl p-6">
          {selectedRoleDetail && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <div className="w-16 h-16 rounded-xl overflow-hidden border p-1 bg-slate-50 dark:bg-slate-900">
                    {selectedRoleDetail.illustrationSvg}
                  </div>
                  <div>
                    <DialogTitle className="text-lg font-bold flex items-center gap-2">
                      <span>{selectedRoleDetail.title}</span>
                      <span className={cn("px-2 py-0.5 text-xs font-bold rounded-lg border", selectedRoleDetail.badgeClass)}>
                        {selectedRoleDetail.tagline}
                      </span>
                    </DialogTitle>
                    <DialogDescription className="text-xs mt-1">
                      {selectedRoleDetail.summary}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-2 py-3 border-y border-slate-100 dark:border-slate-800 text-xs">
                <h4 className="font-bold text-slate-800 dark:text-slate-200">Permissions Breakdown:</h4>
                <div className="space-y-1.5 divide-y divide-slate-100 dark:divide-slate-800">
                  {Object.entries(selectedRoleDetail.permissions).map(([key, val]) => (
                    <div key={key} className="flex items-center justify-between py-1">
                      <span className="capitalize text-muted-foreground">
                        {key.replace(/([A-Z])/g, " $1")}:
                      </span>
                      <span className="font-semibold text-slate-800 dark:text-slate-200">
                        {typeof val === "string" ? val : val ? "✅ Allowed" : "❌ Restricted"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedRoleDetail(null)}
                  className="text-xs"
                >
                  Close
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => {
                    setInviteRole(selectedRoleDetail.id);
                    setSelectedRoleDetail(null);
                    toast({ title: "Role Selected", description: `Selected ${selectedRoleDetail.title} for invitation.` });
                  }}
                  className="text-xs font-bold bg-primary text-primary-foreground"
                >
                  Select for Invite
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
