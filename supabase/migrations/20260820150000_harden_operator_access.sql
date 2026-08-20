-- The current website submits through the rate-limited server intake route.
-- The original direct anonymous insert path is no longer used.
drop policy if exists "Anyone can submit a lead" on public.leads;
revoke insert on public.leads from anon;

-- Only the Alyx operator role may change files in the public images bucket.
-- Public read access remains unchanged because these are website assets.
drop policy if exists "Authenticated users can upload images" on storage.objects;
drop policy if exists "Authenticated users can update images" on storage.objects;
drop policy if exists "Authenticated users can delete images" on storage.objects;

create policy "Admins can upload images"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'images'
    and public.has_role((select auth.uid()), 'admin'::public.app_role)
  );

create policy "Admins can update images"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'images'
    and public.has_role((select auth.uid()), 'admin'::public.app_role)
  )
  with check (
    bucket_id = 'images'
    and public.has_role((select auth.uid()), 'admin'::public.app_role)
  );

create policy "Admins can delete images"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'images'
    and public.has_role((select auth.uid()), 'admin'::public.app_role)
  );
