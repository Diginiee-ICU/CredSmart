# Scope: Header CSS Collision & POS Auth CRM Navigation

## Overview
1. **Header CSS Collision Fix**:
   - `src/components/AppLayout.tsx`: Standardize Business Selector to `h-8.5` (34px), restore CredSmart brand wordmark with `hidden sm:inline`, add 1px hairline divider between Business Selector and Workspace Switcher, align surfaces.
   - `src/components/portal/WorkspaceSwitcher.tsx`: Standardize trigger button height to `h-8.5` (34px), aligning baseline across all top header controls.
2. **POS Auth Page CRM Navigation**:
   - `src/pages/Auth.tsx`: Do NOT attempt to authenticate CRM users using POS server credentials in the POS login form. Provide a dedicated option/card/link for Workforce CRM that routes directly to `/crm`.
   - Preserve `/crm` auth popup (`AuthOnboarding.tsx`) completely intact — CRM handles its own auth flow.

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | M1: Header CSS Collision Fix | `AppLayout.tsx`, `WorkspaceSwitcher.tsx` | none | DONE |
| 2 | M2: POS Auth Dedicated CRM Route | `src/pages/Auth.tsx` | none | DONE |
| 3 | M3: Build & Test Verification | Run test suites & build verification | M1, M2 | DONE |
| 4 | M4: Independent Review & Audit | Reviewers, Challengers, Forensic Auditor | M3 | DONE |
