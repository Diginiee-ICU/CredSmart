/**
 * @file CRMTeamTreeView.tsx
 * @description Enterprise Hierarchical Team Tree View for CredSmart CRM.
 * Displays interactive reporting lines, collapsible drop-down chevrons to save space,
 * dynamic search/filtering, specific user hierarchy scoping, and an expandable inline & side
 * detail inspector showing users working under each member.
 * Calibrated for native mobile ergonomics (min 44px tap targets) and responsive viewports.
 */

import React, { useState, useMemo, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Users,
  User,
  Shield,
  Crown,
  Briefcase,
  Mail,
  Phone,
  UserPlus,
  Network,
  Maximize2,
  Minimize2,
  X,
  ArrowRight,
  Check,
  Building2,
  Filter,
  RotateCcw,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CRMRolePill } from "@/components/crm/CRMRolePill";
import { cn } from "@/lib/utils";
import type { CRMRole } from "@/hooks/useCRMPermission";

export interface CRMTreeMember {
  id: string;
  name: string;
  email?: string;
  phone?: string;
  role: string; // Store role (manager, cashier, salesman, etc.)
  crmRoleId?: string;
  crmRoleName?: string;
  crmRoleColor?: string;
  assignedBy?: string | null;
  createdBy?: string | null;
  parentId?: string | null;
  assignedAt?: string;
}

export interface CRMTeamTreeViewProps {
  staff: CRMTreeMember[];
  roles: CRMRole[];
  currentUserId?: string;
  isSuperAdminOrOwner: boolean;
  onAssignRole: (staffId: string, roleId: string) => void;
  onSetManager: (staffId: string, managerId: string | null) => void;
  onOpenAddStaff?: (preselectedManagerId?: string) => void;
  searchQuery?: string;
  defaultScopedUserId?: string;
}

interface TreeNodeData extends CRMTreeMember {
  children: TreeNodeData[];
  depth: number;
  totalSubordinatesCount: number;
}

