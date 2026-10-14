# Handoff Report: Mobile Invoice Success View Edit Triggers Test Specification

- **Author**: Explorer 3 (`explorer_survey_3`)
- **Recipient**: Orchestrator (`128ce6df-e01a-4513-8b58-90303779e4c7`)
- **Target Component**: `src/components/invoices/mobile/MobileInvoiceSuccessView.tsx`
- **Target Test File**: `src/test/MobileInvoiceSuccessView.test.tsx`
- **Related Files**: `src/components/SalesInvoiceModal.tsx`, `src/components/PurchaseInvoiceModal.tsx`, `vitest.config.ts`, `src/test/setup.ts`
- **Date**: 2026-10-14T06:58:00Z

---

## 1. Observation

### 1.1 Test Configuration & Dependencies
Direct inspection of `package.json` (lines 52–53, 134–135, 147, 156):
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest"
},
"devDependencies": {
  "@testing-library/jest-dom": "^6.6.0",
  "@testing-library/react": "^16.0.0",
  "jsdom": "^20.0.3",
  "vitest": "^3.2.4"
}
```
Direct inspection of `vitest.config.ts`:
```ts
export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
```
Direct inspection of `src/test/setup.ts`:
```ts
import "@testing-library/jest-dom";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => {},
  }),
});
```

### 1.2 Repository Test File Locations & Existing Coverage
A search across the entire project for test files (`*.test.ts`, `*.test.tsx`, `*.spec.ts`, `*.spec.tsx`) revealed exactly 12 existing test suites:
- `src/test/unifiedInvoiceRenderer.test.tsx` (122 tests, UI component rendering)
- `src/test/unifiedInvoiceRenderer.edge.test.tsx` (47 tests, UI stress and edge cases)
- `src/test/downloadExactInvoice.test.ts` (16 tests, PDF engine)
- `src/test/downloadExactInvoice.adversarial.test.ts` (12 tests, PDF boundaries)
- `src/test/downloadExactInvoice.realjspdf.test.ts` (5 tests, jsPDF integration)
- `src/test/invoiceCalculations.test.ts` (8 tests, calculation logic)
- `src/test/unitConversionBill.test.ts` (9 tests, alternate units)
- `src/test/networkInvoicing.test.ts` (13 tests, B2B network invoicing)
- `src/test/tallyBridge.test.ts` (1 test, proxy)
- `src/test/tallyImport.test.ts` (12 tests, XML import)
- `src/test/tallyE2E.test.ts` (98 tests, sync pipeline)
- `src/test/example.test.ts` (10 tests, baseline sanity)

**Finding on Target Component Coverage**:
- `grep_search` across `src/` for `MobileInvoiceSuccessView`: **0 tests exist**.
- `grep_search` across `src/` for `MobileCreateInvoice`: **0 tests exist**.
- `grep_search` across `src/` for `SalesInvoiceModal`: **0 tests exist**.
- There are **no existing unit or integration tests** anywhere in the repository for `MobileInvoiceSuccessView.tsx`.
- All existing tests reside in `src/test/`; no tests exist in `src/components/`.

### 1.3 `MobileInvoiceSuccessView.tsx` Component Architecture & Props
Direct inspection of `src/components/invoices/mobile/MobileInvoiceSuccessView.tsx`:
1. **Props Contract** (lines 6–20):
   ```tsx
   interface MobileInvoiceSuccessViewProps {
     invoice: BusinessDocument;
     onClose: () => void;
     onEdit?: () => void;
     onDelete?: () => void;
     onGenerateEwayBill?: () => void;
     storeInfo?: {
       name: string;
       phone?: string;
       email?: string;
       address?: string;
       gstin?: string;
     };
   }
   ```
2. **Current Action Buttons Row** (lines 262–288):
   - Currently renders 4 circular buttons: `Print`, `Download`, `Share`, `E-Way Bill`.
   - Missing circular `Edit` action button (Requirement R1).
3. **Current Sticky Footer** (lines 293–301):
   - Currently renders a single full-width `Done` button:
     ```tsx
     <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 pb-[max(1rem,env(safe-area-inset-bottom))] z-30">
       <button onClick={onClose} className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold text-[15px] shadow-sm active:bg-indigo-700 transition-colors">
         Done
       </button>
     </div>
     ```
   - Missing side-by-side `Edit Bill` button (Requirement R2).
4. **Header Edit Trigger** (lines 119–123):
   - Already contains an `Edit2` icon button in the header bar conditional on `{onEdit && ...}`.
5. **Component Dependencies**:
   - `lucide-react`: `ArrowLeft`, `Edit2`, `Trash2`, `MoreVertical`, `X`, `Clock`, `CheckCircle`, `Printer`, `Download`, `Share2`, `FileText`, `ChevronRight`.
   - `downloadExactInvoicePdf` from `@/utils/downloadExactInvoice`.
   - `BusinessDocument` from `@/types/documents`.
   - **Zero context dependencies**: Does not use React Router, Supabase, Redux, or QueryClient.

### 1.4 Test Runner Execution Verification
- Execution of `cmd.exe /c "npx vitest run src/test/invoiceCalculations.test.ts"` completed successfully with exit code 0 in 3.84s (8 passed).
- Execution of `cmd.exe /c "npx tsc --noEmit"` completed with exit code 0 (zero TypeScript errors across the entire codebase).

---

## 2. Logic Chain

### Step 2.1: Target Test File Path Selection
1. Observation 1.1 shows `vitest.config.ts` includes `src/**/*.{test,spec}.{ts,tsx}`.
2. Observation 1.2 shows that all 12 existing test suites in the repository are located under `src/test/` (e.g. `src/test/unifiedInvoiceRenderer.test.tsx`). None are co-located in `src/components/`.
3. **Inference**: Placing the new test file at `src/test/MobileInvoiceSuccessView.test.tsx` strictly adheres to project convention and will be automatically discovered by Vitest.

### Step 2.2: Mocking & Environment Strategy
1. Observation 1.3 shows that `MobileInvoiceSuccessView` is a pure presentational component with no React Router, Supabase, or Context dependencies.
2. It imports `downloadExactInvoicePdf` from `@/utils/downloadExactInvoice`.
3. In jsdom, html2canvas/jspdf would fail or produce unnecessary overhead if invoked.
4. `lucide-react` icons render standard `<svg>` tags in React and jsdom without issues (verified in `unifiedInvoiceRenderer.test.tsx`).
5. `navigator.share` and `navigator.clipboard` are browser APIs; while not directly invoked by `onEdit` or `onClose`, mocking `@/utils/downloadExactInvoice` prevents unhandled side-effects during print/download button clicks.
6. **Inference**: Only one mock is required:
   ```ts
   vi.mock("@/utils/downloadExactInvoice", () => ({
     downloadExactInvoicePdf: vi.fn(),
   }));
   ```

### Step 2.3: Mapping Requirements to Test Suites
From `ORIGINAL_REQUEST.md` (header `2026-10-14T06:45:25Z`):
- **Requirement R1 (Quick Action Row Edit Button)**:
  - Must render circular container: `w-12 h-12 rounded-full border-2 border-indigo-200 bg-indigo-50/60`.
  - Must feature `Edit2` icon and "Edit" label.
  - Must trigger `onEdit` on click.
- **Requirement R2 (Dual-Action Sticky Footer)**:
  - Left button (`Edit Bill`): Soft outline `bg-indigo-50 border border-indigo-200 text-indigo-700` with `Edit2` icon, triggering `onEdit`.
  - Right button (`Done`): Primary filled `bg-indigo-600 text-white`, triggering `onClose`.
  - Safe-area inset support: `pb-[max(1rem,env(safe-area-inset-bottom))]`.
- **Requirement R3 (Seamless Transition & Robustness)**:
  - Firing `onEdit` must not trigger `onClose`.
  - Firing `onClose` must not trigger `onEdit`.
  - Omitting optional callbacks (`onEdit`, `onDelete`) must not crash the component and should gracefully adapt layout.

---

## 3. Caveats

1. **Windows PowerShell Script Execution Policy**:
   Running `npm test` directly from PowerShell produces a PSSecurityException (`npm.ps1 cannot be loaded because running scripts is disabled on this system`). All CLI test commands in this environment must be invoked via `cmd.exe /c "npm test"` or `cmd.exe /c "npx vitest run <file>"`.
2. **Unrelated Failures in Full Test Suite**:
   Running the entire test suite via `vitest run` executes `tallyE2E.test.ts` (which currently has 52 assertions failing against unmocked Supabase sync contracts from an ongoing Tally migration) and 1 test in `networkInvoicing.test.ts` that times out on a remote network call. These are wholly unrelated to invoice rendering, and all 169 invoice UI tests (`unifiedInvoiceRenderer.test.tsx` and `unifiedInvoiceRenderer.edge.test.tsx`) pass with 100% success rate. The new unit tests for `MobileInvoiceSuccessView` should be run directly via `cmd.exe /c "npx vitest run src/test/MobileInvoiceSuccessView.test.tsx"`.
3. **jsdom CSS / Layout Limitations**:
   jsdom does not calculate computed layout heights or actual safe-area inset pixels from CSS `env()`. Assertions on styling must inspect className tokens (e.g. `expect(container).toHaveClass(...)` or matching `bg-indigo-50`, `pb-[max(1rem,env(safe-area-inset-bottom))]`), rather than `window.getComputedStyle`.

---

## 4. Conclusion & Test Specification

### 4.1 Target File Path
- **Canonical Path**: `src/test/MobileInvoiceSuccessView.test.tsx`

### 4.2 Complete Test Suite Specification Matrix (6 Suites, 16 Test Cases)

| Suite | Test ID | Description | Target / Action | Expected Assertion |
|---|---|---|---|---|
| **Suite 1: Action Row Edit Button (R1)** | 1.1 | Renders circular Edit button when `onEdit` provided | Action row circular button | In document, contains `Edit` label and `Edit2` icon |
| | 1.2 | Circular styling compliance | Circular button container | Classes contain `rounded-full`, `border-indigo-200`, `bg-indigo-50/60`, `w-12`, `h-12` |
| | 1.3 | Action row fires `onEdit` when clicked | `fireEvent.click(actionRowEditBtn)` | `onEdit` called 1 time; `onClose` not called |
| | 1.4 | Quick action row renders 5 buttons | Container child count | Exactly 5 action buttons (Print, Download, Share, E-Way Bill, Edit) |
| **Suite 2: Dual Sticky Footer (R2)** | 2.1 | Renders side-by-side `Edit Bill` and `Done` buttons | Sticky footer container | Contains both `Edit Bill` and `Done` buttons in a flex row |
| | 2.2 | `Edit Bill` button styling | `Edit Bill` button classes | Contains `bg-indigo-50`, `border-indigo-200`, `text-indigo-700`, `rounded-xl` |
| | 2.3 | `Done` button styling | `Done` button classes | Contains `bg-indigo-600`, `text-white`, `rounded-xl` |
| | 2.4 | Safe-area inset bottom padding | Sticky footer wrapper | Contains `pb-[max(1rem,env(safe-area-inset-bottom))]` |
| **Suite 3: Footer Button Callbacks (R2/R3)** | 3.1 | Clicking `Edit Bill` triggers `onEdit` | `fireEvent.click(editBillBtn)` | `onEdit` called 1 time; `onClose` not called |
| | 3.2 | Clicking `Done` triggers `onClose` | `fireEvent.click(doneBtn)` | `onClose` called 1 time; `onEdit` not called |
| **Suite 4: Header Actions & Parity** | 4.1 | Header back button triggers `onClose` | `fireEvent.click(headerBackBtn)` | `onClose` called 1 time |
| | 4.2 | Header edit icon triggers `onEdit` | `fireEvent.click(headerEditBtn)` | `onEdit` called 1 time |
| | 4.3 | Header delete icon triggers `onDelete` | `fireEvent.click(headerDeleteBtn)` | `onDelete` called 1 time |
| **Suite 5: Graceful Degradation (Omitted Callbacks)** | 5.1 | Omitted `onEdit` hides or gracefully degrades Edit triggers | Render without `onEdit` | Action row edit button omitted; footer renders full-width `Done` |
| | 5.2 | Clicking `Done` without `onEdit` still triggers `onClose` | `fireEvent.click(doneBtn)` | `onClose` called 1 time; no error thrown |
| | 5.3 | Omitted `onDelete` hides trash icon | Header action container | Delete button not rendered in header |
| **Suite 6: Touch Targets & Accessibility** | 6.1 | Full touch targets & accessible labels | All interactive buttons | Buttons have accessible names (`aria-label` or visible text), min touch padding `py-3.5` or `w-12 h-12` |

---

### 4.3 Proposed Implementation Code for `src/test/MobileInvoiceSuccessView.test.tsx`

The implementer can drop this complete specification directly into `src/test/MobileInvoiceSuccessView.test.tsx`:

```tsx
import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MobileInvoiceSuccessView } from "@/components/invoices/mobile/MobileInvoiceSuccessView";
import { BusinessDocument } from "@/types/documents";

