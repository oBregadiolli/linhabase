import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { isCurrentUserAdmin } from '@/lib/supabase/membership'

/**
 * Admin layout — server-side guard.
 * Redirects non-admin users to /dashboard.
 * This is the single authorization checkpoint for all /admin/* routes.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const isAdmin = await isCurrentUserAdmin()
  if (!isAdmin) redirect('/dashboard')

  return <>{children}</>
}
