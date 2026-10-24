---
name: crm-rbac-skill
description: Comprehensive architecture, database schema, permission hooks, gating components, migration conventions, and developer guidelines for CredSmart CRM Role-Based Access Control (RBAC) across Phases 2 through 6.
---

# CredSmart CRM RBAC Skill & Developer Manual (Phases 1–6)

This skill provides the authoritative engineering standard for building, extending, and securing CredSmart CRM modules. Any sub-agent or engineer working on CRM features (Attendance, Salary, Tasks, Meetings, Broadcasts, AI Assistant, Support) must adhere to these patterns.

## 1. Architecture Overview
CredSmart CRM operates a decoupled, dynamic, user-configurable Role-Based Access Control (RBAC) engine that operates independently of store cashier/billing roles.
Zero Hardcoded Roles.
Super Admin Bypass.
Dual-Layer Resilience.
Strict Typing.
See original skill at c:\Users\bishn\OneDrive\Documents\GitHub\CredSmart\.agents\skills\crm-rbac-skill\SKILL.md
