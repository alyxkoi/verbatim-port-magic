-- 1. Length constraints on leads
ALTER TABLE public.leads
  ADD CONSTRAINT leads_name_len CHECK (name IS NULL OR char_length(name) <= 120),
  ADD CONSTRAINT leads_business_len CHECK (business IS NULL OR char_length(business) <= 160),
  ADD CONSTRAINT leads_phone_len CHECK (phone IS NULL OR char_length(phone) <= 32),
  ADD CONSTRAINT leads_business_type_len CHECK (business_type IS NULL OR char_length(business_type) <= 80),
  ADD CONSTRAINT leads_message_len CHECK (message IS NULL OR char_length(message) <= 2000);

-- 2. Roles infrastructure
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'staff', 'user');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 3. Admin read access to leads
GRANT SELECT ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

CREATE POLICY "Admins can view leads"
  ON public.leads FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- 4. Storage policies for the images bucket
CREATE POLICY "Public can view images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'images');

CREATE POLICY "Authenticated users can upload images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'images');

CREATE POLICY "Authenticated users can update images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'images');

CREATE POLICY "Authenticated users can delete images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'images');