/**
 * E2E Test Data Seed Script
 *
 * Creates and verifies all test data needed for E2E tests:
 * - 2 test users (admin + member) via Supabase Auth signUp
 * - 1 test company
 * - Memberships (admin + member)
 * - 3 test projects
 *
 * Idempotent: safe to run multiple times.
 *
 * Usage:
 *   npm run seed:e2e
 */

import { createClient } from '@supabase/supabase-js'

// ── Config ───────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'e2e-admin@linhabase.test'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'E2e@Admin2026!'
const MEMBER_EMAIL = process.env.E2E_MEMBER_EMAIL || 'e2e-member@linhabase.test'
const MEMBER_PASSWORD = process.env.E2E_MEMBER_PASSWORD || 'E2e@Member2026!'

const E2E_COMPANY_ID = 'e2e00000-0000-0000-0000-000000000001'

// ── Helpers ──────────────────────────────────────────────────

function log(icon: string, msg: string) {
  console.log(`  ${icon}  ${msg}`)
}

function header(title: string) {
  console.log(`\n${'─'.repeat(50)}`)
  console.log(`  ${title}`)
  console.log('─'.repeat(50))
}

// ── User Creation / Login ────────────────────────────────────

async function ensureUser(
  supabase: ReturnType<typeof createClient>,
  email: string,
  password: string,
  name: string,
): Promise<{ id: string; isNew: boolean } | null> {
  // Try to sign in first
  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (signInData?.user) {
    log('✅', `${name} already exists — ${email} (${signInData.user.id})`)
    await supabase.auth.signOut()
    return { id: signInData.user.id, isNew: false }
  }

  // User doesn't exist, create via signUp
  log('🔧', `Creating ${name}: ${email}`)
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  })

  if (signUpError) {
    log('❌', `Failed to create ${name}: ${signUpError.message}`)
    return null
  }

  if (!signUpData.user) {
    log('❌', `No user returned for ${name}`)
    return null
  }

  log('✅', `${name} created — ${email} (${signUpData.user.id})`)
  await supabase.auth.signOut()
  return { id: signUpData.user.id, isNew: true }
}

// ── Main ─────────────────────────────────────────────────────

async function main() {
  console.log('\n🌱 LinhaBase E2E Seed\n')

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  let hasErrors = false

  // ── 1. Create/verify admin user ──────────────────────────
  header('1. Admin User')
  const admin = await ensureUser(supabase, ADMIN_EMAIL, ADMIN_PASSWORD, 'E2E Admin')
  if (!admin) hasErrors = true

  // ── 2. Create/verify member user ─────────────────────────
  header('2. Member User')
  const member = await ensureUser(supabase, MEMBER_EMAIL, MEMBER_PASSWORD, 'E2E Member')
  if (!member) hasErrors = true

  if (hasErrors || !admin || !member) {
    log('❌', 'Cannot continue without both users')
    process.exit(1)
  }

  // ── 3. Setup company & memberships (requires login) ──────
  header('3. Company & Memberships')

  // Login as admin to set up company data
  const { data: adminSession } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  })

  if (!adminSession?.user) {
    log('❌', 'Cannot login as admin for setup')
    process.exit(1)
  }

  // Check if company exists
  const { data: existingCompany } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', E2E_COMPANY_ID)
    .maybeSingle()

  if (existingCompany) {
    log('✅', `Company exists: ${existingCompany.name}`)
  } else {
    const { error: companyError } = await supabase
      .from('companies')
      .insert({
        id: E2E_COMPANY_ID,
        name: 'E2E Test Company',
        owner_id: admin.id,
      })

    if (companyError) {
      log('❌', `Failed to create company: ${companyError.message}`)
      hasErrors = true
    } else {
      log('✅', 'Company created: E2E Test Company')
    }
  }

  // Check/create admin membership
  const { data: adminMember } = await supabase
    .from('company_members')
    .select('id')
    .eq('company_id', E2E_COMPANY_ID)
    .eq('email', ADMIN_EMAIL)
    .maybeSingle()

  if (adminMember) {
    log('✅', 'Admin membership exists')
  } else {
    const { error } = await supabase
      .from('company_members')
      .insert({
        company_id: E2E_COMPANY_ID,
        user_id: admin.id,
        email: ADMIN_EMAIL,
        role: 'admin',
        status: 'active',
        joined_at: new Date().toISOString(),
      })

    if (error) {
      log('❌', `Failed to create admin membership: ${error.message}`)
      hasErrors = true
    } else {
      log('✅', 'Admin membership created')
    }
  }

  // Check/create member membership
  const { data: memberMember } = await supabase
    .from('company_members')
    .select('id')
    .eq('company_id', E2E_COMPANY_ID)
    .eq('email', MEMBER_EMAIL)
    .maybeSingle()

  if (memberMember) {
    log('✅', 'Member membership exists')
  } else {
    const { error } = await supabase
      .from('company_members')
      .insert({
        company_id: E2E_COMPANY_ID,
        user_id: member.id,
        email: MEMBER_EMAIL,
        role: 'member',
        status: 'active',
        joined_at: new Date().toISOString(),
      })

    if (error) {
      log('❌', `Failed to create member membership: ${error.message}`)
      hasErrors = true
    } else {
      log('✅', 'Member membership created')
    }
  }

  // ── 4. Create projects ───────────────────────────────────
  header('4. Projects')

  const projects = [
    { id: 'e2e00000-0000-0000-0000-000000000101', name: 'E2E Projeto Alpha', color: '#3B82F6', active: true },
    { id: 'e2e00000-0000-0000-0000-000000000102', name: 'E2E Projeto Beta', color: '#10B981', active: true },
    { id: 'e2e00000-0000-0000-0000-000000000103', name: 'E2E Projeto Inativo', color: '#6B7280', active: false },
  ]

  for (const p of projects) {
    const { data: existing } = await supabase
      .from('projects')
      .select('id')
      .eq('id', p.id)
      .maybeSingle()

    if (existing) {
      log('✅', `Project exists: ${p.name}`)
    } else {
      const { error } = await supabase
        .from('projects')
        .insert({
          id: p.id,
          company_id: E2E_COMPANY_ID,
          name: p.name,
          color: p.color,
          active: p.active,
          created_by: admin.id,
        })

      if (error) {
        log('⚠️', `Project ${p.name}: ${error.message}`)
      } else {
        log('✅', `Project created: ${p.name}`)
      }
    }
  }

  await supabase.auth.signOut()

  // ── Summary ──────────────────────────────────────────────
  header('Summary')
  if (hasErrors) {
    log('⚠️', 'Some steps had issues. Review above.')
    process.exit(1)
  } else {
    log('🎉', 'All E2E seed data ready!')
    log('🚀', 'Run tests: npm run test:e2e')
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
