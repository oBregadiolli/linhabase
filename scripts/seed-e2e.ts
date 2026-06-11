/**
 * E2E Test Data Seed Script
 *
 * Creates and verifies all test data needed for E2E tests:
 * - 2 test users (admin + member) via Supabase Auth signUp
 * - 1 test company
 * - Memberships (admin + member)
 * - 3 test projects
 * - 2 test clients
 * - 1 department with 1 team
 * - Member assigned to team
 * - Member rates (active + historical)
 * - Member timesheets (draft, submitted, approved, rejected)
 *
 * Idempotent: safe to run multiple times.
 *
 * Usage:
 *   npm run seed:e2e
 */

import { createClient } from '@supabase/supabase-js'

// -- Config -------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'e2e-admin@linhabase.test'
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'E2e@Admin2026!'
const MEMBER_EMAIL = process.env.E2E_MEMBER_EMAIL || 'e2e-member@linhabase.test'
const MEMBER_PASSWORD = process.env.E2E_MEMBER_PASSWORD || 'E2e@Member2026!'

const E2E_COMPANY_ID = 'e2e00000-0000-0000-0000-000000000001'

// -- Helpers ------------------------------------------------------------------

function log(icon: string, msg: string) {
  console.log(`  ${icon}  ${msg}`)
}

function header(title: string) {
  console.log(`\n${'─'.repeat(50)}`)
  console.log(`  ${title}`)
  console.log('─'.repeat(50))
}

function offsetDate(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

async function ensureRow(
  supabase: ReturnType<typeof createClient>,
  table: string,
  id: string,
  label: string,
  insert: Record<string, unknown>,
): Promise<void> {
  const { data: existing } = await supabase.from(table).select('id').eq('id', id).maybeSingle()
  if (existing) {
    log('OK', `${label} exists`)
    return
  }
  const { error } = await supabase.from(table).insert({ id, ...insert })
  if (error) {
    log('WARN', `${label}: ${error.message}`)
  } else {
    log('OK', `${label} created`)
  }
}

// -- User Creation / Login ----------------------------------------------------

async function ensureUser(
  supabase: ReturnType<typeof createClient>,
  email: string,
  password: string,
  name: string,
): Promise<{ id: string; isNew: boolean } | null> {
  // Try to sign in first (with retry on network error)
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInData?.user) {
        log('OK', `${name} already exists — ${email} (${signInData.user.id})`)
        await supabase.auth.signOut()
        return { id: signInData.user.id, isNew: false }
      }
      break // no error, user just doesn't exist
    } catch {
      if (attempt < 2) {
        log('..', `${name} sign-in attempt ${attempt + 1} failed, retrying...`)
        await new Promise(r => setTimeout(r, 2000))
        continue
      }
      log('WARN', `${name} sign-in failed after 3 attempts, trying signUp`)
    }
  }

  // User doesn't exist, create via signUp
  log('..', `Creating ${name}: ${email}`)
  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { name },
    },
  })

  if (signUpError) {
    // 'User already registered' means user exists but signIn failed (network issue)
    // Try signIn one more time
    if (signUpError.message.includes('already registered')) {
      log('..', `${name} already registered, retrying sign-in...`)
      await new Promise(r => setTimeout(r, 2000))
      const { data } = await supabase.auth.signInWithPassword({ email, password })
      if (data?.user) {
        log('OK', `${name} exists — ${email} (${data.user.id})`)
        await supabase.auth.signOut()
        return { id: data.user.id, isNew: false }
      }
    }
    log('ERR', `Failed to create ${name}: ${signUpError.message}`)
    return null
  }

  if (!signUpData.user) {
    log('ERR', `No user returned for ${name}`)
    return null
  }

  log('OK', `${name} created — ${email} (${signUpData.user.id})`)
  await supabase.auth.signOut()
  return { id: signUpData.user.id, isNew: true }
}

// -- Main ---------------------------------------------------------------------