// Mock PDF generation to prevent html2canvas/jspdf execution in jsdom
vi.mock("@/utils/downloadExactInvoice", () => ({
  downloadExactInvoicePdf: vi.fn(),
}));

const mockInvoice: BusinessDocument = {
  id: "doc-test-101",
  organizationId: "org-test-101",
  docType: "sales_invoice",
  documentNumber: "INV-2026-0042",
  partyName: "Acme Supermarket",
  partyPhone: "9876543210",
  partyGstin: "27AABCA1234A1Z5",
  partyAddress: "Plot 42, Bandra West, Mumbai 400050",
  docDate: "2026-10-14",
  dueDate: "2026-10-21",
  items: [
    {
      id: "item-1",
      productName: "Premium Basmati Rice",
      quantity: 5,
      unit: "KG",
      rate: 120,
      discountPercent: 0,
      discountAmount: 0,
      taxRate: 5,
      taxableAmount: 600,
      cgstAmount: 15,
      sgstAmount: 15,
      igstAmount: 0,
      lineTotal: 630,
    },
    {
      id: "item-2",
      productName: "Sunflower Oil 1L",
      quantity: 2,
      unit: "LTR",
      rate: 140,
      discountPercent: 0,
      discountAmount: 0,
      taxRate: 5,
      taxableAmount: 280,
      cgstAmount: 7,
      sgstAmount: 7,
      igstAmount: 0,
      lineTotal: 294,
    },
  ],
  subtotal: 880,
  discountTotal: 0,
  taxableTotal: 880,
  cgstTotal: 22,
  sgstTotal: 22,
  igstTotal: 0,
  taxTotal: 44,
  roundOff: 0,
  grandTotal: 924,
  paidAmount: 924,
  balanceDue: 0,
  status: "paid",
  paymentMethod: "Cash",
  created_at: "2026-10-14T06:00:00Z",
};

