# DISPATCH INSTRUCTIONS — Orchestrator (Lovable CRM Integration & Migration Plan)

## Verbatim Task Prompt
Analyze the Lovable CRM at `C:\Users\bishn\OneDrive\Documents\GitHub\CRM` and the CredSmart codebase at `c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart`, and produce a production-grade integration and migration plan to replace CredSmart's existing CRM with the Lovable CRM within a unified Capacitor mobile application.

Working directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart
Integrity mode: development

## Requirements

### R1. Obsolete CRM File and Asset Identification
Analyze the current CredSmart codebase and identify all files, components, state management stores, hooks, route declarations, and assets belonging to the existing CRM implementation that must be safely removed without affecting POS and billing functionality.

### R2. Lovable CRM Architecture & Dependency Mapping
Analyze the external Lovable CRM repository (`C:\Users\bishn\OneDrive\Documents\GitHub\CRM`), cataloging all UI components, pages, routing definitions, third-party dependencies, assets, and Supabase client configurations required for integration into CredSmart.

### R3. Dual-Backend Isolation and Unified Capacitor Packaging
Design the architecture for a single unified application built for Google Play Store using CredSmart's existing Capacitor configuration:
- On cold launch, the application displays a selection hub giving the user the choice between 'POS & Billing' and 'CRM'.
- 'POS & Billing' connects exclusively to its Ubuntu backend.
- 'CRM' connects exclusively to its Supabase backend.
- Strict isolation with zero shared runtime data, state, or storage between POS & Billing and CRM.

### R4. Production-Grade Implementation Plan
Deliver a comprehensive, production-grade migration plan (`CRM_INTEGRATION_PLAN.md` or equivalent) detailing:
- The exact inventory of files to delete in CredSmart.
- The directory structure and file placement for integrating the Lovable CRM.
- Package dependency reconciliation (handling version conflicts, script updates).
- Routing structure and the implementation specifications for the launch selection hub.
- Step-by-step phased execution sequence with risk mitigation and rollback points.

## Acceptance Criteria

### Completeness of Codebase Analysis
- [ ] Every existing CRM-specific route, page, and component in CredSmart is explicitly cataloged for deletion or retention with rationale.
- [ ] Every external dependency, utility, and Supabase configuration in `C:\Users\bishn\OneDrive\Documents\GitHub\CRM` is mapped to its target location in CredSmart.
- [ ] Conflicting dependencies or script mismatches between both projects are documented with concrete resolution strategies.

### Architecture and Isolation Specification
- [ ] The launch selection screen specifications dictate display on every cold app launch.
- [ ] The architectural design documents complete backend and data separation ensuring no state, cache, or authentication tokens are shared between POS (Ubuntu backend) and CRM (Supabase backend).
- [ ] The unified Capacitor configuration and Google Play Store build workflow are preserved without breaking existing mobile packaging.

### Plan Actionability
- [ ] The plan contains an ordered, phased implementation checklist that an engineering team can execute without ambiguous decisions.
- [ ] Verification and smoke test procedures are documented for each phase (POS regression testing, CRM functionality, launch hub switching, and Capacitor build).

## Metadata
- Original Request path: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\ORIGINAL_REQUEST.md
- Working Directory: c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\teamwork\orchestrator_crm_integration