export const CRMTeamTreeView: React.FC<CRMTeamTreeViewProps> = ({
  staff,
  roles,
  currentUserId,
  isSuperAdminOrOwner,
  onAssignRole,
  onSetManager,
  onOpenAddStaff,
  searchQuery = "",
  defaultScopedUserId,
}) => {
  // User scope filter: 'all' or specific staff ID to view hierarchy under that specific user
  const [scopedUserId, setScopedUserId] = useState<string>(() => {
    if (defaultScopedUserId && staff.some((s) => s.id === defaultScopedUserId)) {
      return defaultScopedUserId;
    }
    return "all";
  });

  // Selected staff member for detailed inspector
  const [selectedStaffId, setSelectedStaffId] = useState<string | null>(() => {
    return staff[0]?.id || null;
  });

  // Inline expanded node ID for space-saving dropdown details directly in the tree
  const [inlineExpandedId, setInlineExpandedId] = useState<string | null>(null);

  // Collapsible dropdown state for tree branches
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>(() => {
    const init: Record<string, boolean> = {};
    staff.forEach((s) => {
      init[s.id] = true; // default expanded
    });
    return init;
  });

  // Toggle single branch dropdown
  const toggleNode = useCallback((nodeId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedNodes((prev) => ({
      ...prev,
      [nodeId]: !prev[nodeId],
    }));
  }, []);

  // Expand all branches
  const expandAll = useCallback(() => {
    const allExpanded: Record<string, boolean> = {};
    staff.forEach((s) => {
      allExpanded[s.id] = true;
    });
    setExpandedNodes(allExpanded);
  }, [staff]);

  // Collapse all branches
  const collapseAll = useCallback(() => {
    const allCollapsed: Record<string, boolean> = {};
    staff.forEach((s) => {
      allCollapsed[s.id] = false;
    });
    setExpandedNodes(allCollapsed);
  }, [staff]);

  // Map staff IDs for O(1) lookups
  const staffMap = useMemo(() => {
    const map = new Map<string, CRMTreeMember>();
    staff.forEach((s) => map.set(s.id, s));
    return map;
  }, [staff]);

  // Build the hierarchical tree structure with cycle detection & user scoping
  const treeRoots = useMemo(() => {
    if (staff.length === 0) return [];

    // Find children for each staff member
    const childrenMap = new Map<string, CRMTreeMember[]>();
    staff.forEach((s) => {
      const parentId = s.parentId || s.createdBy || s.assignedBy;
      if (parentId && parentId !== s.id && staffMap.has(parentId)) {
        const arr = childrenMap.get(parentId) || [];
        arr.push(s);
        childrenMap.set(parentId, arr);
      }
    });

    // Recursive tree node assembler with cycle detection
    const buildNode = (member: CRMTreeMember, depth = 0, visited = new Set<string>()): TreeNodeData => {
      const nextVisited = new Set(visited);
      nextVisited.add(member.id);

      const rawChildren = (childrenMap.get(member.id) || []).filter((c) => !nextVisited.has(c.id));
      const builtChildren = rawChildren.map((c) => buildNode(c, depth + 1, nextVisited));

      const totalSubordinates = builtChildren.reduce(
        (sum, child) => sum + 1 + child.totalSubordinatesCount,
        0
      );

      return {
        ...member,
        children: builtChildren,
        depth,
        totalSubordinatesCount: totalSubordinates,
      };
    };

    // If scoped to a specific user, root exclusively at that specific user
    if (scopedUserId !== "all") {
      const scopedMember = staffMap.get(scopedUserId);
      if (scopedMember) {
        return [buildNode(scopedMember, 0)];
      }
    }

    // Identify candidate roots:
    // 1. Explicitly has no parent
    // 2. Or parentId === currentUserId (when looking at current user tree)
    // 3. Or parent is not in staffMap
    let roots = staff.filter((s) => {
      const parentId = s.parentId || s.createdBy || s.assignedBy;
      return !parentId || parentId === s.id || !staffMap.has(parentId);
    });

    // If no roots detected (circular or all have parents), fallback to store_owner / super_admin or first member
    if (roots.length === 0) {
      const primaryLeader =
        staff.find(
          (s) =>
            s.role === "store_owner" ||
            s.role === "super_admin" ||
            s.role === "manager" ||
            s.id === currentUserId
        ) || staff[0];
      if (primaryLeader) roots = [primaryLeader];
    }

    // Sort roots: store owners / super admins first
    roots.sort((a, b) => {
      const aScore = a.role === "store_owner" || a.role === "super_admin" ? 2 : a.role === "manager" ? 1 : 0;
      const bScore = b.role === "store_owner" || b.role === "super_admin" ? 2 : b.role === "manager" ? 1 : 0;
      return bScore - aScore;
    });

    return roots.map((r) => buildNode(r, 0));
  }, [staff, staffMap, currentUserId, scopedUserId]);

  // Selected member details
  const selectedMember = useMemo(() => {
    if (!selectedStaffId) return staff[0] || null;
    return staffMap.get(selectedStaffId) || staff[0] || null;
  }, [selectedStaffId, staffMap, staff]);

  // Direct subordinates of selected member
  const directSubordinates = useMemo(() => {
    if (!selectedMember) return [];
    return staff.filter((s) => {
      const pId = s.parentId || s.createdBy || s.assignedBy;
      return pId === selectedMember.id && s.id !== selectedMember.id;
    });
  }, [selectedMember, staff]);

  // Manager of selected member
  const selectedMemberManager = useMemo(() => {
    if (!selectedMember) return null;
    const pId = selectedMember.parentId || selectedMember.createdBy || selectedMember.assignedBy;
    if (!pId || pId === selectedMember.id) return null;
    return staffMap.get(pId) || null;
  }, [selectedMember, staffMap]);

  // Filter check for search query
  const matchesSearch = useCallback(
    (member: CRMTreeMember) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase().trim();
      const name = (member.name || "").toLowerCase();
      const role = (member.role || "").toLowerCase();
      const crmRole = (member.crmRoleName || "").toLowerCase();
      const email = (member.email || "").toLowerCase();
      return name.includes(q) || role.includes(q) || crmRole.includes(q) || email.includes(q);
    },
    [searchQuery]
  );

  // Render individual tree node recursively
  const renderTreeNode = (node: TreeNodeData) => {
    const isExpanded = expandedNodes[node.id] ?? true;
    const hasChildren = node.children.length > 0;
    const isSelected = selectedMember?.id === node.id;
    const isInlineExpanded = inlineExpandedId === node.id;
    const isMatched = matchesSearch(node);
    const assignedRole = roles.find((r) => r.id === node.crmRoleId);

    return (
      <div key={node.id} className="relative select-none">
        {/* Node Row */}
        <div
          className={cn(
            "group flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer mb-2",
            isSelected
              ? "border-blue-500 bg-blue-50/40 ring-2 ring-blue-500/20 shadow-xs"
              : "border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/70",
            !isMatched && searchQuery.trim() && "opacity-40"
          )}
          onClick={() => {
            setSelectedStaffId(node.id);
            setInlineExpandedId((prev) => (prev === node.id ? null : node.id));
          }}
          title={`Click to view team details under ${node.name}`}
        >
          <div className="flex items-center gap-2 sm:gap-2.5 min-w-0 flex-1">
            {/* Collapsible Drop Down Button (to save space) */}
            {hasChildren ? (
              <button
                type="button"
                onClick={(e) => toggleNode(node.id, e)}
                className={cn(
                  "w-8 h-8 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all touch-manipulation",
                  isExpanded
                    ? "bg-slate-100 border-slate-300 text-slate-700 hover:bg-slate-200"
                    : "bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100"
                )}
                aria-label={isExpanded ? "Collapse sub-team" : "Expand sub-team"}
                title={isExpanded ? "Collapse team members under this user" : "Expand team members under this user"}
              >
                {isExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>
            ) : (
              <div className="w-8 h-8 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center shrink-0 border border-transparent text-slate-300">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-300" />
              </div>
            )}

            {/* Avatar Initials */}
            <div
              className={cn(
                "w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0",
                node.role === "store_owner" || node.role === "super_admin"
                  ? "bg-amber-100 text-amber-900 border border-amber-200"
                  : node.role === "manager"
                  ? "bg-indigo-100 text-indigo-900 border border-indigo-200"
                  : "bg-slate-100 text-slate-700 border border-slate-200"
              )}
            >
              {node.name.slice(0, 2).toUpperCase()}
            </div>

            {/* Name & Role Details */}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                  {node.name}
                </span>
                {node.role === "store_owner" && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                    <Crown className="w-2.5 h-2.5 text-amber-600 fill-amber-400" />
                    Owner
                  </span>
                )}
              </div>

              <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 border border-slate-200/60">
                  {node.role}
                </span>

                {assignedRole ? (
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.2 rounded-full text-[10px] font-semibold border"
                    style={{
                      backgroundColor: `${assignedRole.color}15`,
                      color: assignedRole.color,
                      borderColor: `${assignedRole.color}30`,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: assignedRole.color }}
                    />
                    {assignedRole.name}
                  </span>
                ) : (
                  <span className="text-[10px] text-slate-400">No CRM Role</span>
                )}
              </div>
            </div>
          </div>

          {/* Subordinates Count Badge & Space-Saving Drop Down Button */}
          <div className="flex items-center gap-1.5 shrink-0">
            {hasChildren && (
              <span
                onClick={(e) => toggleNode(node.id, e)}
                className={cn(
                  "cursor-pointer text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full border transition-colors flex items-center gap-1",
                  isExpanded
                    ? "bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200"
                    : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 font-bold"
                )}
                title="Click dropdown chevron to toggle visibility"
              >
                <Users className="w-3 h-3" />
                <span>
                  {node.children.length} {node.children.length === 1 ? "report" : "reports"}
                </span>
              </span>
            )}

            {/* Drop down button to see details of users working under this user */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedStaffId(node.id);
                setInlineExpandedId((prev) => (prev === node.id ? null : node.id));
              }}
              className={cn(
                "min-h-[36px] sm:min-h-[32px] px-2.5 text-xs rounded-xl font-semibold gap-1 transition-all touch-manipulation",
                isSelected || isInlineExpanded
                  ? "bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
                  : "text-slate-600 hover:bg-slate-100"
              )}
              title={isInlineExpanded ? "Hide details and direct reports" : "View details and team working under this user"}
              aria-expanded={isInlineExpanded}
            >
              <span>Details</span>
              {isInlineExpanded ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Space-Saving Inline Drop Down Details Panel */}
        {isInlineExpanded && (
          <div className="my-2 p-3 sm:p-4 rounded-2xl border border-blue-200 bg-blue-50/40 space-y-3 transition-all animate-in fade-in-50">
            <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-blue-200/60">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center shrink-0">
                  {node.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-slate-900 leading-tight">
                    {node.name}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white text-slate-600 border border-slate-200">
                      {node.role}
                    </span>
                    {assignedRole && (
                      <span
                        className="text-[10px] font-semibold px-2 py-0.2 rounded-full border bg-white"
                        style={{ color: assignedRole.color, borderColor: `${assignedRole.color}40` }}
                      >
                        {assignedRole.name}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setScopedUserId(node.id);
                  }}
                  className="h-7 px-2 text-[10px] rounded-lg bg-white border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold gap-1"
                  title="Focus tree on team under this user"
                >
                  <Network className="w-3 h-3 text-blue-600" />
                  <span>Focus Tree</span>
                </Button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setInlineExpandedId(null);
                  }}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-white"
                  title="Close details"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Direct Subordinates Under This User */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>Team Members Under {node.name} ({node.children.length})</span>
                </span>
                {isSuperAdminOrOwner && onOpenAddStaff && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAddStaff(node.id);
                    }}
                    className="h-6 text-[10px] text-blue-600 hover:bg-blue-100/60 px-1.5 rounded font-semibold gap-1"
                  >
                    <UserPlus className="w-3 h-3" />
                    <span>Add</span>
                  </Button>
                )}
              </div>

              {node.children.length === 0 ? (
                <div className="p-2.5 rounded-xl border border-dashed border-blue-200 bg-white/70 text-center text-xs text-slate-500">
                  No team members currently report under {node.name}.
                </div>
              ) : (
                <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {node.children.map((sub) => {
                    const subRole = roles.find((r) => r.id === sub.crmRoleId);
                    return (
                      <div
                        key={sub.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedStaffId(sub.id);
                          setInlineExpandedId(sub.id);
                        }}
                        className="p-2 rounded-xl border border-blue-200/80 bg-white hover:border-blue-400 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-2"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="w-6 h-6 rounded-lg bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                            {sub.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-900 truncate">{sub.name}</p>
                            <span className="text-[9px] font-mono text-slate-500">{sub.role}</span>
                          </div>
                        </div>
                        {subRole && (
                          <span
                            className="text-[9px] font-semibold px-1.5 py-0.2 rounded-full border bg-slate-50 shrink-0"
                            style={{ color: subRole.color, borderColor: `${subRole.color}30` }}
                          >
                            {subRole.name}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Children Sub-Tree with Space-Saving Drop Down Collapse & Adaptive Indent */}
        {hasChildren && isExpanded && (
          <div
            className={cn(
              "border-l-2 border-slate-200 border-dashed space-y-1 my-1",
              node.depth >= 3
                ? "pl-2 sm:pl-5 ml-1.5 sm:ml-3"
                : node.depth >= 1
                ? "pl-3 sm:pl-6 ml-2 sm:ml-4"
                : "pl-4 sm:pl-6 ml-3 sm:ml-4"
            )}
          >
            {node.children.map((child) => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Tree Controls Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 bg-slate-50/90 rounded-2xl border border-slate-200/80">
        <div className="flex items-center gap-2 flex-wrap">
          <Network className="w-4 h-4 text-blue-600 shrink-0" />
          <span className="text-xs font-bold text-slate-800">
            Team Hierarchy ({staff.length} Members)
          </span>

          {/* Specific User Scope Filter */}
          <div className="flex items-center gap-1.5">
            <Select value={scopedUserId} onValueChange={setScopedUserId}>
              <SelectTrigger className="h-8 text-xs rounded-xl border-slate-200 bg-white min-w-[140px] sm:min-w-[190px]">
                <SelectValue placeholder="Scope Hierarchy" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  <span className="font-semibold text-slate-800">All Organization</span>
                </SelectItem>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    <span className="font-medium">{s.name}</span>
                    <span className="text-[10px] text-slate-400 ml-1 font-mono">({s.role})</span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {scopedUserId !== "all" && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setScopedUserId("all")}
                className="h-8 px-2 text-xs text-blue-600 hover:bg-blue-50 rounded-xl font-medium gap-1"
                title="Reset to full organizational tree"
              >
                <RotateCcw className="w-3 h-3" />
                <span className="hidden sm:inline">Show All</span>
              </Button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={expandAll}
            className="h-8 text-xs rounded-xl border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-medium gap-1 min-h-[36px] sm:min-h-[32px] touch-manipulation"
            title="Expand all tree branches"
          >
            <Maximize2 className="w-3 h-3 text-blue-600" />
            <span>Expand All</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={collapseAll}
            className="h-8 text-xs rounded-xl border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-medium gap-1 min-h-[36px] sm:min-h-[32px] touch-manipulation"
            title="Collapse all tree branches to save space"
          >
            <Minimize2 className="w-3 h-3 text-slate-500" />
            <span>Collapse All</span>
          </Button>

          {isSuperAdminOrOwner && onOpenAddStaff && (
            <Button
              type="button"
              size="sm"
              onClick={() => onOpenAddStaff(selectedMember?.id)}
              className="h-8 text-xs rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold gap-1 shadow-xs min-h-[36px] sm:min-h-[32px] touch-manipulation"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Add Under Selected</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Tree View on Left, Member & Subordinates Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Interactive Tree View */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200/90 p-3.5 sm:p-4 shadow-xs overflow-hidden">
          <div className="flex items-center justify-between pb-3 mb-3 border-b border-slate-100">
            <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-wider">
              ORGANIZATION STRUCTURE
            </span>
            {scopedUserId !== "all" && (
              <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                Filtered: {staffMap.get(scopedUserId)?.name}
              </Badge>
            )}
          </div>

          {treeRoots.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400">
              No staff members available to render in tree hierarchy.
            </div>
          ) : (
            <div className="space-y-1">
              {treeRoots.map((root) => renderTreeNode(root))}
            </div>
          )}
        </div>

        {/* Right Column: Member Details & Subordinates Working Under Them */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 p-4 sm:p-5 shadow-xs sticky top-6">
          {selectedMember ? (
            <div className="space-y-4">
              {/* Member Profile Header */}
              <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div
                    className={cn(
                      "w-11 h-11 rounded-2xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs",
                      selectedMember.role === "store_owner" || selectedMember.role === "super_admin"
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : "bg-blue-100 text-blue-900 border border-blue-200"
                    )}
                  >
                    {selectedMember.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm sm:text-base font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{selectedMember.name}</span>
                      {selectedMember.role === "store_owner" && (
                        <Crown className="w-3.5 h-3.5 text-amber-600 fill-amber-400" />
                      )}
                    </h4>
                    <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                      <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {selectedMember.role}
                      </span>
                      {selectedMember.crmRoleName && (
                        <CRMRolePill
                          name={selectedMember.crmRoleName}
                          color={selectedMember.crmRoleColor || "#1D4ED8"}
                          size="sm"
                        />
                      )}
                    </div>
                  </div>
                </div>

                <Badge variant="outline" className="text-[10px] font-mono bg-slate-50 text-slate-600 shrink-0">
                  {directSubordinates.length} Direct {directSubordinates.length === 1 ? "Report" : "Reports"}
                </Badge>
              </div>

              {/* Reporting Line / Manager Info */}
              <div className="p-3 bg-slate-50/80 rounded-xl border border-slate-200/80 space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="font-medium">Reports To:</span>
                  <span className="font-bold text-slate-800">
                    {selectedMemberManager ? selectedMemberManager.name : "Organization Apex (Owner / Root)"}
                  </span>
                </div>

                {selectedMember.email && (
                  <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200/60">
                    <span className="font-medium flex items-center gap-1">
                      <Mail className="w-3 h-3 text-slate-400" />
                      Email:
                    </span>
                    <a
                      href={`mailto:${selectedMember.email}`}
                      className="font-mono text-blue-600 hover:underline truncate max-w-[180px]"
                    >
                      {selectedMember.email}
                    </a>
                  </div>
                )}

                {selectedMember.phone && (
                  <div className="flex items-center justify-between text-slate-500 pt-1 border-t border-slate-200/60">
                    <span className="font-medium flex items-center gap-1">
                      <Phone className="w-3 h-3 text-slate-400" />
                      Phone:
                    </span>
                    <a
                      href={`tel:${selectedMember.phone}`}
                      className="font-mono text-slate-700 hover:underline"
                    >
                      {selectedMember.phone}
                    </a>
                  </div>
                )}
              </div>

              {/* Subordinates Working Under This User */}
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between">
                  <h5 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-blue-600" />
                    <span>Team Members Under {selectedMember.name}</span>
                    <span className="text-slate-400 font-normal">
                      ({directSubordinates.length})
                    </span>
                  </h5>

                  {isSuperAdminOrOwner && onOpenAddStaff && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenAddStaff(selectedMember.id)}
                      className="h-7 text-[11px] text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2 rounded-lg font-semibold gap-1 min-h-[36px] sm:min-h-[28px] touch-manipulation"
                    >
                      <UserPlus className="w-3 h-3" />
                      <span>Add</span>
                    </Button>
                  )}
                </div>

                {directSubordinates.length === 0 ? (
                  <div className="p-4 rounded-xl border border-dashed border-slate-200 text-center text-xs text-slate-400 bg-slate-50/50">
                    No team members are currently assigned under {selectedMember.name}.
                    {isSuperAdminOrOwner && onOpenAddStaff && (
                      <div className="mt-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => onOpenAddStaff(selectedMember.id)}
                          className="h-7 text-xs rounded-lg text-blue-600 border-blue-200 hover:bg-blue-50 gap-1 font-semibold"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>Assign Subordinate</span>
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                    {directSubordinates.map((sub) => {
                      const subRole = roles.find((r) => r.id === sub.crmRoleId);
                      return (
                        <div
                          key={sub.id}
                          onClick={() => {
                            setSelectedStaffId(sub.id);
                            setInlineExpandedId(sub.id);
                          }}
                          className="p-2.5 rounded-xl border border-slate-200/80 bg-slate-50/60 hover:bg-white hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer flex items-center justify-between gap-2"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <div className="w-7 h-7 rounded-lg bg-blue-100 text-blue-800 font-bold text-[10px] flex items-center justify-center shrink-0">
                              {sub.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                {sub.name}
                              </p>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[9px] font-mono px-1 py-0.2 rounded bg-white text-slate-600 border border-slate-200">
                                  {sub.role}
                                </span>
                                {subRole && (
                                  <span
                                    className="text-[9px] font-medium"
                                    style={{ color: subRole.color }}
                                  >
                                    {subRole.name}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-[10px] text-blue-600 hover:bg-blue-50 rounded-lg shrink-0 gap-0.5"
                          >
                            <span>Inspect</span>
                            <ChevronRight className="w-3 h-3" />
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Quick Role & Manager Reassignment Controls (For Admins) */}
              {isSuperAdminOrOwner && (
                <div className="pt-3 border-t border-slate-100 space-y-3">
                  {/* Reassign CRM Role */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">
                      Change CRM Role
                    </label>
                    <Select
                      value={selectedMember.crmRoleId || "none"}
                      onValueChange={(val) => onAssignRole(selectedMember.id, val)}
                    >
                      <SelectTrigger className="h-8 text-xs rounded-xl border-slate-200">
                        <SelectValue placeholder="Select CRM Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-slate-400">None (No CRM Access)</span>
                        </SelectItem>
                        {roles.map((r) => (
                          <SelectItem key={r.id} value={r.id}>
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full"
                                style={{ backgroundColor: r.color }}
                              />
                              <span>{r.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Change Reporting Manager */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-700">
                      Change Reporting Manager
                    </label>
                    <Select
                      value={selectedMember.parentId || "none"}
                      onValueChange={(val) => onSetManager(selectedMember.id, val === "none" ? null : val)}
                    >
                      <SelectTrigger className="h-8 text-xs rounded-xl border-slate-200">
                        <SelectValue placeholder="Select Manager" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          <span className="text-slate-500">Organization Apex (Root / No Manager)</span>
                        </SelectItem>
                        {staff
                          .filter((s) => s.id !== selectedMember.id)
                          .map((m) => (
                            <SelectItem key={m.id} value={m.id}>
                              <div className="flex items-center gap-1.5">
                                <span>{m.name}</span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  ({m.role})
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-xs text-slate-400">
              Select a member in the hierarchy to inspect their team and details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
