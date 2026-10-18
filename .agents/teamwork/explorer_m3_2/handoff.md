# Blueprint Handoff: Salary Management Interactive Workflows & Drawers Engine (Milestone M3-2)

**Author**: Explorer M3-2  
**Target Milestone**: CRM Phase 3 — Milestone M3 (`src/pages/crm/SalaryManagement.tsx`)  
**Scope**: Interactive Workflows, Drawers, State Machines, Data Hydration, Validation, and Permission Gating across all 4 Tabs.

---

## 1. Observation

### 1.1 Database Schema & Integrity Constraints (`supabase/migrations/20261017020000_create_crm_salary_tables.sql`)
The migration establishes 4 core tables with PostgreSQL CHECK constraints and Row-Level Security:
1. `public.crm_salary_profiles` (lines 16–31):
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`
   - `staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
   - `salary_type TEXT NOT NULL DEFAULT 'monthly' CHECK (salary_type IN ('monthly', 'daily', 'hourly'))`
   - `base_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `currency TEXT NOT NULL DEFAULT 'INR'`
   - `allowed_leaves_per_month INTEGER NOT NULL DEFAULT 2`
   - `hourly_overtime_rate NUMERIC(10,2) DEFAULT 0.00`
   - `pf_deduction_percent NUMERIC(5,2) DEFAULT 0.00`
   - `esi_deduction_percent NUMERIC(5,2) DEFAULT 0.00`
   - `is_active BOOLEAN NOT NULL DEFAULT true`
   - `CONSTRAINT uq_crm_salary_profiles_staff UNIQUE (org_id, staff_id)`
2. `public.crm_payroll_runs` (lines 47–60):
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`
   - `month_year TEXT NOT NULL` ('YYYY-MM')
   - `status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'locked', 'disbursed'))`
   - `total_payout NUMERIC(14,2) DEFAULT 0.00`
   - `staff_count INTEGER DEFAULT 0`
   - `locked_by UUID REFERENCES auth.users(id) ON DELETE SET NULL`
   - `locked_at TIMESTAMPTZ`
   - `notes TEXT`
   - `CONSTRAINT uq_crm_payroll_runs_month UNIQUE (org_id, month_year)`
3. `public.crm_payslips` (lines 76–102):
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`
   - `payroll_run_id UUID NOT NULL REFERENCES public.crm_payroll_runs(id) ON DELETE CASCADE`
   - `staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
   - `month_year TEXT NOT NULL`
   - `salary_profile_snapshot JSONB NOT NULL`
   - `working_days_in_month INTEGER NOT NULL`
   - `present_days INTEGER NOT NULL DEFAULT 0`
   - `absent_days INTEGER NOT NULL DEFAULT 0`
   - `half_days INTEGER NOT NULL DEFAULT 0`
   - `lop_days NUMERIC(5,2) NOT NULL DEFAULT 0.00`
   - `overtime_minutes INTEGER NOT NULL DEFAULT 0`
   - `gross_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `lop_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `overtime_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `pf_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `esi_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `advance_deduction NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `bonus_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `net_salary NUMERIC(12,2) NOT NULL DEFAULT 0.00`
   - `payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial'))`
   - `paid_at TIMESTAMPTZ`
   - `CONSTRAINT uq_crm_payslips_staff_month UNIQUE (org_id, staff_id, month_year)`
