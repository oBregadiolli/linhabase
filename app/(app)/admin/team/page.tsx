import { redirect } from 'next/navigation'

/**
 * /admin/team → redirect to unified admin page with team tab.
 * The actual rendering happens in /admin/page.tsx via AdminShell.
 */
export default function AdminTeamRedirect() {
  redirect('/admin?tab=team')
}
