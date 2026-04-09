import { redirect } from 'next/navigation'

/**
 * /admin/projects → redirect to unified admin page with projects tab.
 * The actual rendering happens in /admin/page.tsx via AdminShell.
 */
export default function AdminProjectsRedirect() {
  redirect('/admin?tab=projects')
}
