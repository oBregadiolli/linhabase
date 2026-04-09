# supabase/migrations

This directory contains the versioned migration history for LinhaBase.

## Convention

Files follow the pattern: `{YYYYMMDDHHMMSS}_{description}.sql`

Migrations are applied in chronological order. Each file is idempotent where possible (uses `IF NOT EXISTS`, `OR REPLACE`, `ON CONFLICT DO NOTHING`).

## Registry

| File | Phase | Description | Status |
|------|-------|-------------|--------|
| `20260322231415_create_profiles_and_timesheets.sql` | MVP | Initial schema — profiles + timesheets + RLS | ✅ Applied |
| `20260323003114_add_performance_indexes.sql` | MVP | Performance indexes for timesheets | ✅ Applied |
| `20260323005442_auto_create_profile_on_signup.sql` | MVP | Trigger: auto-create profile on auth signup | ✅ Applied |
| `20260323005841_auto_calculate_duration_minutes.sql` | MVP | Triggers: auto duration + updated_at | ✅ Applied |
| `20260404203000_phase2_multi_company.sql` | Phase 2 R1 | Multi-company scaffold (companies, company_members, invitations, projects, timesheets.project_id) | ✅ Applied |
| `20260404205000_phase2_rls_hardening_and_bootstrap.sql` | Phase 2 R2 | RLS hardening (WITH CHECK, drop open token policy) + admin bootstrap | ✅ Applied |
| `20260404210000_timesheets_admin_read_policy.sql` | Phase 2 R3 | SELECT-only policy: company admin can read company member timesheets | ✅ Applied |
| `20260404211500_team_uniqueness_constraints.sql` | Phase 2 R5 | Unique indexes: company_members(company_id, email) + invitations pending partial unique | ✅ Applied |
| `20260404212300_invite_rpc_functions.sql` | Phase 2 R6 | SECURITY DEFINER RPCs: lookup_invitation_by_token + accept_invitation (atomic) | ✅ Applied |
| `20260404214500_invite_revocation.sql` | Phase 2 R7 | Invite revocation: revoked_at column, updated partial unique, updated RPCs for revoked state | ✅ Applied |
| `20260404222000_projects_admin_policy_and_unique_name.sql` | Phase 2 R9 | Projects: admin write via company_members, unique name per company (case-insensitive) | ✅ Applied |
| `20260404225500_backfill_timesheets_project_id.sql` | Phase 2 R12 | Backfill: populate timesheets.project_id from project text (conservative, idempotent) | ✅ Applied |
| `20260404230400_timesheets_admin_approval_policy.sql` | Phase 2 R13 | RLS: admin UPDATE policy on timesheets for approval workflow | ✅ Applied |
| `20260404232300_add_rejection_reason_to_timesheets.sql` | Phase 2 R15 | Schema: nullable rejection_reason column for admin rejection workflow | ✅ Applied |

## Notes

- MVP migrations (20260322–20260323) are historical backfills — they document what was applied
  via Supabase dashboard during initial development.
- Phase 2 migrations were applied via Supabase MCP and are the authoritative source of truth.
- To replay all migrations on a fresh database, run files in order using `supabase db push` or
  execute them manually via the Supabase SQL editor.

## Pending / Future

- `phase2_rX_invitation_token_read.sql` — Add safe public token read policy with expiry guard
- `phase2_rX_onboarding_company_creation.sql` — Trigger/function for user-driven company creation