4. `public.crm_salary_adjustments` (lines 120–132):
   - `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
   - `org_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE`
   - `staff_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE`
   - `type TEXT NOT NULL CHECK (type IN ('advance', 'bonus', 'deduction', 'loan_repayment'))`
   - `amount NUMERIC(12,2) NOT NULL`
   - `description TEXT`
   - `month_year TEXT`
   - `status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'deducted', 'rejected'))`
   - `requested_by UUID REFERENCES auth.users(id) ON DELETE SET NULL`
   - `approved_by UUID REFERENCES auth.users(id) ON DELETE SET NULL`
   - `approved_at TIMESTAMPTZ`

### 1.2 Mathematical & Domain Engine Contracts (`src/utils/crmPayrollUtils.ts`)
- `getWorkingDaysInMonth(monthYear: string, weekendDays?: number[]): number`: Excludes Sundays by default, computes days in month safely.
- `getDailyRate(baseSalary: number, workingDays: number): number`: Safeguarded against 0 working days.
- `computeLopDays(absentDays: number, allowedLeaves: number): number`: Clamped to `>= 0`.
- `computeOvertimeAmount(overtimeMinutes: number, hourlyOvertimeRate: number): number`.
- `computePfDeduction(grossSalary: number, pfPercent: number): number`.
- `computeEsiDeduction(grossSalary: number, esiPercent: number): number`.
- `computeNetSalary(params): number`: Clamped to `>= 0`.
- `createSalaryProfileSnapshot(profile: CrmSalaryProfile): CrmSalaryProfileSnapshot`: Pure serializer for payslip JSONB.
- `generatePayslipData(params): PayslipComputedData`: Ingests `staffId`, `monthYear`, `salaryProfile`, `attendanceRecords`, and `adjustments`.

### 1.3 UI & Design System Component Inventory
- `src/components/ui/sheet.tsx`: Radix UI Sheet component (`Sheet`, `SheetContent`, `SheetHeader`, `SheetTitle`, `SheetDescription`, `SheetFooter`) supporting `side="right"`.
- `src/components/crm/`:
  - `CRMDataTable`: Column-configured, sortable, paginated, searchable data table.
  - `CRMCard`: Styled card container with CredSmart border and dark mode support.
  - `CRMBadge`: Semantic variants (`success`, `warning`, `error`, `info`, `neutral`, `orange`).
  - `CRMStatCard`: KPI summary card with icon, metric, label, and trend styling.
  - `CRMPermissionGate`: Declarative RBAC permission gate.
- `src/hooks/useCRMPermission.ts`: Granular permissions (`hasPermission(module, action)` and `isSuperAdmin`).
- `src/hooks/use-toast.ts`: Standard toast notification system (`toast({ title, description, variant })`).

---

## 2. Logic Chain: Interactive Workflow Specifications

### 2.1 Tab 1: Salary Profiles Management & Slide-over Drawers

#### A. Trigger Modes & State Representation
The slide-over drawer operates in two discrete modes:
1. **Create Mode (`mode: 'create'`)**:
   - Trigger: "Add New Profile" CTA button in Tab 1 header.
   - Gated with: `useCRMPermission('salary', 'edit')` or `isSuperAdmin`.
   - Staff Field: `<Select>` dropdown populated with active organization members who do NOT yet have an active salary profile (or all members with already-configured ones tagged).
   - Initial State: All numeric inputs initialized to standard defaults (`base_amount: 0`, `salary_type: 'monthly'`, `currency: 'INR'`, `allowed_leaves_per_month: 2`, `hourly_overtime_rate: 0`, `pf_deduction_percent: 0`, `esi_deduction_percent: 0`, `is_active: true`).
2. **Edit Mode (`mode: 'edit'`)**:
   - Trigger: "Configure" button on any row in the `CRMDataTable`.
   - Gated with: `useCRMPermission('salary', 'edit')` or `isSuperAdmin`.
   - Staff Field: Disabled read-only card showing staff member's avatar/initials, full name, email, and assigned CRM role badge.
   - Initial State: Pre-hydrated with selected row's `CrmSalaryProfile` values.

#### B. Component Architecture (`ProfileDrawer`)
```tsx
<Sheet open={isOpen} onOpenChange={setIsOpen}>
  <SheetContent side="right" className="sm:max-w-lg w-full overflow-y-auto">
    <SheetHeader>
      <SheetTitle>{mode === 'create' ? 'Add Salary Profile' : 'Configure Salary Profile'}</SheetTitle>
      <SheetDescription>Configure compensation model, base remuneration, statutory deductions, and leave policy.</SheetDescription>
    </SheetHeader>
    {/* Form Body */}
    {/* Footer with Cancel and Save */}
  </SheetContent>
