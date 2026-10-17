# CredSmart CRM RBAC Skill & Developer Manual (Phases 1–6)

This skill provides the authoritative engineering standard for building, extending, and securing CredSmart CRM modules. Any sub-agent or engineer working on CRM features (Attendance, Salary, Tasks, Meetings, Broadcasts, AI Assistant, Support) must adhere to these patterns.

## Architecture Overview
CredSmart CRM operates a decoupled, dynamic, user-configurable Role-Based Access Control (RBAC) engine that operates independently of store cashier/billing roles:
[ Authenticated User ] ───> [ useAuth() & useOrganization() ] ───> [ useCRMPermission(module, action) ]
- isSuperAdmin Bypass
- Granular Permission check
- Dual-Layer Resilience: Supabase + LocalStorage fallback
- Strict Typing: Zero any types
- Protected Routes: unauthenticated redirected to /auth
