import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  User,
  ArrowRight,
  MoreVertical,
  Layers,
  Sparkles,
  ChevronRight,
  X,
  FileCheck,
  Tag,
  Kanban,
  Table as TableIcon,
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

export type TaskPriority = "urgent" | "high" | "normal" | "low";
export type TaskStatus = "todo" | "in_progress" | "review" | "done";

export interface CRMTask {
  id: string;
  org_id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignee_name: string;
  assignee_id?: string;
  due_date: string;
  created_at: string;
  completed_at?: string;
  requires_proof?: boolean;
  proof_notes?: string;
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
    requires_proof: false,
  },
];

export default function Tasks(): React.ReactElement {
  const { orgId, org } = useOrganization();
  const { hasPermission, isSuperAdmin } = useCRMPermission();

  const canCreate = isSuperAdmin || hasPermission("tasks", "create");
  const canApprove = isSuperAdmin || hasPermission("tasks", "approve");

  const storageKey = `credsmart_crm_tasks_${orgId || "default"}`;

  const [tasks, setTasks] = useState<CRMTask[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) return JSON.parse(saved);
    } catch {
      // Fallback
    }
    return INITIAL_TASKS;
  });

  const [viewMode, setViewMode] = useState<"kanban" | "table">("kanban");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [activeTaskForProof, setActiveTaskForProof] = useState<CRMTask | null>(null);
  const [proofText, setProofText] = useState("");

  // New task form state
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<TaskPriority>("normal");
  const [newAssignee, setNewAssignee] = useState("");
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

  // Metrics
  const metrics = useMemo(() => {
    const total = tasks.length;
    const inProgress = tasks.filter((t) => t.status === "in_progress").length;
    const review = tasks.filter((t) => t.status === "review").length;
    const done = tasks.filter((t) => t.status === "done").length;
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0;
    return { total, inProgress, review, done, completionRate };
  }, [tasks]);

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
  const handleMoveStatus = (taskId: string, nextStatus: TaskStatus) => {
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: nextStatus,
              completed_at: nextStatus === "done" ? new Date().toISOString() : undefined,
            }
          : t
      )
    );
    toast({
      title: "Task Status Updated",
      description: `Task marked as ${nextStatus.replace("_", " ")}.`,
    });
  };

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast({ title: "Validation Error", description: "Title is required", variant: "destructive" });
      return;
    }

    const created: CRMTask = {
      id: `task-${Date.now()}`,
      org_id: orgId || "",
      title: newTitle.trim(),
      description: newDescription.trim(),
      priority: newPriority,
      status: "todo",
      assignee_name: newAssignee.trim() || "Unassigned",
      due_date: newDueDate,
      created_at: new Date().toISOString(),
      requires_proof: newRequiresProof,
    };

    setTasks((prev) => [created, ...prev]);
    setIsCreateOpen(false);
    setNewTitle("");
    setNewDescription("");
    setNewAssignee("");
    toast({
      title: "Task Created",
      description: `"${created.title}" assigned to ${created.assignee_name}.`,
    });
  };

  const handleSubmitProof = () => {
    if (!activeTaskForProof) return;
    setTasks((prev) =>
      prev.map((t) =>
        t.id === activeTaskForProof.id
          ? {
              ...t,
              status: "review",
              proof_notes: proofText.trim() || "Work completed and submitted for manager approval.",
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
        <div className="space-y-0.5">
          <div className="font-semibold text-slate-900 dark:text-white text-xs sm:text-sm">
            {row.title}
          </div>
          <div className="text-[11px] text-slate-500 line-clamp-1">{row.description}</div>
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
            {row.assignee_name.charAt(0)}
          </div>
          <span>{row.assignee_name}</span>
        </div>
      ),
      sortable: true,
    },
    {
      key: "due_date",
      header: "Due Date",
      accessor: (row) => (
        <span className="font-mono text-xs tabular-nums text-slate-600 dark:text-slate-400">
          {row.due_date}
        </span>
      ),
      sortable: true,
    },
    {
      key: "actions",
      header: "Actions",
      accessor: (row) => (
        <div className="flex items-center gap-1.5">
          {row.status === "todo" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleMoveStatus(row.id, "in_progress")}
              className="h-7 text-xs px-2"
            >
              Start
            </Button>
          )}
          {row.status === "in_progress" && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (row.requires_proof) {
                  setActiveTaskForProof(row);
                } else {
                  handleMoveStatus(row.id, "done");
                }
              }}
              className="h-7 text-xs px-2 text-blue-600 border-blue-200"
            >
              Submit
            </Button>
          )}
          {row.status === "review" && canApprove && (
            <Button
              size="sm"
              onClick={() => handleMoveStatus(row.id, "done")}
              className="h-7 text-xs px-2 bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Approve
            </Button>
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
                  <CRMBadge variant="info" size="sm">
                    Phase 3 Active
                  </CRMBadge>
                  <CRMBadge variant="success" size="sm" dot>
                    Kanban Ready
                  </CRMBadge>
                </div>
              }
              actions={
                <div className="flex items-center gap-2">
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
                        colTasks.map((task) => (
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

                            <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                              {task.description}
                            </p>

                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                              <div className="flex items-center gap-1">
                                <User className="w-3 h-3 text-slate-400" />
                                <span className="font-medium truncate max-w-[90px]">{task.assignee_name}</span>
                              </div>
                              <div className="flex items-center gap-1 font-mono tabular-nums text-slate-400">
                                <Calendar className="w-3 h-3" />
                                <span>{task.due_date}</span>
                              </div>
                            </div>

                            {/* Card action buttons */}
                            <div className="pt-1 flex items-center justify-end gap-1.5">
                              {task.status === "todo" && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMoveStatus(task.id, "in_progress")}
                                  className="min-h-[44px] h-11 px-3 flex items-center text-[11px] text-blue-600 hover:bg-blue-50"
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
                                    } else {
                                      handleMoveStatus(task.id, "done");
                                    }
                                  }}
                                  className="min-h-[44px] h-11 px-3 flex items-center text-[11px] text-amber-600 hover:bg-amber-50"
                                >
                                  Submit Proof
                                </Button>
                              )}
                              {task.status === "review" && canApprove && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleMoveStatus(task.id, "done")}
                                  className="min-h-[44px] h-11 px-3 flex items-center text-[11px] text-emerald-600 hover:bg-emerald-50 font-bold"
                                >
                                  Approve ✓
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
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

        {/* Modal: Create Task Drawer */}
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
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Assignee
                </label>
                <Input
                  placeholder="Staff member name..."
                  value={newAssignee}
                  onChange={(e) => setNewAssignee(e.target.value)}
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
      </div>
    </CRMPermissionGate>
  );
}