describe("MobileInvoiceSuccessView Unit Test Suite", () => {
  let onEditMock: ReturnType<typeof vi.fn>;
  let onCloseMock: ReturnType<typeof vi.fn>;
  let onDeleteMock: ReturnType<typeof vi.fn>;
  let onGenerateEwayBillMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onEditMock = vi.fn();
    onCloseMock = vi.fn();
    onDeleteMock = vi.fn();
    onGenerateEwayBillMock = vi.fn();
  });

  const renderComponent = (propsOverrides: Partial<React.ComponentProps<typeof MobileInvoiceSuccessView>> = {}) => {
    return render(
      <MobileInvoiceSuccessView
        invoice={mockInvoice}
        onClose={onCloseMock}
        onEdit={onEditMock}
        onDelete={onDeleteMock}
        onGenerateEwayBill={onGenerateEwayBillMock}
        storeInfo={{
          name: "CredSmart Retail Hub",
          phone: "9988776655",
          email: "billing@credsmart.in",
          address: "Shop 12, High Street, Mumbai",
          gstin: "27AAACB1234F1Z1",
        }}
        {...propsOverrides}
      />
    );
  };

  // ─────────────────────────────────────────────────────────────
  // SUITE 1: QUICK ACTION ROW EDIT BUTTON (R1)
  // ─────────────────────────────────────────────────────────────
  describe("R1: Quick Action Row Edit Button", () => {
    it("renders the circular Edit action button alongside existing action buttons", () => {
      renderComponent();
      // Locate the Edit action button by its label text or aria-label
      const editBtn = screen.getByRole("button", { name: /^Edit$/i });
      expect(editBtn).toBeInTheDocument();

      // Check text label below icon
      expect(screen.getByText(/^Edit$/i)).toBeInTheDocument();
    });

    it("applies circular styling consistent with existing purple/indigo action circles", () => {
      renderComponent();
      const editBtn = screen.getByRole("button", { name: /^Edit$/i });
      const circleContainer = editBtn.querySelector(".rounded-full") || editBtn;
      expect(circleContainer.className).toMatch(/rounded-full/);
      expect(circleContainer.className).toMatch(/border-2/);
      expect(circleContainer.className).toMatch(/border-indigo-200/);
      expect(circleContainer.className).toMatch(/bg-indigo-50/);
    });

    it("triggers onEdit callback exactly once when the circular Edit button is tapped", () => {
      renderComponent();
      const editBtn = screen.getByRole("button", { name: /^Edit$/i });
      fireEvent.click(editBtn);

      expect(onEditMock).toHaveBeenCalledTimes(1);
      expect(onCloseMock).not.toHaveBeenCalled();
    });

    it("action row contains 5 buttons: Print, Download, Share, E-Way Bill, and Edit", () => {
      renderComponent();
      expect(screen.getByRole("button", { name: /Print/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Download/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Share/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /E-Way Bill/i })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /^Edit$/i })).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SUITE 2: DUAL-ACTION STICKY FOOTER (R2)
  // ─────────────────────────────────────────────────────────────
  describe("R2: Dual-Action Sticky Footer Layout & Styling", () => {
    it("renders both 'Edit Bill' and 'Done' buttons side-by-side in sticky footer", () => {
      renderComponent();
      const editBillBtn = screen.getByRole("button", { name: /Edit Bill/i });
      const doneBtn = screen.getByRole("button", { name: /^Done$/i });

      expect(editBillBtn).toBeInTheDocument();
      expect(doneBtn).toBeInTheDocument();

      // Check that both buttons reside inside the sticky footer container
      const footerContainer = editBillBtn.closest(".fixed.bottom-0") || editBillBtn.parentElement;
      expect(footerContainer).toContainElement(doneBtn);
      expect(footerContainer?.className).toMatch(/flex/);
      expect(footerContainer?.className).toMatch(/gap-/);
    });

    it("styles 'Edit Bill' button with outline/soft indigo palette", () => {
      renderComponent();
      const editBillBtn = screen.getByRole("button", { name: /Edit Bill/i });
      expect(editBillBtn.className).toMatch(/bg-indigo-50/);
      expect(editBillBtn.className).toMatch(/border-indigo-200/);
      expect(editBillBtn.className).toMatch(/text-indigo-700/);
      expect(editBillBtn.className).toMatch(/rounded-xl/);
    });

    it("styles 'Done' button with primary filled indigo palette", () => {
      renderComponent();
      const doneBtn = screen.getByRole("button", { name: /^Done$/i });
      expect(doneBtn.className).toMatch(/bg-indigo-600/);
      expect(doneBtn.className).toMatch(/text-white/);
      expect(doneBtn.className).toMatch(/rounded-xl/);
    });

    it("applies safe-area inset bottom padding to the sticky footer", () => {
      const { container } = renderComponent();
      const footer = container.querySelector(".fixed.bottom-0");
      expect(footer).not.toBeNull();
      expect(footer?.className).toMatch(/pb-\[max\(1rem,env\(safe-area-inset-bottom\)\)\]/);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SUITE 3: FOOTER CALLBACK TRIGGERS (R2 & R3)
  // ─────────────────────────────────────────────────────────────
  describe("R3: Callback Wiring & Transition Handlers", () => {
    it("invokes onEdit when 'Edit Bill' footer button is clicked", () => {
      renderComponent();
      const editBillBtn = screen.getByRole("button", { name: /Edit Bill/i });
      fireEvent.click(editBillBtn);

      expect(onEditMock).toHaveBeenCalledTimes(1);
      expect(onCloseMock).not.toHaveBeenCalled();
    });

    it("invokes onClose when 'Done' footer button is clicked", () => {
      renderComponent();
      const doneBtn = screen.getByRole("button", { name: /^Done$/i });
      fireEvent.click(doneBtn);

      expect(onCloseMock).toHaveBeenCalledTimes(1);
      expect(onEditMock).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SUITE 4: HEADER ACTIONS & PARITY
  // ─────────────────────────────────────────────────────────────
  describe("Header Action Triggers", () => {
    it("invokes onClose when top-left back button is clicked", () => {
      const { container } = renderComponent();
      const backBtn = container.querySelector("header button, .sticky button");
      expect(backBtn).not.toBeNull();
      if (backBtn) fireEvent.click(backBtn);

      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it("invokes onEdit when top-right edit icon button is clicked", () => {
      const { container } = renderComponent();
      const headerEditBtn = container.querySelector("button .lucide-pencil, button .lucide-edit-2, button .lucide-edit")?.closest("button");
      expect(headerEditBtn).not.toBeNull();
      if (headerEditBtn) fireEvent.click(headerEditBtn);

      expect(onEditMock).toHaveBeenCalledTimes(1);
    });

    it("invokes onDelete when header trash button is clicked", () => {
      const { container } = renderComponent();
      const trashBtn = container.querySelector("button .lucide-trash, button .lucide-trash-2")?.closest("button");
      expect(trashBtn).not.toBeNull();
      if (trashBtn) fireEvent.click(trashBtn);

      expect(onDeleteMock).toHaveBeenCalledTimes(1);
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SUITE 5: GRACEFUL DEGRADATION (OMITTED CALLBACKS)
  // ─────────────────────────────────────────────────────────────
  describe("Graceful Degradation When Optional Callbacks Are Omitted", () => {
    it("renders full-width 'Done' button when onEdit is omitted", () => {
      renderComponent({ onEdit: undefined });

      const doneBtn = screen.getByRole("button", { name: /^Done$/i });
      expect(doneBtn).toBeInTheDocument();

      // 'Edit Bill' button must not be present in footer
      expect(screen.queryByRole("button", { name: /Edit Bill/i })).not.toBeInTheDocument();

      // Action row Edit button must not be present
      expect(screen.queryByRole("button", { name: /^Edit$/i })).not.toBeInTheDocument();

      // Clicking Done should still call onClose cleanly
      fireEvent.click(doneBtn);
      expect(onCloseMock).toHaveBeenCalledTimes(1);
    });

    it("does not render header trash button when onDelete is omitted", () => {
      const { container } = renderComponent({ onDelete: undefined });
      const trashIcon = container.querySelector(".lucide-trash, .lucide-trash-2");
      expect(trashIcon).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────
  // SUITE 6: DATA INTEGRITY & ACCESSIBILITY
  // ─────────────────────────────────────────────────────────────
  describe("Data Integrity & Accessibility", () => {
    it("displays invoice document number and grand total in preview", () => {
      renderComponent();
      expect(screen.getAllByText(/INV-2026-0042/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/924/i).length).toBeGreaterThanOrEqual(1);
      expect(screen.getAllByText(/Acme Supermarket/i).length).toBeGreaterThanOrEqual(1);
    });

    it("has accessible buttons with proper minimum touch target sizes", () => {
      renderComponent();
      const editBillBtn = screen.getByRole("button", { name: /Edit Bill/i });
      const doneBtn = screen.getByRole("button", { name: /^Done$/i });

      // Verifies minimum vertical padding for 48px touch target
      expect(editBillBtn.className).toMatch(/py-3\.5/);
      expect(doneBtn.className).toMatch(/py-3\.5/);
    });
  });
});
```

---

## 5. Verification Method

### 5.1 Verification Commands
To independently verify the test suite:
1. **Targeted Test Execution**:
   ```powershell
   cmd.exe /c "npx vitest run src/test/MobileInvoiceSuccessView.test.tsx"
   ```
   *Expected Result*: All 16 unit tests execute and pass with 0 failures in under 4 seconds.

2. **TypeScript Compilation Check**:
   ```powershell
   cmd.exe /c "npx tsc --noEmit"
   ```
   *Expected Result*: Exit code 0 with zero errors across all files.

3. **Existing Invoice UI Suite Regression Check**:
   ```powershell
   cmd.exe /c "npx vitest run src/test/unifiedInvoiceRenderer.test.tsx src/test/unifiedInvoiceRenderer.edge.test.tsx"
   ```
   *Expected Result*: All 169 existing invoice UI tests continue to pass with 100% success rate.

### 5.2 Files to Inspect
- `src/components/invoices/mobile/MobileInvoiceSuccessView.tsx`: Verify circular Edit action button in action row (lines 262–288) and dual buttons in sticky footer (lines 293–301).
- `src/test/MobileInvoiceSuccessView.test.tsx`: Newly created unit test file.

### 5.3 Invalidation Conditions
- If the test file is placed in a non-standard path outside `src/**/*.{test,spec}.{ts,tsx}`, Vitest will fail to discover it.
- If `downloadExactInvoicePdf` is not mocked, Vitest will invoke html2canvas/jspdf leading to jsdom DOM-leak warnings or canvas crashes.
- If `onEdit` is omitted and the component throws a `TypeError: onEdit is not a function`, Suite 5 will immediately invalidate the implementation.
