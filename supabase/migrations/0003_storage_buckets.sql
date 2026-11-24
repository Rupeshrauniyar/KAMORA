-- =============================================================================
-- KAMORA — Migration 0003: Supabase Storage Buckets & Access Policies
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('product-images', 'product-images', true, 10485760, array['image/jpeg','image/png','image/webp','image/avif']),
  ('product-videos', 'product-videos', true, 52428800, array['video/mp4','video/webm']),
  ('customer-review-media', 'customer-review-media', false, 10485760, array['image/jpeg','image/png','image/webp']),
  ('brand-assets', 'brand-assets', true, 5242880, array['image/jpeg','image/png','image/webp','image/svg+xml']),
  ('blog-media', 'blog-media', true, 10485760, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do nothing;

-- Public read access for storefront media buckets
create policy "public_read_storefront_media"
  on storage.objects for select
  using (bucket_id in ('product-images', 'product-videos', 'brand-assets', 'blog-media'));

-- Admin upload/update/delete for storefront media buckets
create policy "admin_manage_storefront_media"
  on storage.objects for all
  using (
    bucket_id in ('product-images', 'product-videos', 'brand-assets', 'blog-media')
    and public.has_admin_role(array['super_admin','admin','content_manager'])
  )
  with check (
    bucket_id in ('product-images', 'product-videos', 'brand-assets', 'blog-media')
    and public.has_admin_role(array['super_admin','admin','content_manager'])
  );

-- Authenticated customers can upload review media into their own folder (<user_id>/*)
create policy "customer_upload_own_review_media"
  on storage.objects for insert
  with check (
    bucket_id = 'customer-review-media'
    and auth.uid() is not null
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Private review media readable only by uploader or admins until approved/published
create policy "review_media_owner_or_admin_read"
  on storage.objects for select
  using (
    bucket_id = 'customer-review-media'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or public.has_admin_role(array['super_admin','admin','content_manager'])
    )
  );
