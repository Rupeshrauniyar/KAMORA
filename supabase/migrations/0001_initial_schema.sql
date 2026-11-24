-- =============================================================================
-- KAMORA — Migration 0001: Normalized E-Commerce PostgreSQL Schema
-- All monetary amounts are stored as integer paise (INR * 100) to avoid floats.
-- Default business timezone: Asia/Kolkata
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- ENUMS
-- -----------------------------------------------------------------------------
do $$ begin
  create type public.admin_role as enum (
    'super_admin',
    'admin',
    'order_manager',
    'inventory_manager',
    'content_manager'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.product_status as enum ('draft', 'published', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.order_status as enum (
    'pending',
    'confirmed',
    'processing',
    'shipped',
    'out_for_delivery',
    'delivered',
    'cancelled',
    'returned'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_status as enum (
    'pending_payment',
    'paid',
    'failed',
    'refunded',
    'partially_refunded',
    'cod_pending_collection'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.payment_method as enum ('stripe_card', 'stripe_upi', 'cod', 'external');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.discount_type as enum ('fixed_paise', 'percentage');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.inventory_movement_type as enum (
    'initial',
    'manual_adjustment',
    'reservation',
    'reservation_release',
    'sale_deduction',
    'cancellation_restore',
    'return_restore'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.review_status as enum ('pending', 'approved', 'rejected');
exception when duplicate_object then null; end $$;

-- -----------------------------------------------------------------------------
-- UTILITY TRIGGER: updated_at
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- 1. PROFILES
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text,
  phone text,
  avatar_url text,
  auth_provider text default 'email',
  marketing_consent boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_profiles_email on public.profiles(email);
create index if not exists idx_profiles_phone on public.profiles(phone);
drop trigger if exists trg_profiles_updated_at on public.profiles;
create trigger trg_profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile when a user signs up via Supabase Auth
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, avatar_url, auth_provider)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.email,
    new.phone,
    new.raw_user_meta_data->>'avatar_url',
    coalesce(new.raw_app_meta_data->>'provider', 'email')
  )
  on conflict (id) do update set
    email = coalesce(excluded.email, public.profiles.email),
    phone = coalesce(excluded.phone, public.profiles.phone),
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any auth.users accounts created prior to running this schema
insert into public.profiles (id, full_name, email, phone, avatar_url, auth_provider)
select
  u.id,
  coalesce(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name'),
  u.email,
  u.phone,
  coalesce(u.raw_user_meta_data->>'avatar_url', u.raw_user_meta_data->>'picture'),
  coalesce(u.raw_app_meta_data->>'provider', 'email')
from auth.users u
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- 2. USER ADDRESSES
-- -----------------------------------------------------------------------------
create table if not exists public.user_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null default 'Home',
  full_name text not null,
  phone text not null,
  address_line1 text not null,
  address_line2 text,
  landmark text,
  city text not null,
  state text not null,
  pincode text not null check (pincode ~ '^[1-9][0-9]{5}$'),
  country text not null default 'India',
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_user_addresses_user on public.user_addresses(user_id);
drop trigger if exists trg_user_addresses_updated_at on public.user_addresses;
create trigger trg_user_addresses_updated_at before update on public.user_addresses
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 3. PRODUCTS
-- -----------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  subtitle text,
  short_description text not null,
  description text not null,
  mrp_paise integer not null check (mrp_paise > 0),
  sale_price_paise integer not null check (sale_price_paise > 0 and sale_price_paise <= mrp_paise),
  gst_rate_bps integer not null default 1200 check (gst_rate_bps >= 0 and gst_rate_bps <= 2800),
  hsn_code text default '90211000',
  material_info text,
  care_instructions text,
  usage_recommendations text,
  specifications jsonb not null default '[]'::jsonb,
  whats_included jsonb not null default '[]'::jsonb,
  status public.product_status not null default 'draft',
  is_flagship boolean not null default false,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_products_status on public.products(status);
drop trigger if exists trg_products_updated_at on public.products;
create trigger trg_products_updated_at before update on public.products
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 4. PRODUCT VARIANTS
-- -----------------------------------------------------------------------------
create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  size_code text not null,
  size_label text not null,
  waist_min_inches numeric(4,1) not null check (waist_min_inches > 0),
  waist_max_inches numeric(4,1) not null check (waist_max_inches >= waist_min_inches),
  waist_min_cm numeric(5,1) not null check (waist_min_cm > 0),
  waist_max_cm numeric(5,1) not null check (waist_max_cm >= waist_min_cm),
  color text default 'Slate Blue & Mist',
  mrp_paise integer not null check (mrp_paise > 0),
  sale_price_paise integer not null check (sale_price_paise > 0 and sale_price_paise <= mrp_paise),
  weight_grams integer not null default 340 check (weight_grams > 0),
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, size_code)
);
create index if not exists idx_product_variants_product on public.product_variants(product_id);
drop trigger if exists trg_product_variants_updated_at on public.product_variants;
create trigger trg_product_variants_updated_at before update on public.product_variants
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 5. PRODUCT IMAGES
-- -----------------------------------------------------------------------------
create table if not exists public.product_images (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  storage_path text,
  url text not null,
  alt_text text not null,
  caption text,
  image_type text not null default 'gallery' check (image_type in ('hero', 'gallery', 'detail', 'lifestyle', 'size_guide', 'kit')),
  is_primary boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_product_images_product on public.product_images(product_id, sort_order);

-- -----------------------------------------------------------------------------
-- 6. PRODUCT VIDEOS
-- -----------------------------------------------------------------------------
create table if not exists public.product_videos (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  title text not null,
  description text,
  storage_path text,
  video_url text not null,
  poster_url text,
  duration_seconds integer check (duration_seconds is null or duration_seconds > 0),
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists idx_product_videos_product on public.product_videos(product_id);

-- -----------------------------------------------------------------------------
-- 7. PRODUCT FEATURES
-- -----------------------------------------------------------------------------
create table if not exists public.product_features (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  icon_name text not null default 'shield-check',
  title text not null,
  description text not null,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_product_features_product on public.product_features(product_id, sort_order);
drop trigger if exists trg_product_features_updated_at on public.product_features;
create trigger trg_product_features_updated_at before update on public.product_features
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 8. PRODUCT SIZE GUIDES
-- -----------------------------------------------------------------------------
create table if not exists public.product_size_guides (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  size_code text not null,
  size_label text not null,
  waist_min_inches numeric(4,1) not null,
  waist_max_inches numeric(4,1) not null,
  waist_min_cm numeric(5,1) not null,
  waist_max_cm numeric(5,1) not null,
  belt_length_cm numeric(5,1),
  fit_note text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, size_code)
);
drop trigger if exists trg_product_size_guides_updated_at on public.product_size_guides;
create trigger trg_product_size_guides_updated_at before update on public.product_size_guides
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 9. INVENTORY
-- -----------------------------------------------------------------------------
create table if not exists public.inventory (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null unique references public.product_variants(id) on delete cascade,
  stock_on_hand integer not null default 0 check (stock_on_hand >= 0),
  stock_reserved integer not null default 0 check (stock_reserved >= 0),
  low_stock_threshold integer not null default 10 check (low_stock_threshold >= 0),
  allow_backorder boolean not null default false,
  updated_at timestamptz not null default now(),
  constraint chk_reserved_lte_on_hand check (stock_reserved <= stock_on_hand)
);
drop trigger if exists trg_inventory_updated_at on public.inventory;
create trigger trg_inventory_updated_at before update on public.inventory
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 10. INVENTORY MOVEMENTS
-- -----------------------------------------------------------------------------
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  movement_type public.inventory_movement_type not null,
  quantity_delta integer not null,
  stock_before integer not null,
  stock_after integer not null,
  reference_order_id uuid,
  reason text,
  performed_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists idx_inventory_movements_variant on public.inventory_movements(variant_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 11. CARTS
-- -----------------------------------------------------------------------------
create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  session_token text unique,
  coupon_code text,
  currency text not null default 'INR',
  abandoned_notified_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_carts_user on public.carts(user_id);
create index if not exists idx_carts_session on public.carts(session_token);
drop trigger if exists trg_carts_updated_at on public.carts;
create trigger trg_carts_updated_at before update on public.carts
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 12. CART ITEMS
-- -----------------------------------------------------------------------------
create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id) on delete cascade,
  quantity integer not null check (quantity > 0 and quantity <= 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(cart_id, variant_id)
);
create index if not exists idx_cart_items_cart on public.cart_items(cart_id);
drop trigger if exists trg_cart_items_updated_at on public.cart_items;
create trigger trg_cart_items_updated_at before update on public.cart_items
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 17. OFFERS (declared before orders so orders can FK if needed)
-- -----------------------------------------------------------------------------
create table if not exists public.offers (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  name text not null,
  campaign_type text not null check (campaign_type in ('bundle_kit', 'second_unit_addon', 'launch_discount')),
  headline text not null,
  description text,
  badge_text text,
  cta_text text default 'Get Your Comfort Kit',
  discount_type public.discount_type not null default 'fixed_paise',
  discount_value integer not null default 0 check (discount_value >= 0),
  min_quantity integer not null default 1 check (min_quantity >= 1),
  min_order_paise integer not null default 0 check (min_order_paise >= 0),
  free_shipping boolean not null default false,
  stock_limit integer check (stock_limit is null or stock_limit >= 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_offers_updated_at on public.offers;
create trigger trg_offers_updated_at before update on public.offers
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 18. OFFER ITEMS
-- -----------------------------------------------------------------------------
create table if not exists public.offer_items (
  id uuid primary key default gen_random_uuid(),
  offer_id uuid not null references public.offers(id) on delete cascade,
  item_title text not null,
  item_description text,
  item_type text not null default 'complimentary' check (item_type in ('primary_product', 'complimentary', 'digital_guide', 'shipping_benefit')),
  value_paise integer not null default 0 check (value_paise >= 0),
  is_included boolean not null default true,
  sort_order integer not null default 0
);
create index if not exists idx_offer_items_offer on public.offer_items(offer_id, sort_order);

-- -----------------------------------------------------------------------------
-- 19. COUPONS
-- -----------------------------------------------------------------------------
create table if not exists public.coupons (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  description text,
  discount_type public.discount_type not null,
  discount_value integer not null check (discount_value > 0),
  min_order_paise integer not null default 0 check (min_order_paise >= 0),
  max_discount_paise integer check (max_discount_paise is null or max_discount_paise > 0),
  usage_limit integer check (usage_limit is null or usage_limit > 0),
  per_customer_limit integer not null default 1 check (per_customer_limit > 0),
  usage_count integer not null default 0 check (usage_count >= 0),
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_coupons_updated_at on public.coupons;
create trigger trg_coupons_updated_at before update on public.coupons
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 13. ORDERS
-- -----------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  idempotency_key text unique,
  user_id uuid references public.profiles(id) on delete set null,
  customer_name text not null,
  customer_email text not null,
  customer_phone text not null,
  shipping_address jsonb not null,
  currency text not null default 'INR',
  subtotal_paise integer not null check (subtotal_paise >= 0),
  offer_discount_paise integer not null default 0 check (offer_discount_paise >= 0),
  coupon_discount_paise integer not null default 0 check (coupon_discount_paise >= 0),
  shipping_paise integer not null default 0 check (shipping_paise >= 0),
  tax_paise integer not null default 0 check (tax_paise >= 0),
  total_paise integer not null check (total_paise >= 0),
  applied_offer_codes text[] not null default '{}',
  applied_coupon_code text,
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'pending_payment',
  order_status public.order_status not null default 'pending',
  inventory_deducted boolean not null default false,
  internal_notes text,
  customer_notes text,
  cancelled_at timestamptz,
  delivered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_orders_user on public.orders(user_id, created_at desc);
create index if not exists idx_orders_number on public.orders(order_number);
create index if not exists idx_orders_phone on public.orders(customer_phone);
create index if not exists idx_orders_status on public.orders(order_status, payment_status);
create index if not exists idx_orders_created_at on public.orders(created_at desc);
drop trigger if exists trg_orders_updated_at on public.orders;
create trigger trg_orders_updated_at before update on public.orders
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 14. ORDER ITEMS
-- -----------------------------------------------------------------------------
create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id) on delete set null,
  variant_id uuid references public.product_variants(id) on delete set null,
  product_name text not null,
  variant_label text not null,
  sku text not null,
  quantity integer not null check (quantity > 0),
  unit_mrp_paise integer not null check (unit_mrp_paise >= 0),
  unit_price_paise integer not null check (unit_price_paise >= 0),
  line_total_paise integer not null check (line_total_paise >= 0),
  gst_rate_bps integer not null default 1200,
  created_at timestamptz not null default now()
);
create index if not exists idx_order_items_order on public.order_items(order_id);

-- -----------------------------------------------------------------------------
-- 15. PAYMENTS
-- -----------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  provider text not null default 'stripe',
  provider_session_id text unique,
  provider_payment_intent_id text unique,
  provider_charge_id text,
  amount_paise integer not null check (amount_paise >= 0),
  currency text not null default 'INR',
  status public.payment_status not null default 'pending_payment',
  method_details jsonb default '{}'::jsonb,
  failure_reason text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_payments_order on public.payments(order_id);
drop trigger if exists trg_payments_updated_at on public.payments;
create trigger trg_payments_updated_at before update on public.payments
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 16. REFUNDS
-- -----------------------------------------------------------------------------
create table if not exists public.refunds (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  payment_id uuid not null references public.payments(id) on delete cascade,
  provider_refund_id text unique,
  amount_paise integer not null check (amount_paise > 0),
  reason text,
  status text not null default 'pending' check (status in ('pending', 'succeeded', 'failed', 'cancelled')),
  initiated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_refunds_order on public.refunds(order_id);
drop trigger if exists trg_refunds_updated_at on public.refunds;
create trigger trg_refunds_updated_at before update on public.refunds
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 20. COUPON REDEMPTIONS
-- -----------------------------------------------------------------------------
create table if not exists public.coupon_redemptions (
  id uuid primary key default gen_random_uuid(),
  coupon_id uuid not null references public.coupons(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  customer_email text not null,
  discount_paise integer not null check (discount_paise >= 0),
  created_at timestamptz not null default now(),
  unique(coupon_id, order_id)
);
create index if not exists idx_coupon_redemptions_coupon on public.coupon_redemptions(coupon_id);

-- -----------------------------------------------------------------------------
-- 21. REVIEWS
-- -----------------------------------------------------------------------------
create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  user_id uuid references public.profiles(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  author_name text not null,
  author_city text,
  rating integer not null check (rating >= 1 and rating <= 5),
  title text,
  body text not null,
  is_verified_purchase boolean not null default false,
  is_featured boolean not null default false,
  status public.review_status not null default 'pending',
  moderated_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_reviews_product_status on public.reviews(product_id, status);
drop trigger if exists trg_reviews_updated_at on public.reviews;
create trigger trg_reviews_updated_at before update on public.reviews
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 22. REVIEW MEDIA
-- -----------------------------------------------------------------------------
create table if not exists public.review_media (
  id uuid primary key default gen_random_uuid(),
  review_id uuid not null references public.reviews(id) on delete cascade,
  media_type text not null default 'image' check (media_type in ('image', 'video')),
  storage_path text not null,
  url text not null,
  is_approved boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_review_media_review on public.review_media(review_id);

-- -----------------------------------------------------------------------------
-- 23. TESTIMONIALS (Curated verified customer highlights, managed by admin)
-- -----------------------------------------------------------------------------
create table if not exists public.testimonials (
  id uuid primary key default gen_random_uuid(),
  review_id uuid references public.reviews(id) on delete set null,
  customer_name text not null,
  customer_location text,
  quote text not null,
  rating integer not null check (rating >= 1 and rating <= 5),
  is_verified_purchase boolean not null default true,
  video_url text,
  is_active boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_testimonials_updated_at on public.testimonials;
create trigger trg_testimonials_updated_at before update on public.testimonials
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 24. FAQS
-- -----------------------------------------------------------------------------
create table if not exists public.faqs (
  id uuid primary key default gen_random_uuid(),
  category text not null default 'Product',
  question text not null,
  answer text not null,
  show_on_home boolean not null default true,
  show_on_product boolean not null default true,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_faqs_updated_at on public.faqs;
create trigger trg_faqs_updated_at before update on public.faqs
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 25. BLOG POSTS
-- -----------------------------------------------------------------------------
create table if not exists public.blog_posts (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title text not null,
  excerpt text not null,
  content_markdown text not null,
  cover_image_url text,
  category text not null default 'Lumbar Care',
  author_name text not null default 'Kamora Wellness Editorial',
  read_time_minutes integer not null default 4,
  seo_title text,
  seo_description text,
  is_published boolean not null default false,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_blog_posts_published on public.blog_posts(is_published, published_at desc);
drop trigger if exists trg_blog_posts_updated_at on public.blog_posts;
create trigger trg_blog_posts_updated_at before update on public.blog_posts
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 26. BANNERS (Homepage Hero, Promo & Editorial Blocks)
-- -----------------------------------------------------------------------------
create table if not exists public.banners (
  id uuid primary key default gen_random_uuid(),
  slot text not null unique,
  eyebrow text,
  headline text not null,
  subheadline text,
  primary_cta_label text,
  primary_cta_href text,
  secondary_cta_label text,
  secondary_cta_href text,
  image_url text,
  image_alt text,
  metadata jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_banners_updated_at on public.banners;
create trigger trg_banners_updated_at before update on public.banners
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 27. ANNOUNCEMENTS
-- -----------------------------------------------------------------------------
create table if not exists public.announcements (
  id uuid primary key default gen_random_uuid(),
  message text not null,
  link_label text,
  link_href text,
  starts_at timestamptz,
  ends_at timestamptz,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_announcements_updated_at on public.announcements;
create trigger trg_announcements_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 28. SHIPPING ZONES
-- -----------------------------------------------------------------------------
create table if not exists public.shipping_zones (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  pincode_prefixes text[] not null default '{}',
  states text[] not null default '{}',
  shipping_charge_paise integer not null default 0 check (shipping_charge_paise >= 0),
  free_shipping_threshold_paise integer not null default 149900 check (free_shipping_threshold_paise >= 0),
  cod_available boolean not null default true,
  cod_fee_paise integer not null default 0 check (cod_fee_paise >= 0),
  estimated_min_days integer not null default 3 check (estimated_min_days >= 1),
  estimated_max_days integer not null default 6 check (estimated_max_days >= estimated_min_days),
  is_serviceable boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_shipping_zones_updated_at on public.shipping_zones;
create trigger trg_shipping_zones_updated_at before update on public.shipping_zones
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 29. SHIPMENTS
-- -----------------------------------------------------------------------------
create table if not exists public.shipments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  courier_name text,
  tracking_number text,
  tracking_url text,
  shipment_status text not null default 'label_created',
  estimated_delivery_date date,
  dispatched_at timestamptz,
  delivered_at timestamptz,
  tracking_events jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_shipments_order on public.shipments(order_id);
drop trigger if exists trg_shipments_updated_at on public.shipments;
create trigger trg_shipments_updated_at before update on public.shipments
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 30. NOTIFICATIONS
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  order_id uuid references public.orders(id) on delete set null,
  channel text not null check (channel in ('in_app', 'email', 'sms', 'whatsapp')),
  event_type text not null,
  recipient text not null,
  subject text,
  body text not null,
  status text not null default 'queued' check (status in ('queued', 'sent', 'failed', 'read')),
  metadata jsonb not null default '{}'::jsonb,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 31. NEWSLETTER SUBSCRIBERS
-- -----------------------------------------------------------------------------
create table if not exists public.newsletter_subscribers (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  source text not null default 'footer',
  is_subscribed boolean not null default true,
  consented_at timestamptz not null default now(),
  unsubscribed_at timestamptz
);

-- -----------------------------------------------------------------------------
-- 32. ADMIN USERS
-- -----------------------------------------------------------------------------
create table if not exists public.admin_users (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  role public.admin_role not null default 'admin',
  is_active boolean not null default true,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_admin_users_updated_at on public.admin_users;
create trigger trg_admin_users_updated_at before update on public.admin_users
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 33. AUDIT LOGS
-- -----------------------------------------------------------------------------
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_role text,
  action text not null,
  entity_type text not null,
  entity_id text,
  before_state jsonb,
  after_state jsonb,
  ip_address text,
  created_at timestamptz not null default now()
);
create index if not exists idx_audit_logs_created on public.audit_logs(created_at desc);
create index if not exists idx_audit_logs_entity on public.audit_logs(entity_type, entity_id);

-- -----------------------------------------------------------------------------
-- 34. STORE SETTINGS
-- -----------------------------------------------------------------------------
create table if not exists public.store_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique default 'default',
  brand_name text not null default 'Kamora',
  tagline text not null default 'Move Freely. Live Fully.',
  support_email text not null default 'support@kamora.in',
  support_phone text not null default '+91 98765 43210',
  whatsapp_number text default '919876543210',
  business_legal_name text not null default 'Kamora Wellness Private Limited',
  business_address text not null default 'Bengaluru, Karnataka, India',
  gstin text,
  gst_inclusive_pricing boolean not null default true,
  default_gst_rate_bps integer not null default 1200,
  currency text not null default 'INR',
  timezone text not null default 'Asia/Kolkata',
  cod_enabled boolean not null default true,
  cod_max_order_paise integer not null default 1000000,
  free_shipping_threshold_paise integer not null default 149900,
  default_shipping_charge_paise integer not null default 9900,
  return_window_days integer not null default 7,
  store_live boolean not null default true,
  social_links jsonb not null default '{}'::jsonb,
  seo_defaults jsonb not null default '{}'::jsonb,
  logo_url text,
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_store_settings_updated_at on public.store_settings;
create trigger trg_store_settings_updated_at before update on public.store_settings
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- 35. WISHLISTS & 36. WEBHOOK EVENTS (Idempotency)
-- -----------------------------------------------------------------------------
create table if not exists public.wishlists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(user_id, product_id)
);

create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_id text not null unique,
  event_type text not null,
  processed_at timestamptz not null default now(),
  payload jsonb
);