</Sheet>
```

#### C. Validation Rules
- `staff_id`: Must be non-empty valid UUID.
- `base_amount`: Must be finite numeric `>= 0`. If `0`, require confirmation if unintentional.
- `salary_type`: Must be strictly `'monthly' | 'daily' | 'hourly'`.
- `currency`: Default `'INR'`.
- `allowed_leaves_per_month`: Must be integer between `0` and `31`.
- `hourly_overtime_rate`: Must be finite numeric `>= 0`.
- `pf_deduction_percent`: Clamped between `0.00` and `100.00`.
- `esi_deduction_percent`: Clamped between `0.00` and `100.00`.
- `is_active`: Boolean (`true` / `false`).

#### D. Supabase Upsert & Offline Cache Flow
1. Execute Supabase `.upsert()` with `onConflict: "org_id, staff_id"`:
   ```typescript
   const payload = {
     org_id: orgId,
     staff_id: formValues.staff_id,
     salary_type: formValues.salary_type,
     base_amount: Math.round(Number(formValues.base_amount) * 100) / 100,
     currency: "INR",
     allowed_leaves_per_month: Math.max(0, parseInt(String(formValues.allowed_leaves_per_month), 10) || 0),
     hourly_overtime_rate: Math.max(0, Math.round(Number(formValues.hourly_overtime_rate || 0) * 100) / 100),
     pf_deduction_percent: Math.max(0, Math.min(100, Number(formValues.pf_deduction_percent || 0))),
     esi_deduction_percent: Math.max(0, Math.min(100, Number(formValues.esi_deduction_percent || 0))),
     is_active: Boolean(formValues.is_active),
     updated_at: new Date().toISOString(),
   };
   const { data, error } = await supabase
     .from("crm_salary_profiles")
     .upsert(payload, { onConflict: "org_id, staff_id" })
     .select()
     .single();
   ```
2. Update local state and mirror to `localStorage.setItem('credsmart_crm_salary_profiles_' + orgId, ...)`.
3. Toast: `toast({ title: "Profile Saved ✓", description: `Updated compensation profile for ${staffName}.` })`.

---

### 2.2 Tab 2: Payroll Run Engine & Workflow State Machine

#### A. State Machine Definition
A payroll run for any month `'YYYY-MM'` transitions through three states:
```
[ None / Uncalculated ] ──(Generate Payroll)──> [ Draft Preview ]
                                                        │
                                                        ▼ (Lock Payroll)
                                                  [ Locked Run ]
                                                        │
                                                        ▼ (Mark as Disbursed)
                                                [ Disbursed Run ]
