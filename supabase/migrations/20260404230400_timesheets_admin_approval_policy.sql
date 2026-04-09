-- Allow company admin to UPDATE timesheets of active members within same company
-- This is needed for the approval workflow (admin sets status = 'approved')
CREATE POLICY timesheets_company_admin_update
  ON timesheets
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM company_members admin_cm
      JOIN company_members target_cm
        ON admin_cm.company_id = target_cm.company_id
        AND target_cm.user_id = timesheets.user_id
        AND target_cm.status = 'active'
      WHERE admin_cm.user_id = auth.uid()
        AND admin_cm.role = 'admin'
        AND admin_cm.status = 'active'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM company_members admin_cm
      JOIN company_members target_cm
        ON admin_cm.company_id = target_cm.company_id
        AND target_cm.user_id = timesheets.user_id
        AND target_cm.status = 'active'
      WHERE admin_cm.user_id = auth.uid()
        AND admin_cm.role = 'admin'
        AND admin_cm.status = 'active'
    )
  );
