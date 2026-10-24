# Local Copy: crm-rbac-skill
Source: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\crm-rbac-skill\SKILL.md

Key Architecture & Rules:
- Cashiers must be strictly isolated from CRM operations and administrative settings.
- Route checks in isRouteAllowedForRole are authoritative for route gating and sidebar navigation.
- Prefix-based denials and set membership checks must prevent any bypass to CRM submodules.
- Super admin bypass and custom permission overrides must be preserved.
