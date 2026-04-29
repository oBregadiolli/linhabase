import { redirect } from 'next/navigation'

/**
 * /admin/clients → redirect to unified admin page with clients tab.
 * The actual rendering happens in /admin/page.tsx via AdminShell.
 */
export default function AdminClientsRedirect() {
  redirect('/admin?tab=clients')
}
