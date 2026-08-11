DROP POLICY IF EXISTS "Admins can view leads" ON public.leads;

CREATE POLICY "Admins can view leads"
  ON public.leads
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur
      WHERE ur.user_id = auth.uid() AND ur.role = 'admin'::public.app_role
    )
  );

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);