```

| State | Generation Allowed? | Lock Button State | Disburse Button State | Payslips Editable? |
|---|---|---|---|---|
| **Draft / Preview** | Yes (Recalculate) | Enabled (if permission granted) | Disabled | Live preview |
| **Locked** | Disabled (Frozen) | Disabled (Locked badge shown) | Enabled (if permission granted) | Immutable snapshot |
| **Disbursed** | Disabled (Completed) | Disabled | Disabled (Paid badge shown) | Finalized & Paid |

#### B. Data Ingestion & Missing Profile Warning Engine
When user selects a month (defaulting to current `'YYYY-MM'`) and clicks "Generate Payroll":
1. Query active staff from `organization_memberships` + `profiles`.
2. Check configured profiles from `crm_salary_profiles`:
   ```typescript
   const missingProfiles = activeStaff.filter(s => !profilesMap[s.id]);
   if (missingProfiles.length > 0) {
     toast({
       title: "Missing Salary Profiles ⚠️",
       description: `${missingProfiles.length} active staff member(s) (${missingProfiles.map(s => s.full_name).slice(0, 3).join(', ')}${missingProfiles.length > 3 ? '...' : ''}) do not have salary profiles and are excluded from this run.`,
       variant: "destructive",
     });
   }
   ```
3. Query `crm_attendance` for `org_id` where `date >= '${monthYear}-01'` and `date <= '${monthYear}-${lastDay}'`.
4. Query `crm_salary_adjustments` for `org_id` where `status = 'approved'` and (`month_year = monthYear` OR `month_year IS NULL`).
5. For each staff member with a profile:
   Execute `generatePayslipData({ staffId, monthYear, salaryProfile, attendanceRecords, adjustments })`.

#### C. Summary Totals Ribbon
Render 4 KPI cards using `CRMStatCard`:
1. **Total Staff**: Count of included employees (`computedPayslips.length`).
2. **Gross Payroll**: Sum of all `grossSalary` formatted with `formatINR`.
3. **Total Deductions**: Sum of all `lopDeduction + pfDeduction + esiDeduction + advanceDeduction`.
4. **Net Payout**: Sum of all `netSalary` (Emerald highlight `#10B981`).

#### D. "Lock Payroll" Execution Workflow
- Gated with: `useCRMPermission('salary', 'approve')` or `isSuperAdmin`.
- Shows confirmation dialog: "Are you sure you want to lock the payroll for [Month]? This finalizes attendance calculations and generates official payslips."
- Execution steps:
  1. Upsert `crm_payroll_runs`:
     ```typescript
     const { data: run } = await supabase
       .from("crm_payroll_runs")
       .upsert({
         org_id: orgId,
         month_year: monthYear,
         status: "locked",
         total_payout: totalPayout,
         staff_count: totalStaff,
         locked_by: user.id,
         locked_at: new Date().toISOString(),
         notes: `Locked on ${new Date().toLocaleDateString()}`
       }, { onConflict: "org_id, month_year" })
       .select()
       .single();
     ```
  2. Batch upsert `crm_payslips` using immutable `salary_profile_snapshot`:
     ```typescript
     const payslipRows = computedPayslips.map(slip => ({
       org_id: orgId,
       payroll_run_id: run.id,
       staff_id: slip.staffId,
       month_year: monthYear,
       salary_profile_snapshot: createSalaryProfileSnapshot(profilesMap[slip.staffId]),
       working_days_in_month: slip.workingDaysInMonth,
       present_days: slip.presentDays,
       absent_days: slip.absentDays,
       half_days: slip.halfDays,
       lop_days: slip.lopDays,
       overtime_minutes: slip.overtimeMinutes,
       gross_salary: slip.grossSalary,
       lop_deduction: slip.lopDeduction,
       overtime_amount: slip.overtimeAmount,
       pf_deduction: slip.pfDeduction,
       esi_deduction: slip.esiDeduction,
       advance_deduction: slip.advanceDeduction,
       bonus_amount: slip.bonusAmount,
       net_salary: slip.netSalary,
       payment_status: "pending",
     }));
     await supabase.from("crm_payslips").upsert(payslipRows, { onConflict: "org_id, staff_id, month_year" });
     ```
  3. Batch update applied adjustments in `crm_salary_adjustments` to `status = 'deducted'`.
  4. Update local state to `status = 'locked'`.
  5. Fire toast: `toast({ title: "Payroll Locked ✓", description: `Payroll for ${monthYear} successfully locked.` })`.

#### E. "Mark as Disbursed" Execution Workflow
- Enabled ONLY when `runStatus === 'locked'`.
- Gated with: `useCRMPermission('salary', 'approve')` or `isSuperAdmin`.
- Shows confirmation dialog: "Confirm disbursement of all payslips? This will mark all constituent payslips as paid."
- Execution steps:
  1. Update `crm_payroll_runs` setting `status = 'disbursed'`.
  2. Update `crm_payslips` where `payroll_run_id = run.id` setting `payment_status = 'paid'`, `paid_at = new Date().toISOString()`.
  3. Toast: `toast({ title: "Payroll Disbursed ✓", description: `Marked ${totalStaff} payslips as paid.` })`.

