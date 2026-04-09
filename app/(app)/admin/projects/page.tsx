import { getCurrentMembership } from '@/lib/supabase/membership'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ProjectsClient from './ProjectsClient'

export const metadata = {
  title: 'Projetos — Admin',
}

export default async function AdminProjectsPage() {
  const membership = await getCurrentMembership()
  if (!membership || membership.member.role !== 'admin') redirect('/dashboard')

  const supabase = await createClient()
  const companyId = membership.company.id

  // Fetch all projects for this company (active + inactive)
  const { data: projects } = await supabase
    .from('projects')
    .select('*')
    .eq('company_id', companyId)
    .order('active', { ascending: false })   // active first
    .order('name', { ascending: true })      // then alphabetical

  return (
    <ProjectsClient
      companyName={membership.company.name}
      projects={projects ?? []}
    />
  )
}