async function main() {
  console.log('\nLinhaBase E2E Seed\n')

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  let hasErrors = false

  // -- 1. Create/verify admin user --------------------------------------------
  header('1. Admin User')
  const admin = await ensureUser(supabase, ADMIN_EMAIL, ADMIN_PASSWORD, 'E2E Admin')
  if (!admin) hasErrors = true

  // -- 2. Create/verify member user -------------------------------------------
  header('2. Member User')
  const member = await ensureUser(supabase, MEMBER_EMAIL, MEMBER_PASSWORD, 'E2E Member')
  if (!member) hasErrors = true

  if (hasErrors || !admin || !member) {
    log('ERR', 'Cannot continue without both users')
    process.exit(1)
  }

  // -- 3. Setup company & memberships (requires login) ------------------------
  header('3. Company & Memberships')

  const { data: adminSession } = await supabase.auth.signInWithPassword({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  })

  if (!adminSession?.user) {
    log('ERR', 'Cannot login as admin for setup')
    process.exit(1)
  }

  // Check if company exists
  const { data: existingCompany } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', E2E_COMPANY_ID)
    .maybeSingle()

  if (existingCompany) {
    log('OK', `Company exists: ${existingCompany.name}`)
  } else {
    const { error: companyError } = await supabase
      .from('companies')
      .insert({
        id: E2E_COMPANY_ID,
        name: 'E2E Test Company',
        owner_id: admin.id,
      })

    if (companyError) {
      log('ERR', `Failed to create company: ${companyError.message}`)
      hasErrors = true
    } else {
      log('OK', 'Company created: E2E Test Company')
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
    log('OK', 'Admin membership exists')
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
      log('ERR', `Failed to create admin membership: ${error.message}`)
      hasErrors = true
    } else {
      log('OK', 'Admin membership created')
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
    log('OK', 'Member membership exists')
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
      log('ERR', `Failed to create member membership: ${error.message}`)
      hasErrors = true
    } else {
      log('OK', 'Member membership created')
    }
  }

  // -- 4. Create projects -----------------------------------------------------
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
      log('OK', `Project exists: ${p.name}`)
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
        log('WARN', `Project ${p.name}: ${error.message}`)
      } else {
        log('OK', `Project created: ${p.name}`)
      }
    }
  }

  // -- 5. Create clients ------------------------------------------------------
  header('5. Clients')

  const clients = [
    { id: 'e2e00000-0000-0000-0000-000000000201', description: 'E2E Cliente Principal', active: true },
    { id: 'e2e00000-0000-0000-0000-000000000202', description: 'E2E Cliente Secundario', active: true },
  ]

  for (const c of clients) {
    const { data: existing } = await supabase
      .from('clients')
      .select('id')
      .eq('id', c.id)
      .maybeSingle()

    if (existing) {
      log('OK', `Client exists: ${c.description}`)
    } else {
      const { error } = await supabase
        .from('clients')
        .insert({
          id: c.id,
          company_id: E2E_COMPANY_ID,
          description: c.description,
          active: c.active,
        })

      if (error) {
        log('WARN', `Client ${c.description}: ${error.message}`)
      } else {
        log('OK', `Client created: ${c.description}`)
      }
    }
  }

  // -- 6. Create department & team --------------------------------------------
  header('6. Department & Team')

  const deptId = 'e2e00000-0000-0000-0000-000000000301'
  const teamId = 'e2e00000-0000-0000-0000-000000000401'

  const { data: existingDept } = await supabase
    .from('departments')
    .select('id')
    .eq('id', deptId)
    .maybeSingle()

  if (existingDept) {
    log('OK', 'Department exists: E2E Engenharia')
  } else {
    const { error } = await supabase
      .from('departments')
      .insert({
        id: deptId,
        company_id: E2E_COMPANY_ID,
        name: 'E2E Engenharia',
        active: true,
      })

    if (error) {
      log('WARN', `Department: ${error.message}`)
    } else {
      log('OK', 'Department created: E2E Engenharia')
    }
  }

  const { data: existingTeam } = await supabase
    .from('teams')
    .select('id')
    .eq('id', teamId)
    .maybeSingle()

  if (existingTeam) {
    log('OK', 'Team exists: E2E Backend')
  } else {
    const { error } = await supabase
      .from('teams')
      .insert({
        id: teamId,
        company_id: E2E_COMPANY_ID,
        department_id: deptId,
        name: 'E2E Backend',
        active: true,
      })

    if (error) {
      log('WARN', `Team: ${error.message}`)
    } else {
      log('OK', 'Team created: E2E Backend')
    }
  }

  // Assign member to team
  const { error: teamAssignError } = await supabase
    .from('company_members')
    .update({ team_id: teamId })
    .eq('company_id', E2E_COMPANY_ID)
    .eq('user_id', member.id)

  if (teamAssignError) {
    log('WARN', `Member team assignment: ${teamAssignError.message}`)
  } else {
    log('OK', 'Member assigned to E2E Backend team')
  }

  // -- 7. Member rates --------------------------------------------------------
  header('7. Member Rates')

  await ensureRow(supabase, 'member_rates', 'e2e00000-0000-0000-0000-000000000501', 'Active member rate', {
    company_id: E2E_COMPANY_ID,
    user_id: member.id,
    start_date: '2025-01-01',
    end_date: null,
    sale_rate: 200,
    cost_rate: 100,
  })

  await ensureRow(supabase, 'member_rates', 'e2e00000-0000-0000-0000-000000000502', 'Historical member rate', {
    company_id: E2E_COMPANY_ID,
    user_id: member.id,
    start_date: '2024-01-01',
    end_date: '2024-12-31',
    sale_rate: 150,
    cost_rate: 80,
  })

  await supabase.auth.signOut()

  // -- 8. Member timesheets (requires member login) ---------------------------
  header('8. Member Timesheets')

  const { data: memberSession } = await supabase.auth.signInWithPassword({
    email: MEMBER_EMAIL,
    password: MEMBER_PASSWORD,
  })

  if (!memberSession?.user) {
    log('WARN', 'Cannot login as member — skipping timesheet seed')
  } else {
    const projectAlpha = 'e2e00000-0000-0000-0000-000000000101'
    const projectBeta = 'e2e00000-0000-0000-0000-000000000102'
    const today = offsetDate(0)
    const yesterday = offsetDate(-1)
    const twoDaysAgo = offsetDate(-2)
    const threeDaysAgo = offsetDate(-3)

    const timesheets = [
      {
        id: 'e2e00000-0000-0000-0000-000000000601',
        label: 'Draft AM (today)',
        date: today,
        start_time: '09:00:00',
        end_time: '11:00:00',
        duration_minutes: 120,
        project_id: projectAlpha,
        status: 'draft',
        description: 'E2E seed — draft manhã',
      },
      {
        id: 'e2e00000-0000-0000-0000-000000000602',
        label: 'Draft PM (today)',
        date: today,
        start_time: '14:00:00',
        end_time: '16:00:00',
        duration_minutes: 120,
        project_id: projectAlpha,
        status: 'draft',
        description: 'E2E seed — draft tarde',
      },
      {
        id: 'e2e00000-0000-0000-0000-000000000603',
        label: 'Submitted (yesterday)',
        date: yesterday,
        start_time: '10:00:00',
        end_time: '12:00:00',
        duration_minutes: 120,
        project_id: projectBeta,
        status: 'submitted',
        description: 'E2E seed — submitted',
      },
      {
        id: 'e2e00000-0000-0000-0000-000000000604',
        label: 'Approved (-2 days)',
        date: twoDaysAgo,
        start_time: '08:00:00',
        end_time: '10:00:00',
        duration_minutes: 120,
        project_id: projectAlpha,
        status: 'approved',
        description: 'E2E seed — approved',
      },
      {
        id: 'e2e00000-0000-0000-0000-000000000605',
        label: 'Rejected (-3 days)',
        date: threeDaysAgo,
        start_time: '13:00:00',
        end_time: '15:00:00',
        duration_minutes: 120,
        project_id: projectBeta,
        status: 'rejected',
        description: 'E2E seed — rejected',
        rejection_reason: 'E2E seed rejection',
      },
    ]

    for (const ts of timesheets) {
      await ensureRow(supabase, 'timesheets', ts.id, ts.label, {
        user_id: member.id,
        company_id: E2E_COMPANY_ID,
        date: ts.date,
        start_time: ts.start_time,
        end_time: ts.end_time,
        duration_minutes: ts.duration_minutes,
        project_id: ts.project_id,
        status: ts.status,
        description: ts.description,
        ...(ts.rejection_reason ? { rejection_reason: ts.rejection_reason } : {}),
      })
    }
  }

  await supabase.auth.signOut()

  // -- Summary ----------------------------------------------------------------
  header('Summary')
  if (hasErrors) {
    log('!!', 'Some steps had issues. Review above.')
    process.exit(1)
  } else {
    log('OK', 'All E2E seed data ready.')
    log('>>', 'Run tests: npm run test:e2e')
  }
}

main().catch(err => {
  console.error('Fatal error:', err)
  process.exit(1)
})