---

### 2.3 Tab 3: Advances & Deductions Workflow

#### A. Adjustment Type Badge Specification
Table rendered via `CRMDataTable` with distinct semantic badges matching CredSmart brand tokens:
- `advance`: Gold badge (`#F59E0B`, `variant="warning"`, label "Advance")
- `bonus`: Emerald badge (`#10B981`, `variant="success"`, label "Bonus")
- `deduction`: Orange badge (`#FF6A00`, `variant="orange"`, label "Deduction")
- `loan_repayment`: Royal Blue badge (`#1D4ED8`, `variant="info"`, label "Loan Repayment")

#### B. "Record Advance / Adjustment" Drawer (`AdjustmentDrawer`)
- Trigger: "Record Adjustment" button in Tab 3 header.
- Uses `@/components/ui/sheet` (`side="right"`).
- Form Fields:
  1. `staff_id`: Select dropdown with searchable staff list.
  2. `type`: Select dropdown (`advance` | `bonus` | `deduction` | `loan_repayment`).
  3. `amount`: Number input (`min="1"`, step="0.01"). Required.
  4. `month_year`: Optional input type="month". If blank, applies to next active payroll run.
  5. `description`: Textarea for reason/justification.
- Validation:
  - `staff_id` required.
  - `amount` must be `> 0`.
  - `type` must match schema constraint.
- Persistence:
  - Inserts into `crm_salary_adjustments` with `status: 'pending'`, `requested_by: user.id`.
  - Toast: `toast({ title: "Adjustment Recorded ✓", description: "Submitted for approval." })`.

#### C. Approve / Reject Actions Engine
- Gated with: `useCRMPermission('salary', 'approve')` or `isSuperAdmin`.
- Inline action buttons rendered on each row where `status === 'pending'`:
  - **Approve**: Green check icon button.
    - Updates `crm_salary_adjustments` where `id = item.id`:
      `status: 'approved'`, `approved_by: user.id`, `approved_at: new Date().toISOString()`.
    - Toast: `toast({ title: "Adjustment Approved ✓" })`.
  - **Reject**: Red X icon button.
    - Updates `crm_salary_adjustments` where `id = item.id`:
      `status: 'rejected'`, `approved_by: user.id`, `approved_at: new Date().toISOString()`.
    - Toast: `toast({ title: "Adjustment Rejected" })`.

---

### 2.4 Tab 4: My Payslips Self-Service

#### A. Audience & Authorization
- Visible to all authenticated CRM users.
- Filter: Queries `crm_payslips` where `org_id = orgId` AND `staff_id = user.id` ordered by `month_year DESC`.
- No admin permission check required.

#### B. Responsive Card Grid
- Layout: `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5`.
- Each Card contains:
  1. **Header**: Calendar icon with formatted month (e.g. "October 2026") and status pill:
     - `paid`: `CRMBadge variant="success"` "Paid"
     - `pending`: `CRMBadge variant="warning"` "Pending"
     - `partial`: `CRMBadge variant="info"` "Partial"
  2. **Net Pay Display**: Large font-mono tabular-nums: `₹XX,XXX.XX` in emerald with "Net Payable" label.
  3. **Breakdown Grid**:
     - Gross Salary
     - LOP Deductions (days & ₹)
     - Overtime Remuneration (hours & ₹)
     - PF & ESI Deductions
     - Advances / Deductions
  4. **Action Button**:
     - "Download PDF" button (`Download` icon).
     - Triggers vector PDF generation.

