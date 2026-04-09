import { redirect } from 'next/navigation'

/**
 * /admin → redirect to /admin/timesheets
 * This ensures /admin always lands on the primary admin view.
 */
export default function AdminIndexPage() {
  redirect('/admin/timesheets')
}
