import { redirect } from 'next/navigation'

/**
 * /admin/timesheets → redirect to unified admin page with timesheets tab.
 * The actual rendering happens in /admin/page.tsx via AdminShell.
 */
export default function AdminTimesheetsRedirect() {
  redirect('/admin?tab=timesheets')
}