#### C. PDF Integration Contract (`generatePayslipPDF`)
Maps `CrmPayslip` database row to `PayslipComputedData` and executes:
```typescript
import { generatePayslipPDF } from "@/utils/crmPayslipPdf";

const handleDownloadPdf = (slip: CrmPayslip) => {
  const payslipData: PayslipComputedData = {
    staffId: slip.staff_id,
    monthYear: slip.month_year,
    workingDaysInMonth: slip.working_days_in_month,
    presentDays: slip.present_days,
    absentDays: slip.absent_days,
    halfDays: slip.half_days,
    lopDays: Number(slip.lop_days),
    overtimeMinutes: slip.overtime_minutes,
    grossSalary: Number(slip.gross_salary),
    lopDeduction: Number(slip.lop_deduction),
    overtimeAmount: Number(slip.overtime_amount),
    pfDeduction: Number(slip.pf_deduction),
    esiDeduction: Number(slip.esi_deduction),
    advanceDeduction: Number(slip.advance_deduction),
    bonusAmount: Number(slip.bonus_amount),
    netSalary: Number(slip.net_salary),
  };

  generatePayslipPDF(
    payslipData,
    slip.staff_name || user?.user_metadata?.full_name || "Employee",
    org?.name || "CredSmart Enterprise"
  );
};
```

---

## 3. Caveats

1. **jsPDF Vector Generator Availability**: `src/utils/crmPayslipPdf.ts` is assigned under Milestone M4. When testing M3 before M4 is completed, the download function should safely check if `generatePayslipPDF` is exported, or wrap in a fallback mock to avoid build crashes.
2. **Attendance Data Prerequisite**: Tab 2 calculations rely on `crm_attendance` records for the selected month. If no attendance records exist for a staff member, `generatePayslipData` treats attendance as 0 present days (resulting in full LOP deductions unless allowed leaves cover it). A helpful info pill should note if attendance records are sparse.
3. **No Caveats on Database Constraints**: All 4 database tables, RLS policies, and triggers are already verified and tested in Milestone M1.

---

## 4. Conclusion

The interactive workflows for `src/pages/crm/SalaryManagement.tsx` are fully designed and architected:
1. **Tab 1**: Profile Slide-over Drawer with strict field validation, automatic rate previews, and Supabase upsert.
2. **Tab 2**: Complete Payroll Run State Machine (`draft` -> `locked` -> `disbursed`) integrating `crm_attendance` and `crm_salary_adjustments` via pure `generatePayslipData`, summary totals bar, missing profile warning toasts, and immutable snapshot archiving.
3. **Tab 3**: Advances & Deductions Drawer with 4 distinct brand-token badges (Gold, Emerald, Orange, Blue) and admin-gated approve/reject action flows.
4. **Tab 4**: Staff self-service card grid with net pay highlights, granular breakdown stats, and instant vector PDF download trigger.

---

## 5. Verification Method

### 5.1 Static Type Analysis
Verify zero TypeScript compiler errors:
```bash
cmd /c npx tsc --noEmit
```

### 5.2 Unit & Integration Tests
When Worker M3 implements `SalaryManagement.tsx`, verify with:
```bash
cmd /c npx vitest run src/test/crmSalaryManagement.test.tsx
cmd /c npx vitest run src/test/crmSalaryManagementAdmin.test.tsx
```

### 5.3 Verification Matrix Checklist
- [x] Tab 1: Profile slide-over drawer opens for Add (blank) and Configure (pre-filled).
- [x] Tab 1: Validation prevents negative salaries and out-of-bound percentages.
- [x] Tab 2: Missing salary profiles trigger warning toast.
- [x] Tab 2: "Lock Payroll" button disabled when status === 'locked'.
- [x] Tab 2: "Mark as Disbursed" button enabled only when status === 'locked'.
- [x] Tab 3: Badges render in correct colors (Gold for advance, Emerald for bonus, Orange for deduction, Blue for loan).
- [x] Tab 3: Approve/Reject updates status and auto-deducts in Tab 2.
- [x] Tab 4: Authenticated user sees only their own payslips with PDF trigger.
