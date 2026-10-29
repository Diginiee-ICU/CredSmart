import { useState } from "react";
import { Copy, MessageCircle, Trash2, Check, Plus, Settings2, ListChecks } from "lucide-react";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";
import { staffSignInMessage, staffSignInUrl } from "@/crm/lib/app-url";
import {
  actions,
  useStore,
  PALETTE,
  PERMISSIONS,
  defaultPermissions,
  BUILTIN_ROLES,
  operatorRole,
  teamStatus,
  type TeamStatus,
  waLink,
  type Employee,
  type Role,
} from "@/crm/lib/store";
import { Avatar, Button, Field, inputCls, Sheet } from "./primitives";
export function EmployeeGrid({
  onAssign,
  onManage,
  filter = null,
}: {
  onAssign: (e: Employee) => void;
  onManage: (e: Employee) => void;
  filter?: TeamStatus | null;
}) {
  const s = useStore((s) => s);
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-2.5">
      {s.employees.filter((e) => !filter || teamStatus(e, s) === filter).map((e) => (
        <div key={e.id} className="glass p-2.5 rounded-2xl min-w-0">
          <div className="grid grid-cols-[minmax(0,1fr)_24px] items-center gap-1">
            <Button
              variant="ghost"
              onClick={() => onAssign(e)}
              aria-label={`Assign task to ${e.name}`}
              className="h-auto min-h-8 p-0 justify-start gap-2 hover:bg-transparent min-w-0"
            >
              <Avatar
                e={e}
                live={s.attendance.some(
                  (a) =>
                    a.empId === e.id &&
                    a.date === new Date().toLocaleDateString("en-CA") &&
                    a.inAt &&
                    !a.outAt,
                )}
              />
              <span className="min-w-0 text-left">
                <span className="block text-sm font-semibold truncate">{e.name}</span>
                <span className="block text-[11px] text-muted-foreground truncate">
                  {e.role}
                </span>
              </span>
            </Button>
            <div className="flex flex-col">
              <Button
                variant="ghost"
                aria-label={`Manage ${e.name}`}
                title="Manage employee & permissions"
                onClick={() => onManage(e)}
                className="size-6 p-0"
              >
                <Settings2 className="size-3.5" />
              </Button>
              <Button
                variant="ghost"
                aria-label={`Task for ${e.name}`}
                title="Assign task"
                onClick={() => onAssign(e)}
                className="size-6 p-0 text-primary"
              >
                <ListChecks className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
export function StaffEditor({
  employee,
  onClose,
}: {
  employee: Employee | null;
  onClose: () => void;
}) {
  const [f, setF] = useState<Omit<Employee, "id" | "pin">>(
    employee ?? {
      name: "",
      mobile: "",
      designation: "",
      salary: 0,
       role: "General Executive" as Role,
      color: PALETTE[0]?.c ?? "var(--staff-blue)",
       permissions: defaultPermissions("General Executive"),
    },
  );
  const [remove, setRemove] = useState(false);
  const me = useStore((s) => s.me);
  const s = useStore((s) => s);
  const admin = operatorRole(s) === "Admin";
  const [createRole, setCreateRole] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [rolePermissions, setRolePermissions] = useState(defaultPermissions("General Executive"));
  const save = () => {
    if (!f.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (f.salary < 0 || !Number.isFinite(f.salary)) {
      toast.error("Enter a valid salary");
      return;
    }
    if (f.otRate !== undefined && (!Number.isFinite(f.otRate) || f.otRate < 0)) { toast.error("Enter a valid overtime rate"); return; }
    if (employee) actions.updateEmployee(employee.id, { ...f, name: f.name.trim() });
    else {
      const e = actions.addEmployee(f);
      actions.updateEmployee(e.id, { color: f.color, permissions: f.permissions, shiftStart: f.shiftStart, otRate: f.otRate });
    }
    toast.success("Staff details saved");
    onClose();
  };
  return (
    <Sheet title={employee ? "Manage Employee & Permissions" : "Add Staff"} onClose={onClose}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Name">
          <input
            className={inputCls}
            value={f.name}
            onChange={(e) => setF({ ...f, name: e.target.value })}
          />
        </Field>
        <Field label="Phone">
          <input
            className={inputCls}
            inputMode="tel"
            value={f.mobile}
            onChange={(e) => setF({ ...f, mobile: e.target.value })}
          />
        </Field>
        <Field label="Designation">
          <input
            className={inputCls}
            value={f.designation}
            onChange={(e) => setF({ ...f, designation: e.target.value })}
          />
        </Field>
        <Field label="Monthly Salary (₹)">
          <input
            type="number"
            min="0"
            className={inputCls}
            value={f.salary}
            onChange={(e) => setF({ ...f, salary: Number(e.target.value) })}
          />
        </Field>
      </div>
      <Field label="Role">
        <select
          className={inputCls}
          value={f.role}
          disabled={!admin}
          onChange={(e) => {
            const role = e.target.value as Role;
            setF({ ...f, role, designation: role, permissions: s.customRoles.find((r) => r.name === role)?.permissions ?? defaultPermissions(role) });
          }}
        >
          {[...BUILTIN_ROLES, ...s.customRoles.map((r) => r.name), ...(![...BUILTIN_ROLES, ...s.customRoles.map((r) => r.name)].includes(f.role) ? [f.role] : [])].map((r) => <option key={r}>{r}</option>)}
        </select>
      </Field>
      {admin && <Button variant="secondary" className="h-8 text-xs" onClick={() => setCreateRole(!createRole)}><Plus />Create Custom Role</Button>}
      {admin && createRole && <div className="space-y-2 border-y border-border py-3"><Field label="Custom role name"><input className={inputCls} maxLength={60} value={roleName} onChange={(e) => setRoleName(e.target.value)} /></Field>{PERMISSIONS.map((p) => <label key={p.key} className="flex items-center justify-between gap-2 text-xs"><span>{p.label}</span><Switch aria-label={`Default ${p.label}`} checked={rolePermissions[p.key]} onCheckedChange={(v) => setRolePermissions({ ...rolePermissions, [p.key]: v })} /></label>)}<Button className="w-full h-8 text-xs" onClick={() => { try { actions.saveRole({ name: roleName, permissions: rolePermissions }); setF({ ...f, role: roleName.trim(), designation: roleName.trim(), permissions: rolePermissions }); setCreateRole(false); setRoleName(""); toast.success("Custom role saved"); } catch (err) { toast.error(err instanceof Error ? err.message : "Could not create role"); } }}>Save Custom Role</Button></div>}
      {admin && <div className="grid grid-cols-2 gap-3"><Field label="Shift start override"><input type="time" className={inputCls} value={f.shiftStart ?? ""} onChange={(e) => setF({ ...f, shiftStart: e.target.value })} /></Field><Field label="OT rate override (₹/hr)"><input type="number" min="0" className={inputCls} placeholder="Company rate" value={f.otRate ?? ""} onChange={(e) => setF({ ...f, otRate: e.target.value === "" ? undefined : Number(e.target.value) })} /></Field></div>}
      <Field label="Assigned Colour">
        <div className="flex justify-between gap-2">
          {PALETTE.map((p) => (
            <Button
              key={p.name}
              variant="ghost"
              aria-label={p.name}
              title={p.name}
              onClick={() => setF({ ...f, color: p.c })}
              className="staff-swatch size-8 rounded-full p-0 text-primary-foreground"
              style={{ "--employee-color": p.c } as React.CSSProperties}
            >
              {f.color === p.c && <Check />}
            </Button>
          ))}
        </div>
      </Field>
      <div className="space-y-3 border-t border-border pt-3">
        {PERMISSIONS.map((p) => (
          <label key={p.key} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
            <span className="text-xs font-medium">{p.label}</span>
            <Switch
              aria-label={p.label}
              checked={f.permissions[p.key]}
              disabled={!admin}
              onCheckedChange={(v) => setF({ ...f, permissions: { ...f.permissions, [p.key]: v } })}
              className="data-[state=checked]:bg-success"
            />
          </label>
        ))}
      </div>
      <Button className="w-full rounded-xl" onClick={save}>
        <Check />
        Save Changes
      </Button>
      {employee && (
        <>
          <Button
            className="w-full bg-success text-primary-foreground rounded-xl hover:bg-success/90"
            onClick={() => {
              if (!f.mobile.trim()) {
                toast.error("Add a phone number first");
                return;
              }
              actions.updateEmployee(employee.id, f);
              window.open(
                waLink(
                  f.mobile,
                  `Welcome, ${f.name}!\nDesignation: ${f.designation}\nPhone: ${f.mobile}\nSign-in link: ${staffSignInUrl(s.companyId)}\n4-digit PIN: ${employee.pin}`,
                ),
                "_blank",
                "noopener",
              );
            }}
          >
            <MessageCircle />
            Share Login Details on WhatsApp
          </Button>
          {employee.id !== me &&
            (remove ? (
              <div className="space-y-2">
                <p className="text-xs">Remove {employee.name} and their assigned tasks?</p>
                <Button
                  variant="destructive"
                  className="w-full rounded-xl"
                  onClick={() => {
                    actions.removeEmployee(employee.id);
                    onClose();
                  }}
                >
                  Confirm Remove
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                className="w-full text-destructive"
                onClick={() => setRemove(true)}
              >
                <Trash2 />
                Remove Employee
              </Button>
            ))}
        </>
      )}
    </Sheet>
  );
}
export function StaffScreen({
  onManage,
  onAdd,
  onAssign,
}: {
  onManage: (e: Employee) => void;
  onAdd: () => void;
  onAssign: (e: Employee) => void;
}) {
  const s = useStore((s) => s);
  const n = s.employees.length;
  const url = staffSignInUrl(s.companyId);
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{n} active profiles</span>
        <Button onClick={onAdd} className="rounded-xl text-xs px-3">
          <Plus />
          Add Staff
        </Button>
      </div>
      <div className="metal-frame rounded-2xl p-3 space-y-2" aria-label="Staff sign-in link">
        <p className="text-xs font-semibold">Staff Sign-In Link</p>
        <p className="text-[11px] text-muted-foreground break-all" data-no-i18n>{url}</p>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" className="h-8 text-xs rounded-xl" onClick={async () => { try { await navigator.clipboard.writeText(url); toast.success("Sign-in link copied"); } catch { toast.message(url); } }}>
            <Copy className="size-3.5" />
            Copy Link
          </Button>
          <Button className="h-8 text-xs rounded-xl bg-success text-primary-foreground hover:bg-success/90" onClick={() => window.open(waLink("", staffSignInMessage(s.companyId)), "_blank", "noopener")}>
            <MessageCircle className="size-3.5" />
            Share on WhatsApp
          </Button>
        </div>
      </div>
      <EmployeeGrid onManage={onManage} onAssign={onAssign} />
    </section>
  );
}
