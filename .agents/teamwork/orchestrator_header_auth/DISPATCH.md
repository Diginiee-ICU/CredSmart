# Dispatch Log

## 2026-10-31T19:02:38Z
Initial Request:
User reported top header CSS collision (Image 3) and issues on /auth where CRM login was using server credentials and triggering duplicate auth popup.

## 2026-10-31T19:14:54Z
CRITICAL USER CLARIFICATION AND OVERRIDE:
The user explicitly stated:
"Are you mad? do not remove the pop up auth instead provide an option on pos auth for crm and rest crm auth will handle"

MANDATE:
1. DO NOT REMOVE the CRM auth popup (`AuthOnboarding.tsx`) at `/crm`. The CRM auth popup must remain completely intact — CRM will handle its own authentication and onboarding.
2. On the POS Auth page (`src/pages/Auth.tsx`):
   - Do NOT try to authenticate CRM users with POS server credentials in the POS login form.
   - Instead, provide a clean, dedicated option/card/link on `/auth` to switch/go to Workforce CRM (redirects directly to `/crm`), where CRM's own auth flow handles everything.
3. Fix the top header CSS collision in `AppLayout.tsx` and `WorkspaceSwitcher.tsx` (business switcher and workspace switcher spacing/alignment).
