/**
 * Creates one test user per company role level (owner / admin / member).
 *
 * Usage: npx tsx --env-file=.env scripts/seed-test-roles.ts
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

const PASSWORD = 'teste123'

const USERS = {
  owner: { email: 'test-owner@linhabase.test', name: 'Test Owner' },
  admin: { email: 'test-admin@linhabase.test', name: 'Test Admin' },
  member: { email: 'test-member@linhabase.test', name: 'Test Member' },
} as const

const TEST_COMPANY_ID = 'a1111111-1111-1111-1111-111111111111'

function log(icon: string, msg: string) {
  console.log(`  ${icon}  ${msg}`)
}

async function ensureUser(
  supabase: ReturnType<typeof createClient>,
  email: string,
  name: string,
): Promise<string | null> {
  const { data: signIn } = await supabase.auth.signInWithPassword({ email, password: PASSWORD })
  if (signIn.user) {
    await supabase.auth.signOut()
    log('OK', `${name} exists — ${email}`)
    return signIn.user.id
  }

  const { data: signUp, error } = await supabase.auth.signUp({
    email,
    password: PASSWORD,
    options: { data: { name } },
  })

  if (error) {
    if (error.message.includes('already registered')) {
      const { data: retry } = await supabase.auth.signInWithPassword({ email, password: PASSWORD })
      if (retry.user) {
        await supabase.auth.signOut()
        log('OK', `${name} exists — ${email}`)
        return retry.user.id
      }
    }
    log('ERR', `${name}: ${error.message}`)
    return null
  }

  if (!signUp.user) {
    log('ERR', `${name}: no user returned`)
    return null
  }

  await supabase.auth.signOut()
  log('OK', `${name} created — ${email}`)
  return signUp.user.id
}

async function main() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error('Missing Supabase env vars')
    process.exit(1)
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

  console.log('\nLinhaBase — seed test roles\n')

  const ownerId = await ensureUser(supabase, USERS.owner.email, USERS.owner.name)
  const adminId = await ensureUser(supabase, USERS.admin.email, USERS.admin.name)
  const memberId = await ensureUser(supabase, USERS.member.email, USERS.member.name)

  if (!ownerId || !adminId || !memberId) {
    process.exit(1)
  }

  const { data: ownerSession, error: ownerLoginErr } = await supabase.auth.signInWithPassword({
    email: USERS.owner.email,
    password: PASSWORD,
  })

  if (ownerLoginErr || !ownerSession.user) {
    log('ERR', `Owner login failed: ${ownerLoginErr?.message}`)
    process.exit(1)
  }

  const { data: existingCompany } = await supabase
    .from('companies')
    .select('id, name')
    .eq('id', TEST_COMPANY_ID)
    .maybeSingle()

  if (existingCompany) {
    log('OK', `Company exists: ${existingCompany.name}`)
  } else {
    const { error } = await supabase.from('companies').insert({
      id: TEST_COMPANY_ID,
      name: 'Test Roles Company',
      owner_id: ownerId,
    })
    if (error) {
      log('ERR', `Company: ${error.message}`)
      process.exit(1)
    }
    log('OK', 'Company created: Test Roles Company')
  }

  async function ensureMembership(
    userId: string,
    email: string,
    role: 'admin' | 'member',
    label: string,
  ) {
    const { data: existing } = await supabase
      .from('company_members')
      .select('id, role')
      .eq('company_id', TEST_COMPANY_ID)
      .eq('email', email)
      .maybeSingle()

    if (existing) {
      if (existing.role !== role) {
        await supabase.from('company_members').update({ role, user_id: userId, status: 'active' }).eq('id', existing.id)
        log('OK', `${label} membership updated → ${role}`)
      } else {
        log('OK', `${label} membership exists (${role})`)
      }
      return
    }

    const { error } = await supabase.from('company_members').insert({
      company_id: TEST_COMPANY_ID,
      user_id: userId,
      email,
      role,
      status: 'active',
      joined_at: new Date().toISOString(),
    })

    if (error) log('ERR', `${label} membership: ${error.message}`)
    else log('OK', `${label} membership created (${role})`)
  }

  // Owner is company owner (companies.owner_id) + admin membership for app checks
  await ensureMembership(ownerId, USERS.owner.email, 'admin', 'Owner')
  await ensureMembership(adminId, USERS.admin.email, 'admin', 'Admin')
  await ensureMembership(memberId, USERS.member.email, 'member', 'Member')

  for (const [label, { email }] of Object.entries(USERS)) {
    const userId = label === 'owner' ? ownerId : label === 'admin' ? adminId : memberId
    await supabase.from('profiles').update({ active_company_id: TEST_COMPANY_ID }).eq('id', userId)
    log('OK', `${label} active_company_id set`)
  }

  await supabase.auth.signOut()

  console.log('\n── Credenciais de teste ──\n')
  for (const [role, { email, name }] of Object.entries(USERS)) {
    console.log(`  ${name} (${role})`)
    console.log(`    email: ${email}`)
    console.log(`    senha: ${PASSWORD}\n`)
  }
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
