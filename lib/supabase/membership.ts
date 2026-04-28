/**
 * Server-side helpers for Phase 2 multi-company access control.
 *
 * These functions run ONLY in Server Components / Route Handlers / Server Actions.
 * They use the Supabase server client (cookie-based auth) and return
 * typed results based on the company_members table.
 *
 * Design decisions:
 * - Each function creates its own Supabase client to avoid stale references.
 * - All functions return null/false on failure rather than throwing,
 *   so callers can handle gracefully.
 * - No caching: each call hits the DB. In the future, consider
 *   per-request memoization if these are called multiple times
 *   in the same RSC render tree.
 */

import { createClient } from '@/lib/supabase/server'
import type { CompanyMember, Company } from '@/lib/types/database.types'

// ── Result types ──────────────────────────────────────────────

export interface Membership {
  member: CompanyMember
  company: Company
}

// ── getCurrentMembership ──────────────────────────────────────
/**
 * Returns the current user's active membership and associated company,
 * or null if the user is not authenticated or has no active membership.
 *
 * If the user belongs to multiple companies (future scenario), returns
 * the first active membership found. This is sufficient for Phase 2
 * where each user has at most one company.
 */
export async function getCurrentMembership(): Promise<Membership | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('active_company_id')
    .eq('id', user.id)
    .maybeSingle()

  const activeCompanyId = profile?.active_company_id ?? null

  const memberQuery = supabase
    .from('company_members')
    .select('*')
    .eq('user_id', user.id)
    .eq('status', 'active')

  const { data: member } = activeCompanyId
    ? await memberQuery.eq('company_id', activeCompanyId).maybeSingle()
    : await memberQuery.limit(1).maybeSingle()

  if (!member) return null

  const { data: company } = await supabase
    .from('companies')
    .select('*')
    .eq('id', member.company_id)
    .single()

  if (!company) return null

  return { member, company }
}

// ── getCurrentCompany ─────────────────────────────────────────
/**
 * Returns the company the current user belongs to, or null.
 * Convenience wrapper around getCurrentMembership().
 */
export async function getCurrentCompany(): Promise<Company | null> {
  const membership = await getCurrentMembership()
  return membership?.company ?? null
}

// ── isCurrentUserAdmin ────────────────────────────────────────
/**
 * Returns true if the current user is an active admin in their company.
 * Returns false if not authenticated, no membership, or role ≠ 'admin'.
 */
export async function isCurrentUserAdmin(): Promise<boolean> {
  const membership = await getCurrentMembership()
  if (!membership) return false
  return membership.member.role === 'admin'
}

// ── getCompanyMemberIds ───────────────────────────────────────
/**
 * Returns the user_ids of all active members in the given company.
 * Useful for building admin queries that filter timesheets by company scope.
 *
 * ⚠️ This does NOT bypass RLS — the Supabase client still respects
 * the company_members policies. The caller must be an owner or member
 * of the company to read these rows.
 */
export async function getCompanyMemberIds(companyId: string): Promise<string[]> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('company_members')
    .select('user_id')
    .eq('company_id', companyId)
    .eq('status', 'active')
    .not('user_id', 'is', null)

  if (!data) return []
  return data
    .map(row => row.user_id)
    .filter((id): id is string => id !== null)
}
