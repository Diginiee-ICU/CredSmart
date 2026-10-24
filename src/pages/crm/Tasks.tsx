import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  CheckSquare,
  Plus,
  Search,
  Clock,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  User,
  FileCheck,
  Kanban,
  Table as TableIcon,
  RotateCw,
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
import { crmApi, type CRMTaskPriority, type CRMTaskStatus } from "@/services/crmApi";

export type TaskPriority = CRMTaskPriority;
export type TaskStatus = CRMTaskStatus;

export interface CRMTask {
  id: string;
  org_id: string;
  organization_id?: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignee_name: string;
  assignee_id?: string;
  assigned_to?: string;
  due_date: string;
  created_at: string;
  completed_at?: string;
  approved_by?: string;
  approver_name?: string;
  requires_proof?: boolean;
  proof_notes?: string;
  review_feedback?: string;
}

export interface StaffOption {
  id: string;
  name: string;
  role?: string;
  crmRole?: string;
  crmRoleColor?: string;
}

const INITIAL_TASKS: CRMTask[] = [
  {
    id: "task-101",
    org_id: "",
    title: "Reconcile Saturday Cash Drawer with Day Book",
    description: "Verify physical cash balance against sales ledger and register notes",
    priority: "urgent",
    status: "todo",
    assignee_name: "Rahul Sharma",
    due_date: new Date(Date.now() + 86400000).toISOString().split("T")[0],
    created_at: new Date(Date.now() - 3600000 * 4).toISOString(),
    requires_proof: true,
  },
  {
    id: "task-102",
    org_id: "",
    title: "Stock Audit: Aisle 3 Dairy & Perishables",
    description: "Audit expiry dates, batch numbers, and update low stock threshold",
    priority: "high",
    status: "in_progress",
    assignee_name: "Pooja Verma",
    due_date: new Date(Date.now() + 86400000 * 2).toISOString().split("T")[0],
    created_at: new Date(Date.now() - 3600000 * 12).toISOString(),
    requires_proof: true,
  },
  {
    id: "task-103",
    org_id: "",
    title: "Review Supplier Inward Invoices for GST Mismatch",
    description: "Cross-check GSTR-2B inward items with recent purchase vouchers",
    priority: "normal",
    status: "review",
    assignee_name: "Amit Patel",
    due_date: new Date(Date.now() + 86400000 * 3).toISOString().split("T")[0],
    created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    requires_proof: false,
    proof_notes: "Checked 12 purchase bills against GST portal. 1 pending credit note.",
  },
  {
    id: "task-104",
    org_id: "",
    title: "Barcode Labeling on Newly Arrived FMCG Crates",
    description: "Apply 13-digit EAN barcodes on unpacked confectionery packages",
    priority: "low",
    status: "done",
    assignee_name: "Suresh Kumar",
    due_date: new Date(Date.now() - 86400000).toISOString().split("T")[0],
    created_at: new Date(Date.now() - 3600000 * 48).toISOString(),
    completed_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    approver_name: "Store Manager",
    requires_proof: false,
  },
];

