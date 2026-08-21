import { useState, useEffect } from "react";
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
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MANAGER_ROLES } from "@/config/routes";

type AppRole = "super_admin" | "store_owner" | "manager" | "cashier";
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

const roleLabels: Record<AppRole, string> = {
  super_admin: "Store Owner (Super Admin)",
  store_owner: "Store Owner (Super Admin)",
  manager: "Store Owner (Super Admin)",
  cashier: "Cashier",
};

const roleIcons: Record<AppRole, React.ReactNode> = {
  super_admin: <Crown className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />,
  store_owner: <ShieldCheck className="w-3.5 h-3.5 text-primary" />,
  manager: <ShieldCheck className="w-3.5 h-3.5 text-primary" />,
  cashier: <User className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
};

const roleBadgeClasses: Record<AppRole, string> = {
  super_admin: "badge-danger",
  store_owner: "badge-info",
  manager: "badge-info",
  cashier: "badge-success",
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
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<AppRole>("cashier");
  const [inviting, setInviting] = useState(false);

  const canManageStaff = MANAGER_ROLES.includes(userRole as (typeof MANAGER_ROLES)[number]);

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
      let profiles: any[] | undefined = [];
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
    } catch (err: any) {
      console.error("fetchMembers failed:", err);
      setMembers([]);
      toast({ title: "Error", description: err?.message || "Failed to load members", variant: "destructive" });
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
    } catch (err: any) {
      console.error("fetchInvitations failed:", err);
      setInvitations([]);
      toast({ title: "Error", description: err?.message || "Failed to load invitations", variant: "destructive" });
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

      toast({ title: "Invitation Sent!", description: result?.message || `Invite sent to ${email}` });
      setInviteEmail("");
      fetchInvitations(orgId);
    } catch (err: any) {
      console.warn("Edge function invite failed, using direct DB fallback:", err.message);
      // Fallback: Direct insert into staff_invitations
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
          description: `Invitation for ${email} created as pending.`,
        });
        setInviteEmail("");
        fetchInvitations(orgId);
      } catch (fallbackError: any) {
        console.error("Direct invitation fallback error:", fallbackError);
        toast({
          title: "Invite Failed",
          description: fallbackError.message || "Failed to invite staff member",
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
    } catch (err: any) {
      console.warn("Resend Edge function failed, using DB fallback:", err.message);
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
      toast({ title: "Permission Denied", description: "Only owners or managers can update roles.", variant: "destructive" });
      return;
    }
    const { error } = await supabase
      .from("organization_memberships")
      .update({ role: newRole })
      .eq("id", membershipId);

    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Role Updated", description: `Role changed to ${roleLabels[newRole]}` });
      if (orgId) fetchMembers(orgId);
    }
  };

  const removeMember = async (membershipId: string, userId: string) => {
    if (!canManageStaff) {
      toast({ title: "Permission Denied", description: "Only owners or managers can remove staff.", variant: "destructive" });
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
    <div className="page-wrapper max-w-5xl space-y-6">
      
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            <Users className="w-6 h-6 text-primary" />
            Staff & Team Permissions
          </h1>
          <p className="page-subtitle">
            Manage cashier terminals, store managers, roles & access permissions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge badge-info text-xs py-1">
            <UserCheck className="w-3.5 h-3.5 mr-1" />
            {members.length} Active {members.length === 1 ? "Member" : "Members"}
          </span>
        </div>
      </div>

      {/* Invite Section Card */}
      <div className="card-base p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2.5 pb-2 border-b border-border/70">
          <div className="p-2 rounded-lg bg-primary/10 text-primary">
            <UserPlus className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-foreground">Invite New Staff Member</h2>
            <p className="text-xs text-muted-foreground">
              Send an email invitation. They'll receive sign-in instructions and access role permissions.
            </p>
          </div>
        </div>

        {!canManageStaff && (
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 font-medium">
            Read-only mode: Store Owner privileges are required to invite new staff members or update roles.
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
              className="pl-10 h-10 rounded-xl"
              disabled={!canManageStaff}
              onKeyDown={(e) => e.key === "Enter" && canManageStaff && handleInvite()}
            />
          </div>

          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as AppRole)}
            disabled={!canManageStaff}
            className="h-10 px-3 rounded-xl border border-input bg-background text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 w-full sm:w-48 disabled:opacity-60"
          >
            <option value="cashier">Cashier (POS & Billing)</option>
            <option value="store_owner">Store Owner (Super Admin - Full Access)</option>
          </select>

          <Button
            onClick={handleInvite}
            disabled={inviting || !inviteEmail.trim() || !canManageStaff}
            className="h-10 px-5 rounded-xl shadow-sm"
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

      {/* Pending Invitations */}
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
            {pendingInvites.map((inv) => (
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
                  <span className={cn("badge text-xs", roleBadgeClasses[inv.role])}>
                    {roleIcons[inv.role]}
                    {roleLabels[inv.role]}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => resendInvite(inv)}
                    disabled={inviting}
                    className="h-8 text-xs"
                  >
                    <RotateCw className="w-3 h-3 mr-1" /> Resend
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => cancelInvitation(inv.id)}
                    className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-500/10"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Team Members Card */}
      <div className="card-base p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-border/70">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-foreground">Active Staff Members</h2>
              <p className="text-xs text-muted-foreground">Team members currently accessing your store</p>
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
                        disabled={isCurrentUser}
                        className={cn(
                          "h-8 px-3 rounded-lg text-xs font-semibold border border-input bg-card transition-all cursor-pointer",
                          isCurrentUser && "opacity-70 cursor-not-allowed"
                        )}
                      >
                        <option value="cashier">Cashier (POS & Billing)</option>
                        <option value="store_owner">Store Owner (Super Admin - Full Access)</option>
                      </select>
                    </div>

                    {!isCurrentUser && (
                      <button
                        onClick={() => removeMember(member.id, member.user_id)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 transition-colors"
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

      {/* Past Invitations History */}
      {pastInvites.length > 0 && (
        <div className="card-base p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-border/70">
            <h2 className="text-sm font-bold text-foreground">Past Invitations History</h2>
            <span className="text-xs text-muted-foreground">{pastInvites.length} past</span>
          </div>

          <div className="space-y-1.5">
            {pastInvites.map((inv) => (
              <div
                key={inv.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-2.5 rounded-lg bg-muted/20 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  {statusIcons[inv.status]}
                  <span className="font-medium text-foreground truncate">{inv.email}</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={cn("badge text-[10px]", roleBadgeClasses[inv.role])}>
                    {roleLabels[inv.role]}
                  </span>
                  <span className="text-muted-foreground capitalize">{inv.status}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Role & Permissions Reference Grid */}
      <div className="card-base p-5 sm:p-6 space-y-4">
        <div className="flex items-center gap-2 pb-2 border-b border-border/70">
          <KeyRound className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Role Permissions Overview</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              role: "cashier" as AppRole,
              title: "Cashier",
              perms: "Fast POS checkout billing, viewing items, barcode scanning, print invoices.",
            },
            {
              role: "manager" as AppRole,
              title: "Store Manager",
              perms: "Full store access: POS, inventory, purchases, reports, settings, and staff management.",
            },
            {
              role: "store_owner" as AppRole,
              title: "Store Owner",
              perms: "Same full store access as Store Manager and Super Admin.",
            },
            {
              role: "super_admin" as AppRole,
              title: "Super Admin",
              perms: "Same full store access as Store Owner and Store Manager.",
            },
          ].map(({ role, title, perms }) => (
            <div
              key={role}
              className="p-3.5 rounded-xl bg-muted/20 border border-border/60 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-1.5 mb-2">
                  {roleIcons[role]}
                  <span className="text-xs font-bold text-foreground">{title}</span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{perms}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}



