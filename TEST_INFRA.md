# E2E Test Infra: Frontend Supabase Table Query Migration

## Test Philosophy
- Opaque-box, requirement-driven.
- Automated static AST and regex scan verifying zero direct `supabase.from(...)` table query calls remain in application source code.
- Verification of standard `fetch()` API calls targeting `https://api.credsmart.online/api/*`.
- Bearer token propagation verification on protected API endpoints.
- TypeScript compiler clean build verification (`npm run build` / `tsc --noEmit`).

## Feature Inventory & Test Coverage Goals
| # | Feature | Requirement | Tier 1 | Tier 2 | Tier 3 |
|---|---------|-------------|:------:|:------:|:------:|
| 1 | Centralized API Client | R4 | 5 | 5 | ✓ |
| 2 | Auth Token Header Interceptor | R2 | 5 | 5 | ✓ |
| 3 | Products & Inventory API | R1, R3 | 5 | 5 | ✓ |
| 4 | Batch & Stock Operations | R1, R3 | 5 | 5 | ✓ |
| 5 | Customers & Suppliers API | R1, R3 | 5 | 5 | ✓ |
| 6 | Credit Transactions & Khata API | R1, R3 | 5 | 5 | ✓ |
| 7 | Sales Invoices & Line Items API | R1, R3 | 5 | 5 | ✓ |
| 8 | Purchase Invoices & Line Items API | R1, R3 | 5 | 5 | ✓ |
| 9 | Expenses & Returns API | R1, R3 | 5 | 5 | ✓ |
| 10 | Settings, Org & CRM Modules API | R1, R3 | 5 | 5 | ✓ |

## Test Architecture
- Test Runner: Vitest via `cmd /c npx vitest run src/test/e2eApiMigration.test.ts`
- Static Scanner: Node.js AST/Grep scanner verifying zero table queries remain in `src/`
- Build Validation: `cmd /c npm run build` (tsc and vite build)

## Acceptance Thresholds
- Zero `supabase.from(...)` table query calls across non-test application code.
- Clean compilation with exit code 0.
- All test suites passing with 100% success rate.
