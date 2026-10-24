# E2E Test Infra: CredSmart Decoupling (POS & Billing vs CRM)

## Test Philosophy
- Opaque-box, requirement-driven. No dependency on implementation design.
- Methodology: Category-Partition + Boundary Value Analysis (BVA) + Pairwise Combinatorial Testing + Real-World Workload Testing.

## Feature Inventory
| # | Feature | Source (requirement) | Tier 1 | Tier 2 | Tier 3 |
|---|---------|---------------------|:------:|:------:|:------:|
| 1 | Route Isolation `/billing/*` | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 2 | Route Isolation `/crm/*` | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 3 | Legacy Redirections (35 paths) | ORIGINAL_REQUEST §R1 | 5 | 5 | ✓ |
| 4 | Dedicated POS & Billing Sidebar | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 5 | Dedicated CRM Sidebar | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 6 | Interactive Suite Switcher | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 7 | Suite Persistence (`credsmart_active_suite`) | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 8 | Adaptive Mobile Bottom Navigation Dock | ORIGINAL_REQUEST §R2 | 5 | 5 | ✓ |
| 9 | Dual Portal Onboarding Preference | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 10 | Post-Login & Root Entry Routing (`/`, `/app`) | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |
| 11 | Direct Deep-Link Preservation | ORIGINAL_REQUEST §R3 | 5 | 5 | ✓ |

## Test Architecture
- **Test Runner**: Vitest (`npx vitest run src/test/e2e/decouple*.test.ts*`)
- **Pass/Fail Semantics**: 100% test pass, exit code 0.
- **Directory Layout**: `src/test/e2e/`
  - `decoupleRoutes.test.ts`: Route tree isolation & redirection matrix.
  - `decoupleShells.test.tsx`: Navigation sidebars, Suite Switcher & mobile docks.
  - `decoupleOnboarding.test.tsx`: Onboarding preference & entry routing.
  - `decoupleIntegration.test.tsx`: Cross-portal workflows & deep links.

## Real-World Application Scenarios (Tier 4)
| # | Scenario | Features Exercised | Complexity |
|---|----------|--------------------|------------|
| 1 | Retail Cashier Flow: Login, auto-routed to `/billing/checkout`, restricted from CRM | F1, F10, F11 | High |
| 2 | HR Manager Flow: Login with CRM preference, auto-routed to `/crm`, full CRM navigation, 0 billing clutter | F2, F5, F10 | High |
| 3 | Business Owner Dual Flow: Login, view `/billing`, toggle Suite Switcher to `/crm`, verify sidebar & mobile dock swap, refresh to verify persistence | F1, F2, F4, F5, F6, F7, F8 | High |
| 4 | External Link Ingress: User follows legacy link `/sales?tab=quotation`, seamlessly redirected to `/billing/sales?tab=quotation` without losing state | F1, F3, F11 | Medium |
| 5 | New Org Onboarding Flow: Sign up with "Both" suite preference, default entry to last-active suite, verify seamless switching | F6, F7, F9, F10 | High |

## Coverage Thresholds
- **Tier 1 (Feature Coverage)**: ≥55 test cases (≥5 per feature across 11 features)
- **Tier 2 (Boundary & Corner Cases)**: ≥55 test cases (parameter variations, query strings, malformed suites, unknown routes)
- **Tier 3 (Cross-Feature Combinations)**: ≥15 test cases (pairwise suite switching + navigation + auth states)
- **Tier 4 (Real-World Application Scenarios)**: ≥5 realistic end-to-end user journeys
- **Total Minimum**: ≥130 comprehensive test cases