export default function Tasks(): React.ReactElement {
  const { orgId, org } = useOrganization();
  const { hasPermission, isSuperAdmin } = useCRMPermission();

  const canCreate = isSuperAdmin || hasPermission("tasks", "create");
  const canApprove = isSuperAdmin || hasPermission("tasks", "approve");

  const storageKey = `credsmart_crm_tasks_${orgId || "default"}`;
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);

  const [tasks, setTasks] = useState<CRMTask[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return INITIAL_TASKS;
  });

  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Modal States
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTaskForProof, setActiveTaskForProof] = useState<CRMTask | null>(null);
  const [proofText, setProofText] = useState("");
  const [activeTaskForRevision, setActiveTaskForRevision] = useState<CRMTask | null>(null);
  const [revisionText, setRevisionText] = useState("");

  // New task form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("normal");
  const [newAssigneeName, setNewAssigneeName] = useState("");
  const [newAssigneeId, setNewAssigneeId] = useState<string | undefined>(undefined);
  const [, setNewAssigneeRole] = useState<string | undefined>(undefined);
  const [newDueDate, setNewDueDate] = useState(
    new Date(Date.now() + 86400000).toISOString().split("T")[0]
  );
  const [newRequiresProof, setNewRequiresProof] = useState(true);

  // Sync to localStorage
  useEffect(() => {
    if (orgId) {
      localStorage.setItem(storageKey, JSON.stringify(tasks));
    }
  }, [tasks, storageKey, orgId]);

  // Fetch staff and tasks from backend
  const loadData = useCallback(async () => {
    if (!orgId) return;
    setIsRefreshing(true);

    // 1. Fetch Real Staff Members
    try {
      const staffRes =
        typeof (crmApi as unknown as { getCRMStaff?: (id: string) => Promise<{ data?: unknown[] }> }).getCRMStaff === "function"
          ? await (crmApi as unknown as { getCRMStaff: (id: string) => Promise<{ data?: unknown[] }> }).getCRMStaff(orgId)
          : await crmApi.getCRMStaffRoles(orgId);

      if (staffRes?.data && Array.isArray(staffRes.data)) {
        const staffParsed: StaffOption[] = staffRes.data.map((item: unknown) => {
          const rec = item as Record<string, unknown>;
          return {
            id: String(rec.id || rec.user_id || rec.staff_id || ""),
            name: String(rec.full_name || rec.name || rec.email || "Staff Member"),
            role: rec.store_role ? String(rec.store_role) : rec.role ? String(rec.role) : undefined,
            crmRole: rec.crm_role_name ? String(rec.crm_role_name) : rec.role_name ? String(rec.role_name) : undefined,
            crmRoleColor: rec.crm_role_color ? String(rec.crm_role_color) : undefined,
          };
        }).filter((s) => Boolean(s.id));

        if (staffParsed.length > 0) {
          setStaffList(staffParsed);
        }
      }
    } catch (err) {
      console.warn("Failed to fetch CRM staff members:", err);
    }

    // 2. Fetch Tasks from Live API
    try {
      const res = await crmApi.getCRMTasks(orgId);
      if (res?.data && Array.isArray(res.data) && res.data.length > 0) {
        const mappedTasks: CRMTask[] = res.data.map((t) => {
          const raw = t as unknown as Record<string, unknown>;
          return {
            id: String(t.id),
            org_id: t.org_id || orgId,
            title: t.title,
            description: t.description || "",
            priority: (t.priority as TaskPriority) || "normal",
            status: (t.status as TaskStatus) || "todo",
            assignee_name: String(t.assignee_name || raw.assigned_to_name || "Unassigned"),
            assignee_id: t.assigned_to || t.assignee_id || undefined,
            assigned_to: t.assigned_to || t.assignee_id || undefined,
            due_date: t.due_date || "",
            created_at: t.created_at || new Date().toISOString(),
            completed_at: t.completed_at || undefined,
            approved_by: t.approved_by || undefined,
            approver_name: t.approver_name || undefined,
            requires_proof: t.requires_proof ?? Boolean(raw.proof_required ?? true),
            proof_notes: t.proof_notes || undefined,
            review_feedback: t.review_feedback || undefined,
          };
        });
        setTasks(mappedTasks);
        localStorage.setItem(storageKey, JSON.stringify(mappedTasks));
      }
    } catch (err) {
      console.warn("getCRMTasks network error, falling back to cached tasks:", err);
    } finally {
      setIsRefreshing(false);
    }
  }, [orgId, storageKey]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Metrics
  const metrics = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const review = tasks.filter((t) => t.status === "review").length;
    const done = tasks.filter((t) => t.status === "done").length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    const overdue = tasks.filter((t) => t.status !== "done" && Boolean(t.due_date && t.due_date < todayStr)).length;
    return { total, inProgress, review, done, completionRate, overdue };
  }, [tasks, todayStr]);

  // Filtered tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchSearch =
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.assignee_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchPriority = priorityFilter === "all" ? true : t.priority === priorityFilter;
      return matchSearch && matchPriority;
    });
  }, [tasks, searchQuery, priorityFilter]);

  // Status transitions
  const handleMoveStatus = async (taskId: string, nextStatus: TaskStatus) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const now = new Date().toISOString();
    const updatedTask: CRMTask = {
      ...task,
      status: nextStatus,
      completed_at: nextStatus === "done" ? now : task.completed_at,
      review_feedback: nextStatus === "in_progress" && task.status === "todo" ? undefined : task.review_feedback,
    };

    setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)));

    toast({
      title: "Task Status Updated",
      description: `Task marked as ${nextStatus.replace("_", " ")}.`,
    });

    try {
      await crmApi.transitionCRMTaskStatus(taskId, nextStatus, { orgId });
    } catch (err) {
      console.warn("Backend transition notice:", err);
    }
  };

  const handleApproveTask = async (taskId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    const now = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: "done",
              completed_at: now,
              approved_by: "manager",
              approver_name: "Store Manager",
            }
          : t
      )
    );

    toast({
      title: "Task Approved",
      description: "Task marked as completed and signed off.",
    });

    try {
      await crmApi.transitionCRMTaskStatus(taskId, "done", { orgId });
    } catch (err) {
      console.warn("Backend approval notice:", err);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedTitle = newTitle.trim();
    if (!trimmedTitle) {
      toast({ title: "Validation Error", description: "Title is required", variant: "destructive" });
      return;
    }
    if (trimmedTitle.length < 3) {
      toast({ title: "Validation Error", description: "Title must be at least 3 characters", variant: "destructive" });
      return;
    }

    const finalAssigneeName = newAssigneeName.trim() || "Unassigned";
    const tempId = `task-${Date.now()}`;

    const created: CRMTask = {
      id: tempId,
      org_id: orgId || "",
      title: trimmedTitle,
      description: newDescription.trim(),
      priority: newPriority,
      status: "todo",
      assignee_name: finalAssigneeName,
      assignee_id: newAssigneeId,
      assigned_to: newAssigneeId,
      due_date: newDueDate,
      created_at: new Date().toISOString(),
      requires_proof: newRequiresProof,
    };

    setTasks((prev) => [created, ...prev]);
    setIsCreateOpen(false);
    setNewTitle("");
    setNewDescription("");
    setNewAssigneeName("");
    setNewAssigneeId(undefined);
    setNewAssigneeRole(undefined);

    toast({
      title: "Task Created",
      description: `"${created.title}" assigned to ${created.assignee_name}.`,
    });

    try {
      const res = await crmApi.createCRMTask(
        {
          title: created.title,
          description: created.description,
          priority: created.priority,
          status: "todo",
          due_date: created.due_date,
          requires_proof: created.requires_proof,
          assigned_to: created.assigned_to,
          assignee_id: created.assignee_id,
        },
        orgId
      );

      if (res?.data && res.data.id) {
        setTasks((prev) =>
          prev.map((t) => (t.id === tempId ? { ...t, ...res.data, id: res.data.id } : t))
        );
      }
    } catch (err) {
      console.warn("Backend task creation notice:", err);
    }
  };

  const handleSubmitProof = async () => {
    if (!activeTaskForProof) return;
    const trimmed = proofText.trim();
    if (activeTaskForProof.requires_proof && !trimmed) {
      toast({
        title: "Validation Error",
        description: "Please describe your work or proof before submitting",
        variant: "destructive",
      });
      return;
    }

    const finalNotes = trimmed || "Work completed and submitted for manager approval.";
    const taskId = activeTaskForProof.id;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: "review",
              proof_notes: finalNotes,
            }
          : t
      )
    );

    setActiveTaskForProof(null);
    setProofText("");

    toast({
      title: "Submitted for Review",
      description: "Manager will verify proof of work.",
    });

    try {
      await crmApi.transitionCRMTaskStatus(taskId, "review", {
        proof_notes: finalNotes,
        orgId,
      });
    } catch (err) {
      console.warn("Backend proof submit notice:", err);
    }
  };

  const handleOpenRevision = (task: CRMTask) => {
    setActiveTaskForRevision(task);
    setRevisionText("");
  };

  const handleSubmitRevision = async () => {
    if (!activeTaskForRevision) return;
    const trimmed = revisionText.trim();
    if (!trimmed) {
      toast({
        title: "Validation Error",
        description: "Please enter revision notes before submitting",
        variant: "destructive",
      });
      return;
    }

    const taskId = activeTaskForRevision.id;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: "in_progress",
              review_feedback: trimmed,
            }
          : t
      )
    );

    setActiveTaskForRevision(null);
    setRevisionText("");

    toast({
      title: "Revision Requested",
      description: "Task returned to In Progress with feedback.",
    });

    try {
      await crmApi.transitionCRMTaskStatus(taskId, "in_progress", {
        review_feedback: trimmed,
        orgId,
      });
    } catch (err) {
      console.warn("Backend revision request notice:", err);
    }
  };

  const getPriorityBadge = (p: TaskPriority) => {
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

  const getStatusBadge = (s: TaskStatus) => {
    switch (s) {
      case "todo":
        return <CRMBadge variant="neutral" size="sm">To Do</CRMBadge>;
      case "in_progress":
        return <CRMBadge variant="info" size="sm" dot>In Progress</CRMBadge>;
      case "review":
        return <CRMBadge variant="warning" size="sm" dot>Review</CRMBadge>;
      case "done":
        return <CRMBadge variant="success" size="sm">Completed</CRMBadge>;
    }
  };

  const columns: CRMColumnDef<CRMTask>[] = [
    {
      key: "title",
      header: "Task",
      accessor: (row) => (
        <div className="space-y-1">
          <div className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">
            {row.title}
          </div>
          {row.description && (
            <div className="text-[11px] text-slate-500 line-clamp-1">{row.description}</div>
          )}
          <div className="flex items-center gap-1.5 pt-0.5">
            {row.requires_proof && (
              <span className="inline-flex items-center gap-1 text-[9px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-1.5 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                <FileCheck className="w-2.5 h-2.5" />
                Proof Required
              </span>
            )}
            {row.review_feedback && row.status === "in_progress" && (
              <span className="inline-flex items-center gap-1 text-[9px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-200 dark:border-amber-800">
                <AlertCircle className="w-2.5 h-2.5" />
                Revision
              </span>
            )}
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
      key: "assignee_name",
      header: "Assignee",
      accessor: (row) => (
        <div className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-300">
          <div className="w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold">
            {row.assignee_name ? row.assignee_name.charAt(0).toUpperCase() : "U"}
          </div>
          <span>{row.assignee_name}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: "due_date",
      header: "Due Date",
      accessor: (row) => {
        const overdue = row.status !== "done" && Boolean(row.due_date && row.due_date < todayStr);
        return (
          <span
            className={cn(
              "font-mono text-xs tabular-nums",
              overdue
                ? "text-rose-600 dark:text-rose-400 font-semibold flex items-center gap-1"
                : "text-slate-600 dark:text-slate-400"
            )}
          >
            {overdue && <AlertTriangle className="w-3 h-3 text-rose-500" />}
            {row.due_date || "—"}
          </span>
        );
      },
      sortable: true,
    },
    {
      key: "requires_proof",
      header: "Proof Required",
      accessor: (row) => (
        <span className="text-xs">
          {row.requires_proof ? (
            <span className="text-indigo-600 dark:text-indigo-400 font-medium flex items-center gap-1">
              <FileCheck className="w-3.5 h-3.5" /> Yes
            </span>
          ) : (
            <span className="text-slate-400">No</span>
          )}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (row) => (
        <div className="flex items-center gap-1.5 flex-wrap">
          {row.status === "todo" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMoveStatus(row.id, "in_progress")}
              className="h-7 text-xs px-2 text-blue-600 border-blue-200 hover:bg-blue-50"
            >
              Start Job
            </Button>
          )}
          {row.status === "in_progress" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (row.requires_proof) {
                  setActiveTaskForProof(row);
                  setProofText("");
                } else {
                  handleMoveStatus(row.id, "review");
                }
              }}
              className="h-7 text-xs px-2 text-amber-600 border-amber-200 hover:bg-amber-50"
            >
              Submit Proof
            </Button>
          )}
          {row.status === "review" && (
            <div className="flex items-center gap-1">
              {canApprove && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenRevision(row)}
                    className="h-7 text-xs px-2 text-amber-700 border-amber-300 hover:bg-amber-50"
                  >
                    Request Revision
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApproveTask(row.id)}
                    className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                  >
                    Approve ✓
                  </Button>
                </>
              )}
            </div>
          )}
          {row.status === "done" && (
            <div className="flex items-center gap-1 text-[11px] text-emerald-600 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Done</span>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <CRMPermissionGate
      module="tasks"
      action="view"
      fallback={
        <div className="p-8 max-w-xl mx-auto text-center space-y-4">
          <div className="w-14 h-14 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Task Access Restricted</h2>
          <p className="text-sm text-slate-600">
            You do not have permission to view store tasks. Contact your manager for access.
          </p>
        </div>
      }
    >
      <div className="min-h-screen bg-slate-50/60 dark:bg-slate-950 pb-20">
        <header className="bg-white dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 px-4 sm:px-6 lg:px-8 py-5">
          <div className="max-w-7xl mx-auto">
            <CRMPageHeader
              title="Task & Job Workflows"
              subtitle={`${org?.name ? `${org.name} • ` : ""}Assign store jobs, track Kanban, manage deadlines, and verify proof of work`}
              breadcrumbs={[
                { label: "Home", href: "/" },
                { label: "CRM", href: ROUTE_PATHS.crm },
                { label: "Tasks", href: ROUTE_PATHS.crmTasks },
              ]}
              badge={
                <div className="flex items-center gap-2">
                  <CRMBadge variant="success" size="sm" dot>
                    Kanban Ready
                  </CRMBadge>
                  {metrics.overdue > 0 && (
                    <CRMBadge variant="error" size="sm">
                      {metrics.overdue} Overdue
                    </CRMBadge>
                  )}
                </div>
              }
              actions={
                <div className="flex items-center gap-2">
                  {/* Refresh Button */}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={loadData}
                    disabled={isRefreshing}
                    className="h-9 px-2.5 text-xs border-slate-200 dark:border-slate-800"
                    title="Refresh Tasks"
                  >
                    <RotateCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
                  </Button>

                  {/* View toggle */}
                  <div className="inline-flex items-center p-0.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800">
                    <button
                      type="button"
                      onClick={() => setViewMode("kanban")}
                      className={cn(
                        "p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all",
                        viewMode === "kanban"
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                          : "text-slate-500 hover:text-slate-900"
                      )}
                      title="Kanban Board View"
                    >
                      <Kanban className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Board</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("table")}
                      className={cn(
                        "p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-all",
                        viewMode === "table"
                          ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-2xs"
                          : "text-slate-500 hover:text-slate-900"
                      )}
                      title="Data Table View"
                    >
                      <TableIcon className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Table</span>
                    </button>
                  </div>

                  {canCreate && (
                    <Button
                      onClick={() => setIsCreateOpen(true)}
                      size="sm"
                      className="bg-[#FF6A00] hover:bg-orange-600 text-white gap-1.5 text-xs h-9 shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Create Task</span>
                    </Button>
                  )}
                </div>
              }
            />
          </div>
        </header>

        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
          {/* Stat Cards */}
          <section aria-label="Task Metrics">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
              <CRMStatCard
                label="Total Tasks"
                value={metrics.total}
                icon={CheckSquare}
                accent="navy"
                description="Assigned Workflows"
              />
              <CRMStatCard
                label="In Progress"
                value={metrics.inProgress}
                icon={Clock}
                accent="blue"
                description="Active Store Jobs"
              />
              <CRMStatCard
                label="Pending Review"
                value={metrics.review}
                icon={FileCheck}
                accent="orange"
                description="Awaiting Approval"
              />
              <CRMStatCard
                label="Completed"
                value={metrics.done}
                icon={CheckCircle2}
                accent="emerald"
                trend={{
                  value: `${metrics.completionRate}%`,
                  direction: "up",
                  label: "Resolution",
                }}
                description="Verified & Closed"
              />
            </div>
          </section>

          {/* Filter Bar */}
          <section className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white dark:bg-slate-900 p-3 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-2xs">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                placeholder="Search tasks or assignees..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs border-slate-200 dark:border-slate-800"
              />
            </div>

            <div className="flex items-center gap-2">
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="w-[140px] h-9 text-xs border-slate-200 dark:border-slate-800">
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

          {/* View Container */}
          {viewMode === "kanban" ? (
            /* Kanban Board */
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-start">
              {(
                [
                  { status: "todo", label: "To Do", color: "border-slate-300 bg-slate-50/50" },
                  { status: "in_progress", label: "In Progress", color: "border-blue-300 bg-blue-50/30" },
                  { status: "review", label: "Under Review", color: "border-amber-300 bg-amber-50/30" },
                  { status: "done", label: "Completed", color: "border-emerald-300 bg-emerald-50/30" },
                ] as const
              ).map((col) => {
                const colTasks = filteredTasks.filter((t) => t.status === col.status);
                return (
                  <div
                    key={col.status}
                    className="flex flex-col rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-slate-100/60 dark:bg-slate-900/60 p-3 min-h-[380px]"
                  >
                    <div className="flex items-center justify-between pb-3 px-1">
                      <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider font-mono">
                        {col.label}
                      </span>
                      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold font-mono bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {colTasks.length}
                      </span>
                    </div>

                    <div className="space-y-2.5 flex-1">
                      {colTasks.length === 0 ? (
                        <div className="h-28 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 flex items-center justify-center text-xs text-slate-400">
                          No tasks
                        </div>
                      ) : (
                        colTasks.map((task) => {
                          const isOverdue =
                            task.status !== "done" &&
                            Boolean(task.due_date && task.due_date < todayStr);

                          return (
                            <div
                              key={task.id}
                              className="bg-white dark:bg-slate-900 p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 shadow-2xs hover:shadow-xs transition-all space-y-2.5"
                            >
                              <div className="flex items-start justify-between gap-1.5">
                                <h4 className="text-xs font-bold text-slate-900 dark:text-white leading-snug">
                                  {task.title}
                                </h4>
                                {getPriorityBadge(task.priority)}
                              </div>

                              {task.description && (
                                <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                  {task.description}
                                </p>
                              )}

                              {/* Proof Required Badge */}
                              {task.requires_proof && (
                                <div className="flex items-center gap-1">
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2 py-0.5 rounded border border-indigo-200 dark:border-indigo-800">
                                    <FileCheck className="w-3 h-3 text-indigo-500" />
                                    Requires Proof
                                  </span>
                                </div>
                              )}

                              {/* Revision Feedback Alert Banner */}
                              {task.review_feedback && task.status === "in_progress" && (
                                <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300 space-y-1">
                                  <div className="flex items-center gap-1 font-semibold">
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600 flex-shrink-0" />
                                    <span>Revision Requested:</span>
                                  </div>
                                  <p className="leading-snug">{task.review_feedback}</p>
                                </div>
                              )}

                              {/* Submitted Proof Notes Display */}
                              {task.proof_notes && (
                                <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                                  <span className="font-semibold text-slate-700 dark:text-slate-200 text-[10px] uppercase tracking-wider block">
                                    Submitted Proof:
                                  </span>
                                  <p className="leading-snug line-clamp-3">{task.proof_notes}</p>
                                </div>
                              )}

                              {/* Completed Timestamp & Approver */}
                              {task.status === "done" && (
                                <div className="flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-medium pt-0.5">
                                  <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0" />
                                  <span>
                                    Completed
                                    {task.completed_at ? ` ${new Date(task.completed_at).toLocaleDateString()}` : ""}
                                    {task.approver_name ? ` • Approved by ${task.approver_name}` : ""}
                                  </span>
                                </div>
                              )}

                              <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                                <div className="flex items-center gap-1.5 truncate max-w-[120px]">
                                  <div className="w-4 h-4 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] font-bold text-slate-700 dark:text-slate-300">
                                    {task.assignee_name ? task.assignee_name.charAt(0).toUpperCase() : "U"}
                                  </div>
                                  <span className="font-medium truncate">{task.assignee_name}</span>
                                </div>
                                <div
                                  className={cn(
                                    "flex items-center gap-1 font-mono tabular-nums text-[10px]",
                                    isOverdue ? "text-rose-600 font-bold" : "text-slate-400"
                                  )}
                                >
                                  <Calendar className="w-3 h-3" />
                                  <span>{task.due_date || "—"}</span>
                                </div>
                              </div>

                              {/* Card action buttons */}
                              <div className="pt-1 flex items-center justify-end gap-1.5 flex-wrap">
                                {task.status === "todo" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleMoveStatus(task.id, "in_progress")}
                                    className="min-h-[44px] h-11 px-3 flex items-center text-[11px] text-blue-600 hover:bg-blue-50 font-semibold"
                                  >
                                    Start Job →
                                  </Button>
                                )}
                                {task.status === "in_progress" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      if (task.requires_proof) {
                                        setActiveTaskForProof(task);
                                        setProofText("");
                                      } else {
                                        handleMoveStatus(task.id, "review");
                                      }
                                    }}
                                    className="min-h-[44px] h-11 px-3 flex items-center text-[11px] text-amber-600 hover:bg-amber-50 font-semibold"
                                  >
                                    Submit Proof
                                  </Button>
                                )}
                                {task.status === "review" && canApprove && (
                                  <>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleOpenRevision(task)}
                                      className="min-h-[44px] h-11 px-2.5 flex items-center text-[11px] text-amber-600 hover:bg-amber-50 font-medium"
                                    >
                                      Request Revision
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleApproveTask(task.id)}
                                      className="min-h-[44px] h-11 px-3 flex items-center text-[11px] text-emerald-600 hover:bg-emerald-50 font-bold"
                                    >
                                      Approve ✓
                                    </Button>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* Table View */
            <CRMCard variant="default" className="shadow-2xs">
              <CRMDataTable
                data={filteredTasks}
                columns={columns}
                searchPlaceholder=""
                pageSize={10}
                emptyMessage="No tasks found matching your filters."
              />
            </CRMCard>
          )}
        </main>

        {/* Modal: Create Task Dialog */}
        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Create Store Task</DialogTitle>
              <DialogDescription className="text-xs">
                Assign a job or workflow to an employee with priority and due date.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleCreateTask} className="space-y-3.5 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Task Title *
                </label>
                <Input
                  required
                  placeholder="e.g. Audit GST invoices for mismatch"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Description
                </label>
                <Textarea
                  placeholder="Detailed instructions or checklist..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="text-xs min-h-[70px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Priority
                  </label>
                  <Select value={newPriority} onValueChange={(v) => setNewPriority(v as TaskPriority)}>
                    <SelectTrigger className="text-xs h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="low">Low</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Due Date
                  </label>
                  <Input
                    type="date"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    className="text-xs h-9 font-mono"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Assignee
                  </label>
                  {staffList.length > 0 && (
                    <span className="text-[10px] text-slate-400">
                      {staffList.length} staff member{staffList.length > 1 ? "s" : ""} available
                    </span>
                  )}
                </div>

                {staffList.length > 0 && (
                  <Select
                    value={newAssigneeId || ""}
                    onValueChange={(val) => {
                      setNewAssigneeId(val);
                      const s = staffList.find((item) => item.id === val);
                      if (s) {
                        setNewAssigneeName(s.name);
                        setNewAssigneeRole(s.role);
                      }
                    }}
                  >
                    <SelectTrigger className="text-xs h-9 mb-1">
                      <SelectValue placeholder="Select staff member..." />
                    </SelectTrigger>
                    <SelectContent>
                      {staffList.map((staff) => (
                        <SelectItem key={staff.id} value={staff.id}>
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 rounded-full bg-slate-200 dark:bg-slate-700 text-[9px] font-bold flex items-center justify-center">
                              {staff.name.charAt(0)}
                            </div>
                            <span className="font-medium">{staff.name}</span>
                            {staff.role && (
                              <span className="text-[10px] text-slate-400">({staff.role})</span>
                            )}
                            {staff.crmRole && (
                              <span
                                className="text-[9px] px-1.5 py-0.2 rounded font-semibold text-white ml-auto"
                                style={{ backgroundColor: staff.crmRoleColor || "#1D4ED8" }}
                              >
                                {staff.crmRole}
                              </span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                <Input
                  placeholder="Staff member name..."
                  value={newAssigneeName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewAssigneeName(val);
                    const matched = staffList.find(
                      (s) => s.name.toLowerCase() === val.toLowerCase() || s.id === val
                    );
                    if (matched) {
                      setNewAssigneeId(matched.id);
                      setNewAssigneeRole(matched.role);
                    }
                  }}
                  className="text-xs h-9"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="requiresProof"
                  checked={newRequiresProof}
                  onChange={(e) => setNewRequiresProof(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                <label htmlFor="requiresProof" className="text-xs text-slate-600 dark:text-slate-400">
                  Requires proof of work / notes before manager sign-off
                </label>
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
                <Button type="submit" className="text-xs h-9 bg-[#1D4ED8] hover:bg-blue-700 text-white">
                  Create & Assign
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Modal: Proof Submission */}
        <Dialog open={Boolean(activeTaskForProof)} onOpenChange={(open) => !open && setActiveTaskForProof(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Submit Proof of Work</DialogTitle>
              <DialogDescription className="text-xs">
                Provide verification notes for "{activeTaskForProof?.title}".
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <Textarea
                placeholder="Describe actions taken, bill numbers verified, or count results..."
                value={proofText}
                onChange={(e) => setProofText(e.target.value)}
                className="text-xs min-h-[90px]"
              />

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTaskForProof(null)}
                  className="text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmitProof}
                  className="text-xs h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  Submit for Review
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Modal: Manager Revision Request */}
        <Dialog open={Boolean(activeTaskForRevision)} onOpenChange={(open) => !open && setActiveTaskForRevision(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Request Revision</DialogTitle>
              <DialogDescription className="text-xs">
                Provide feedback notes detailing required revisions for "{activeTaskForRevision?.title}".
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 pt-2">
              <Textarea
                placeholder="Enter revision instructions or corrections needed..."
                value={revisionText}
                onChange={(e) => setRevisionText(e.target.value)}
                className="text-xs min-h-[90px]"
              />

              <DialogFooter className="pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setActiveTaskForRevision(null)}
                  className="text-xs h-9"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSubmitRevision}
                  className="text-xs h-9 bg-amber-600 hover:bg-amber-700 text-white font-semibold"
                >
                  Send Revision Request
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </CRMPermissionGate>
  );
}
