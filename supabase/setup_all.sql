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


-- =============================================================================

-- =============================================================================
-- KAMORA — Migration 0002: Admin Role Helpers, Transactional Inventory & RLS
-- =============================================================================

-- -----------------------------------------------------------------------------
-- ADMIN ROLE CHECK FUNCTIONS (SECURITY DEFINER, safe for RLS)
-- -----------------------------------------------------------------------------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
      and au.is_active = true
  );
$$;

create or replace function public.has_admin_role(allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = auth.uid()
      and au.is_active = true
      and au.role::text = any(allowed_roles)
  );
$$;

-- -----------------------------------------------------------------------------
-- TRANSACTIONAL INVENTORY FUNCTIONS (Row-level FOR UPDATE locking prevents overselling)
-- -----------------------------------------------------------------------------
create or replace function public.reserve_inventory(
  p_variant_id uuid,
  p_quantity integer,
  p_order_id uuid default null,
  p_actor uuid default null
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.inventory%rowtype;
  v_available integer;
begin
  if p_quantity <= 0 then
    raise exception 'Quantity must be positive';
  end if;

  select * into v_inv
  from public.inventory
  where variant_id = p_variant_id
  for update;

  if not found then
    return false;
  end if;

  v_available := v_inv.stock_on_hand - v_inv.stock_reserved;
  if v_available < p_quantity and not v_inv.allow_backorder then
    return false;
  end if;

  update public.inventory
  set stock_reserved = stock_reserved + p_quantity,
      updated_at = now()
  where id = v_inv.id;

  insert into public.inventory_movements (
    variant_id, movement_type, quantity_delta, stock_before, stock_after,
    reference_order_id, reason, performed_by
  ) values (
    p_variant_id, 'reservation', -p_quantity, v_available, v_available - p_quantity,
    p_order_id, 'Checkout stock reservation', p_actor
  );

  return true;
end;
$$;

create or replace function public.confirm_order_inventory(
  p_variant_id uuid,
  p_quantity integer,
  p_order_id uuid,
  p_from_reservation boolean default true
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.inventory%rowtype;
begin
  select * into v_inv
  from public.inventory
  where variant_id = p_variant_id
  for update;

  if not found then
    return false;
  end if;

  if v_inv.stock_on_hand < p_quantity and not v_inv.allow_backorder then
    return false;
  end if;

  update public.inventory
  set stock_on_hand = greatest(0, stock_on_hand - p_quantity),
      stock_reserved = case
        when p_from_reservation then greatest(0, stock_reserved - p_quantity)
        else stock_reserved
      end,
      updated_at = now()
  where id = v_inv.id;

  insert into public.inventory_movements (
    variant_id, movement_type, quantity_delta, stock_before, stock_after,
    reference_order_id, reason
  ) values (
    p_variant_id, 'sale_deduction', -p_quantity,
    v_inv.stock_on_hand, greatest(0, v_inv.stock_on_hand - p_quantity),
    p_order_id, 'Order payment confirmed / COD placed'
  );

  return true;
end;
$$;

create or replace function public.release_inventory_reservation(
  p_variant_id uuid,
  p_quantity integer,
  p_order_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.inventory%rowtype;
  v_before integer;
begin
  select * into v_inv
  from public.inventory
  where variant_id = p_variant_id
  for update;

  if not found then
    return;
  end if;

  v_before := v_inv.stock_on_hand - v_inv.stock_reserved;

  update public.inventory
  set stock_reserved = greatest(0, stock_reserved - p_quantity),
      updated_at = now()
  where id = v_inv.id;

  insert into public.inventory_movements (
    variant_id, movement_type, quantity_delta, stock_before, stock_after,
    reference_order_id, reason
  ) values (
    p_variant_id, 'reservation_release', p_quantity,
    v_before, v_before + least(v_inv.stock_reserved, p_quantity),
    p_order_id, 'Payment failed or checkout expired'
  );
end;
$$;

create or replace function public.restore_inventory_on_cancel(
  p_variant_id uuid,
  p_quantity integer,
  p_order_id uuid,
  p_reason text default 'Order cancelled',
  p_actor uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inv public.inventory%rowtype;
begin
  select * into v_inv
  from public.inventory
  where variant_id = p_variant_id
  for update;

  if not found then
    return;
  end if;

  update public.inventory
  set stock_on_hand = stock_on_hand + p_quantity,
      updated_at = now()
  where id = v_inv.id;

  insert into public.inventory_movements (
    variant_id, movement_type, quantity_delta, stock_before, stock_after,
    reference_order_id, reason, performed_by
  ) values (
    p_variant_id, 'cancellation_restore', p_quantity,
    v_inv.stock_on_hand, v_inv.stock_on_hand + p_quantity,
    p_order_id, p_reason, p_actor
  );
end;
$$;

-- -----------------------------------------------------------------------------
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_addresses enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_images enable row level security;
alter table public.product_videos enable row level security;
alter table public.product_features enable row level security;
alter table public.product_size_guides enable row level security;
alter table public.inventory enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.carts enable row level security;
alter table public.cart_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.refunds enable row level security;
alter table public.offers enable row level security;
alter table public.offer_items enable row level security;
alter table public.coupons enable row level security;
alter table public.coupon_redemptions enable row level security;
alter table public.reviews enable row level security;
alter table public.review_media enable row level security;
alter table public.testimonials enable row level security;
alter table public.faqs enable row level security;
alter table public.blog_posts enable row level security;
alter table public.banners enable row level security;
alter table public.announcements enable row level security;
alter table public.shipping_zones enable row level security;
alter table public.shipments enable row level security;
alter table public.notifications enable row level security;
alter table public.newsletter_subscribers enable row level security;
alter table public.admin_users enable row level security;
alter table public.audit_logs enable row level security;
alter table public.store_settings enable row level security;
alter table public.wishlists enable row level security;
alter table public.webhook_events enable row level security;

-- -----------------------------------------------------------------------------
-- RLS POLICIES: PROFILES & ADDRESSES
-- -----------------------------------------------------------------------------
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id or public.is_admin());

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "addresses_own_all" on public.user_addresses
  for all using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

-- -----------------------------------------------------------------------------
-- RLS POLICIES: PUBLIC CATALOG & CONTENT (Read published, Admin writes)
-- -----------------------------------------------------------------------------
create policy "products_public_read" on public.products
  for select using (status = 'published' or public.is_admin());
create policy "products_admin_write" on public.products
  for all using (public.has_admin_role(array['super_admin','admin','content_manager']))
  with check (public.has_admin_role(array['super_admin','admin','content_manager']));

create policy "variants_public_read" on public.product_variants
  for select using (
    (is_active = true and exists (select 1 from public.products p where p.id = product_id and p.status = 'published'))
    or public.is_admin()
  );
create policy "variants_admin_write" on public.product_variants
  for all using (public.has_admin_role(array['super_admin','admin','inventory_manager']))
  with check (public.has_admin_role(array['super_admin','admin','inventory_manager']));

create policy "images_public_read" on public.product_images
  for select using (true);
create policy "images_admin_write" on public.product_images
  for all using (public.has_admin_role(array['super_admin','admin','content_manager']))
  with check (public.has_admin_role(array['super_admin','admin','content_manager']));

create policy "videos_public_read" on public.product_videos
  for select using (is_active = true or public.is_admin());
create policy "videos_admin_write" on public.product_videos
  for all using (public.has_admin_role(array['super_admin','admin','content_manager']))
  with check (public.has_admin_role(array['super_admin','admin','content_manager']));

create policy "features_public_read" on public.product_features
  for select using (is_active = true or public.is_admin());
create policy "features_admin_write" on public.product_features
  for all using (public.has_admin_role(array['super_admin','admin','content_manager']))
  with check (public.has_admin_role(array['super_admin','admin','content_manager']));

create policy "size_guides_public_read" on public.product_size_guides
  for select using (true);
create policy "size_guides_admin_write" on public.product_size_guides
  for all using (public.has_admin_role(array['super_admin','admin','content_manager']))
  with check (public.has_admin_role(array['super_admin','admin','content_manager']));

-- Inventory: public can read availability counts via published variants, only inventory/admin write
create policy "inventory_public_read" on public.inventory
  for select using (true);
create policy "inventory_admin_write" on public.inventory
  for all using (public.has_admin_role(array['super_admin','admin','inventory_manager']))
  with check (public.has_admin_role(array['super_admin','admin','inventory_manager']));

create policy "inventory_movements_admin_read" on public.inventory_movements
  for select using (public.has_admin_role(array['super_admin','admin','inventory_manager','order_manager']));

-- -----------------------------------------------------------------------------
-- RLS POLICIES: CARTS & CART ITEMS
-- -----------------------------------------------------------------------------
create policy "carts_own" on public.carts
  for all using (auth.uid() = user_id or public.is_admin())
  with check (auth.uid() = user_id or public.is_admin());

create policy "cart_items_own" on public.cart_items
  for all using (
    exists (select 1 from public.carts c where c.id = cart_id and (c.user_id = auth.uid() or public.is_admin()))
  )
  with check (
    exists (select 1 from public.carts c where c.id = cart_id and (c.user_id = auth.uid() or public.is_admin()))
  );

-- -----------------------------------------------------------------------------
-- RLS POLICIES: ORDERS, ORDER ITEMS, PAYMENTS, REFUNDS, SHIPMENTS
-- Customers can ONLY read their own orders; writes happen via verified server service role
-- -----------------------------------------------------------------------------
create policy "orders_select_own" on public.orders
  for select using (
    (auth.uid() is not null and user_id = auth.uid())
    or public.has_admin_role(array['super_admin','admin','order_manager'])
  );

create policy "orders_admin_update" on public.orders
  for update using (public.has_admin_role(array['super_admin','admin','order_manager']))
  with check (public.has_admin_role(array['super_admin','admin','order_manager']));

create policy "order_items_select_own" on public.order_items
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and ((auth.uid() is not null and o.user_id = auth.uid()) or public.has_admin_role(array['super_admin','admin','order_manager']))
    )
  );

create policy "payments_select_own" on public.payments
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and ((auth.uid() is not null and o.user_id = auth.uid()) or public.has_admin_role(array['super_admin','admin','order_manager']))
    )
  );

create policy "refunds_admin_or_owner_read" on public.refunds
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and ((auth.uid() is not null and o.user_id = auth.uid()) or public.has_admin_role(array['super_admin','admin','order_manager']))
    )
  );

create policy "shipments_select_own" on public.shipments
  for select using (
    exists (
      select 1 from public.orders o
      where o.id = order_id
        and ((auth.uid() is not null and o.user_id = auth.uid()) or public.has_admin_role(array['super_admin','admin','order_manager']))
    )
  );
create policy "shipments_admin_write" on public.shipments
  for all using (public.has_admin_role(array['super_admin','admin','order_manager']))
  with check (public.has_admin_role(array['super_admin','admin','order_manager']));

-- -----------------------------------------------------------------------------
-- RLS POLICIES: OFFERS, COUPONS, REVIEWS, CONTENT, SETTINGS, ADMIN
-- -----------------------------------------------------------------------------
create policy "offers_public_read" on public.offers
  for select using (
    (is_active = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()))
    or public.is_admin()
  );
create policy "offers_admin_write" on public.offers
  for all using (public.has_admin_role(array['super_admin','admin','content_manager']))
  with check (public.has_admin_role(array['super_admin','admin','content_manager']));

create policy "offer_items_public_read" on public.offer_items
  for select using (true);
create policy "offer_items_admin_write" on public.offer_items
  for all using (public.has_admin_role(array['super_admin','admin','content_manager']))
  with check (public.has_admin_role(array['super_admin','admin','content_manager']));

create policy "coupons_admin_read_write" on public.coupons
  for all using (public.has_admin_role(array['super_admin','admin']))
  with check (public.has_admin_role(array['super_admin','admin']));

create policy "coupon_redemptions_admin" on public.coupon_redemptions
  for select using (public.has_admin_role(array['super_admin','admin','order_manager']));

create policy "reviews_public_approved" on public.reviews
  for select using (status = 'approved' or auth.uid() = user_id or public.is_admin());
create policy "reviews_auth_insert" on public.reviews
  for insert with check (auth.uid() is not null and auth.uid() = user_id and status = 'pending');
create policy "reviews_admin_update" on public.reviews
  for update using (public.has_admin_role(array['super_admin','admin','content_manager']))
  with check (public.has_admin_role(array['super_admin','admin','content_manager']));

create policy "review_media_read" on public.review_media
  for select using (is_approved = true or public.is_admin());

create policy "testimonials_public_read" on public.testimonials
  for select using (is_active = true or public.is_admin());
create policy "testimonials_admin_write" on public.testimonials
  for all using (public.has_admin_role(array['super_admin','admin','content_manager']))
  with check (public.has_admin_role(array['super_admin','admin','content_manager']));

create policy "faqs_public_read" on public.faqs
  for select using (is_active = true or public.is_admin());
create policy "faqs_admin_write" on public.faqs
  for all using (public.has_admin_role(array['super_admin','admin','content_manager']))
  with check (public.has_admin_role(array['super_admin','admin','content_manager']));

create policy "blog_public_read" on public.blog_posts
  for select using (is_published = true or public.is_admin());
create policy "blog_admin_write" on public.blog_posts
  for all using (public.has_admin_role(array['super_admin','admin','content_manager']))
  with check (public.has_admin_role(array['super_admin','admin','content_manager']));

create policy "banners_public_read" on public.banners
  for select using (is_active = true or public.is_admin());
create policy "banners_admin_write" on public.banners
  for all using (public.has_admin_role(array['super_admin','admin','content_manager']))
  with check (public.has_admin_role(array['super_admin','admin','content_manager']));

create policy "announcements_public_read" on public.announcements
  for select using (
    (is_active = true and (starts_at is null or starts_at <= now()) and (ends_at is null or ends_at >= now()))
    or public.is_admin()
  );
create policy "announcements_admin_write" on public.announcements
  for all using (public.has_admin_role(array['super_admin','admin','content_manager']))
  with check (public.has_admin_role(array['super_admin','admin','content_manager']));

create policy "shipping_zones_public_read" on public.shipping_zones
  for select using (is_active = true or public.is_admin());
create policy "shipping_zones_admin_write" on public.shipping_zones
  for all using (public.has_admin_role(array['super_admin','admin','order_manager']))
  with check (public.has_admin_role(array['super_admin','admin','order_manager']));

create policy "notifications_own" on public.notifications
  for select using (auth.uid() = user_id or public.is_admin());

create policy "newsletter_insert_public" on public.newsletter_subscribers
  for insert with check (true);
create policy "newsletter_admin_read" on public.newsletter_subscribers
  for select using (public.has_admin_role(array['super_admin','admin','content_manager']));

create policy "admin_users_read" on public.admin_users
  for select using (auth.uid() = user_id or public.has_admin_role(array['super_admin','admin']));
create policy "admin_users_super_write" on public.admin_users
  for all using (public.has_admin_role(array['super_admin']))
  with check (public.has_admin_role(array['super_admin']));

create policy "audit_logs_admin_read" on public.audit_logs
  for select using (public.has_admin_role(array['super_admin','admin']));

create policy "store_settings_public_read" on public.store_settings
  for select using (true);
create policy "store_settings_admin_write" on public.store_settings
  for all using (public.has_admin_role(array['super_admin','admin']))
  with check (public.has_admin_role(array['super_admin','admin']));

create policy "wishlists_own" on public.wishlists
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "webhook_events_admin_only" on public.webhook_events
  for select using (public.has_admin_role(array['super_admin','admin']));


-- =============================================================================

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


-- =============================================================================

-- =============================================================================
-- KAMORA — Production-Oriented Initial Seed Data
-- Contains flagship product catalog, size guides, dynamic offers, Indian
-- shipping zones, responsible FAQs, and editorial guides.
-- ZERO fake customer reviews, ZERO fake orders, ZERO fabricated claims.
-- =============================================================================

-- 1. Store Settings
insert into public.store_settings (
  setting_key, brand_name, tagline, support_email, support_phone, whatsapp_number,
  business_legal_name, business_address, gstin, gst_inclusive_pricing,
  default_gst_rate_bps, currency, timezone, cod_enabled, cod_max_order_paise,
  free_shipping_threshold_paise, default_shipping_charge_paise, return_window_days,
  store_live, social_links, seo_defaults
) values (
  'default',
  'Kamora',
  'Move Freely. Live Fully.',
  'support@kamora.in',
  '+91 98765 43210',
  '919876543210',
  'Kamora Wellness Private Limited',
  'Indiranagar, Bengaluru, Karnataka 560038, India',
  '29AABCK1234F1Z5',
  true,
  1200,
  'INR',
  'Asia/Kolkata',
  true,
  1000000,
  149900,
  9900,
  7,
  true,
  '{"instagram":"https://instagram.com/kamorawellness","facebook":"https://facebook.com/kamorawellness","youtube":"https://youtube.com/@kamorawellness"}'::jsonb,
  '{"title":"Kamora — Premium Adjustable Back Support Belt | Everyday Lumbar Comfort","description":"Thoughtfully designed adjustable back support belt for everyday movement, posture support, and breathable lumbar comfort across India."}'::jsonb
)
on conflict (setting_key) do nothing;

-- 2. Announcements
insert into public.announcements (message, link_label, link_href, is_active, sort_order)
values
  ('Exclusive Launch Offer: Complete Back Comfort Kit with Complimentary Storage Pouch & Digital Fit Guide', 'View Offer', '/products/back-support-belt#comfort-kit', true, 1),
  ('Free Shipping across India on eligible orders above ₹1,499', 'Shop Now', '/products/back-support-belt', true, 2),
  ('Need sizing help? Chat with Kamora Care on WhatsApp', 'Contact Us', '/contact', true, 3)
on conflict do nothing;

-- 3. Homepage Banners (Dynamically manageable from /admin/content)
insert into public.banners (slot, eyebrow, headline, subheadline, primary_cta_label, primary_cta_href, secondary_cta_label, secondary_cta_href, image_url, image_alt, is_active)
values
  (
    'hero',
    'KAMORA LUMBAR SERIES',
    'Move Freely. Live Fully.',
    'Thoughtfully designed back support for everyday movement, comfort and confidence.',
    'Discover Your Support',
    '/products/back-support-belt',
    'Explore the Benefits',
    '#benefits',
    '/images/hero-belt.jpg',
    'Kamora Premium Adjustable Back Support Belt on minimalist studio pedestal',
    true
  ),
  (
    'final_cta',
    'EVERYDAY LUMBAR COMFORT',
    'Make Comfort Part of Your Everyday.',
    'Engineered with breathable knit fabric and dual-tension adjustment for calm, reliable lower-back support.',
    'Shop the Back Support Belt',
    '/products/back-support-belt',
    'Check Your Size',
    '/products/back-support-belt#size-guide',
    '/images/belt-lifestyle.jpg',
    'Adult wearing the Kamora Adjustable Back Support Belt during everyday movement',
    true
  )
on conflict (slot) do nothing;

-- 4. Flagship Product: Premium Adjustable Back Support Belt
with inserted_product as (
  insert into public.products (
    slug, name, subtitle, short_description, description,
    mrp_paise, sale_price_paise, gst_rate_bps, hsn_code,
    material_info, care_instructions, usage_recommendations,
    specifications, whats_included, status, is_flagship,
    seo_title, seo_description
  ) values (
    'back-support-belt',
    'Kamora Adjustable Back Support Belt',
    'Dual-Tension Ergonomic Lumbar Support for Everyday Comfort',
    'A thoughtfully engineered, breathable lower-back support belt with contoured rear stays and dual-pull adjustable compression designed for daily movement, desk work, travel, and light activity.',
    'Designed specifically for everyday Indian climates and active routines, the Kamora Adjustable Back Support Belt pairs a lightweight perforated air-mesh body with contoured flexible lumbar stays. Its dual-pull side tension straps let you fine-tune support smoothly without bulk under everyday clothing.',
    349900,
    249900,
    1200,
    '90211000',
    'Perforated breathable nylon-spandex air-mesh exterior, soft brushed cotton-blend inner lining, contoured polypropylene ergonomic stays, and low-profile micro-hook fastening.',
    'Hand wash cold with mild liquid detergent. Close hook-and-loop fasteners before washing. Do not bleach, wring, iron, or tumble dry. Dry flat in shade.',
    'Wear over a thin breathable cotton layer during work, commuting, household chores, or walks. Start with 1–2 hours daily and adjust tension for comfortable support without restricting normal breathing. Consult a qualified healthcare professional if you have an acute spinal injury, post-surgical recovery needs, or persistent pain.',
    '[
      {"label":"Support Type","value":"Contoured Lumbar & Lower-Back Support"},
      {"label":"Compression System","value":"Dual-Pull Adjustable Elastic Side Straps"},
      {"label":"Internal Stays","value":"4 Flexible Contoured Ergonomic Support Stays"},
      {"label":"Fabric","value":"Breathable Perforated Air-Mesh with Soft Inner Lining"},
      {"label":"Rear Panel Height","value":"21 cm (8.25 in) Ergonomic Lumbar Coverage"},
      {"label":"Fastening","value":"Low-Profile Micro-Hook & Loop (Snag-Resistant)"},
      {"label":"Suitable Climate","value":"All-Season Breathable Indian Weather Design"},
      {"label":"Country of Origin","value":"India"}
    ]'::jsonb,
    '[
      {"title":"1x Kamora Adjustable Back Support Belt","detail":"Selected size with dual-pull compression straps"},
      {"title":"1x Complimentary Breathable Storage Pouch","detail":"Included with the Complete Back Comfort Kit"},
      {"title":"1x Digital Fit & Everyday Usage Guide","detail":"Instant access with sizing, posture, and care instructions"}
    ]'::jsonb,
    'published',
    true,
    'Kamora Adjustable Back Support Belt | Breathable Everyday Lumbar Support India',
    'Shop the Kamora Adjustable Back Support Belt in India. Breathable air-mesh, dual-tension compression, ergonomic lumbar support, and easy size selection.'
  )
  on conflict (slug) do update set updated_at = now()
  returning id
)
-- 5. Variants (S, M, L, XL, XXL)
, inserted_variants as (
  insert into public.product_variants (
    product_id, sku, size_code, size_label,
    waist_min_inches, waist_max_inches, waist_min_cm, waist_max_cm,
    mrp_paise, sale_price_paise, weight_grams, is_active, sort_order
  )
  select
    p.id, v.sku, v.size_code, v.size_label,
    v.wmin_in, v.wmax_in, v.wmin_cm, v.wmax_cm,
    349900, 249900, v.weight, true, v.ord
  from inserted_product p
  cross join (values
    ('KMR-BSB-S',   'S',   'Small (26–30 in)',         26.0, 30.0,  66.0,  76.0, 310, 1),
    ('KMR-BSB-M',   'M',   'Medium (30–34 in)',        30.1, 34.0,  76.5,  86.5, 330, 2),
    ('KMR-BSB-L',   'L',   'Large (34–38 in)',         34.1, 38.0,  86.6,  96.5, 350, 3),
    ('KMR-BSB-XL',  'XL',  'Extra Large (38–42 in)',   38.1, 42.0,  96.6, 106.5, 370, 4),
    ('KMR-BSB-XXL', 'XXL', '2X Large (42–48 in)',      42.1, 48.0, 106.6, 122.0, 395, 5)
  ) as v(sku, size_code, size_label, wmin_in, wmax_in, wmin_cm, wmax_cm, weight, ord)
  on conflict (sku) do update set updated_at = now()
  returning id, size_code
)
-- 6. Initial Inventory per Variant
insert into public.inventory (variant_id, stock_on_hand, stock_reserved, low_stock_threshold, allow_backorder)
select id, 60, 0, 10, false from inserted_variants
on conflict (variant_id) do nothing;

-- 7. Size Guides
insert into public.product_size_guides (
  product_id, size_code, size_label,
  waist_min_inches, waist_max_inches, waist_min_cm, waist_max_cm,
  belt_length_cm, fit_note, sort_order
)
select
  p.id, g.code, g.label, g.min_in, g.max_in, g.min_cm, g.max_cm, g.len_cm, g.note, g.ord
from public.products p
cross join (values
  ('S',   'Small',       26.0, 30.0,  66.0,  76.0,  88.0, 'Snug contour for slender waists. Measure around the navel.', 1),
  ('M',   'Medium',      30.1, 34.0,  76.5,  86.5,  96.0, 'Most popular fit for everyday desk and travel support.', 2),
  ('L',   'Large',       34.1, 38.0,  86.6,  96.5, 106.0, 'Balanced compression with generous side-strap overlap.', 3),
  ('XL',  'Extra Large', 38.1, 42.0,  96.6, 106.5, 116.0, 'Extended wrap length for comfortable full-day adjustability.', 4),
  ('XXL', '2X Large',    42.1, 48.0, 106.6, 122.0, 128.0, 'If you are between two sizes, choose the larger size for comfort.', 5)
) as g(code, label, min_in, max_in, min_cm, max_cm, len_cm, note, ord)
where p.slug = 'back-support-belt'
on conflict (product_id, size_code) do nothing;

-- 8. Product Images
insert into public.product_images (product_id, url, alt_text, caption, image_type, is_primary, sort_order)
select p.id, img.url, img.alt, img.cap, img.itype, img.prim, img.ord
from public.products p
cross join (values
  ('/images/hero-belt.jpg',      'Kamora Adjustable Back Support Belt front studio view', 'Contoured Lumbar Architecture', 'hero', true, 1),
  ('/images/belt-detail.jpg',    'Close-up of breathable air-mesh and dual-pull adjustable fastening straps', 'Breathable Air-Mesh & Dual-Pull Straps', 'detail', false, 2),
  ('/images/belt-lifestyle.jpg', 'Adult wearing the Kamora Adjustable Back Support Belt comfortably at home', 'Discreet Everyday Wearability', 'lifestyle', false, 3),
  ('/images/comfort-kit.jpg',    'Complete Back Comfort Kit with back support belt, storage pouch, and usage guide', 'The Complete Back Comfort Kit', 'kit', false, 4)
) as img(url, alt, cap, itype, prim, ord)
where p.slug = 'back-support-belt'
on conflict do nothing;

-- 9. Product Features (Editable via Admin)
insert into public.product_features (product_id, icon_name, title, description, sort_order, is_active)
select p.id, f.icon, f.title, f.descr, f.ord, true
from public.products p
cross join (values
  ('sliders-horizontal', 'Adjustable Compression', 'Dual-pull elastic tension straps let you fine-tune firm or gentle lumbar support in seconds as your activity changes.', 1),
  ('shield-check', 'Supportive Lumbar Design', 'Four contoured flexible stays mirror the natural lower-back curve to encourage steady posture without rigid bulk.', 2),
  ('wind', 'Breathable Construction', 'Lightweight perforated air-mesh promotes continuous airflow so the belt stays comfortable even in warm Indian weather.', 3),
  ('move', 'Flexible Everyday Fit', 'Tapered front panel sits smoothly around the waist so you can sit, stand, walk, and bend naturally.', 4),
  ('sparkles', 'Easy-to-Wear Design', 'Smooth low-profile micro-hook closures fasten securely without snagging everyday shirts, kurtas, or activewear.', 5),
  ('sun', 'Everyday Support', 'Thoughtfully balanced for work-from-home desks, daily commutes, household routines, and light evening walks.', 6)
) as f(icon, title, descr, ord)
where p.slug = 'back-support-belt'
on conflict do nothing;

-- 10. Dynamic Offers: Complete Back Comfort Kit & Family Comfort Add-On
with kit_offer as (
  insert into public.offers (
    code, name, campaign_type, headline, description, badge_text, cta_text,
    discount_type, discount_value, min_quantity, min_order_paise,
    free_shipping, is_active, sort_order
  ) values (
    'COMPLETE_COMFORT_KIT',
    'The Complete Back Comfort Kit',
    'bundle_kit',
    'Everything You Need for a More Comfortable Everyday Routine.',
    'Includes one Kamora Adjustable Back Support Belt at exclusive launch pricing, a complimentary breathable storage pouch, our digital fit & usage guide, and free shipping across India.',
    'EXCLUSIVE LAUNCH OFFER',
    'Get Your Comfort Kit',
    'fixed_paise',
    0,
    1,
    149900,
    true,
    true,
    1
  )
  on conflict (code) do update set updated_at = now()
  returning id
)
insert into public.offer_items (offer_id, item_title, item_description, item_type, value_paise, is_included, sort_order)
select k.id, i.title, i.descr, i.itype, i.val, true, i.ord
from kit_offer k
cross join (values
  ('Kamora Adjustable Back Support Belt', 'Dual-tension ergonomic lumbar support in your chosen size', 'primary_product', 349900, 1),
  ('Complimentary Premium Storage Pouch', 'Tailored matte-obsidian woven travel and drawer pouch', 'complimentary', 39900, 2),
  ('Complimentary Digital Fit & Usage Guide', 'Step-by-step sizing, wearing, and care handbook', 'digital_guide', 29900, 3),
  ('Free Shipping Across India', 'Complimentary standard delivery on eligible orders', 'shipping_benefit', 9900, 4)
) as i(title, descr, itype, val, ord)
on conflict do nothing;

insert into public.offers (
  code, name, campaign_type, headline, description, badge_text, cta_text,
  discount_type, discount_value, min_quantity, min_order_paise,
  free_shipping, is_active, sort_order
) values (
  'FAMILY_COMFORT_ADDON',
  'Family Comfort Add-On',
  'second_unit_addon',
  'Add a Second Belt for a Family Member — Save ₹400 on Unit 2.',
  'Automatically applied in your cart whenever you order 2 or more belts (any combination of sizes). Ideal for parents, partners, or keeping a spare for travel.',
  'OPTIONAL QUANTITY SAVINGS',
  'Add Second Belt & Save',
  'fixed_paise',
  40000,
  2,
  0,
  true,
  true,
  2
)
on conflict (code) do nothing;

-- 11. Sample Launch Coupons (Admin can edit/disable anytime)
insert into public.coupons (
  code, description, discount_type, discount_value, min_order_paise,
  max_discount_paise, usage_limit, per_customer_limit, is_active
) values
  ('WELCOME150', '₹150 off on orders above ₹2,000', 'fixed_paise', 15000, 200000, 15000, 1000, 1, true),
  ('KAMORA10', '10% launch discount (up to ₹350)', 'percentage', 10, 149900, 35000, 1000, 1, true)
on conflict (code) do nothing;

-- 12. Shipping Zones across India (PIN code prefix matching)
insert into public.shipping_zones (
  name, pincode_prefixes, states, shipping_charge_paise,
  free_shipping_threshold_paise, cod_available, cod_fee_paise,
  estimated_min_days, estimated_max_days, is_serviceable, is_active
) values
  (
    'Metro Cities (Bengaluru, Mumbai, Delhi NCR, Chennai, Hyderabad, Kolkata, Pune)',
    array['11','12','20','40','41','50','56','60','70'],
    array['Delhi','Maharashtra','Karnataka','Tamil Nadu','Telangana','West Bengal','Haryana','Uttar Pradesh'],
    7900, 149900, true, 0, 2, 4, true, true
  ),
  (
    'Major Tier-1 & Tier-2 Cities',
    array['13','14','16','22','28','30','38','39','45','46','52','53','62','64','68','75','80'],
    array['Gujarat','Rajasthan','Punjab','Madhya Pradesh','Kerala','Andhra Pradesh','Odisha','Bihar','Chandigarh'],
    9900, 149900, true, 0, 3, 5, true, true
  ),
  (
    'Rest of India',
    array['1','2','3','4','5','6','7','8'],
    array['All Other Indian States'],
    11900, 149900, true, 4900, 4, 7, true, true
  ),
  (
    'North-East & Island Territories',
    array['78','79','74','19'],
    array['Assam','Meghalaya','Manipur','Mizoram','Nagaland','Tripura','Arunachal Pradesh','Sikkim','Andaman & Nicobar','Jammu & Kashmir','Ladakh'],
    14900, 249900, false, 0, 5, 9, true, true
  )
on conflict (name) do nothing;

-- 13. Responsible FAQs (Editable via Admin)
insert into public.faqs (category, question, answer, show_on_home, show_on_product, is_active, sort_order)
values
  ('Product', 'What is the Kamora Adjustable Back Support Belt designed for?', 'The belt is designed to provide gentle, customizable lower-back support and posture awareness during everyday routines such as desk work, commuting, household chores, and light walking. It is a wellness support accessory and is not intended to diagnose, treat, or cure medical spinal conditions.', true, true, true, 1),
  ('Sizing', 'How do I choose my correct size?', 'Measure around the widest part of your waist near the navel using a flexible measuring tape while standing relaxed. Compare your measurement in inches or centimetres with our interactive Size Guide. If you fall between two sizes, we recommend choosing the larger size for comfortable adjustability.', true, true, true, 2),
  ('Usage', 'How do I wear the belt properly?', 'Position the contoured rear panel squarely over your lower back, wrap the primary waist band snugly across your abdomen, and then pull both outer side tension straps forward to set your preferred compression level. Wear over a light cotton T-shirt or inner layer.', true, true, true, 3),
  ('Care', 'How should I clean and maintain the belt?', 'Fasten all hook-and-loop tabs before washing. Gently hand wash in cool water using mild detergent, rinse thoroughly, and lay flat to dry in the shade. Avoid machine washing, bleach, ironing, or direct high heat.', true, true, true, 4),
  ('Usage', 'How long should I wear the belt each day?', 'Most customers start with 1 to 2 hours at a time during activities that challenge lower-back comfort and adjust based on personal comfort. Avoid wearing the belt while sleeping unless specifically advised by a qualified healthcare professional.', true, true, true, 5),
  ('Usage', 'Can I wear it while working at a desk or travelling?', 'Yes. The slim front profile and breathable perforated air-mesh are specifically designed so the belt stays comfortable while seated at an office desk, driving, or travelling.', true, true, true, 6),
  ('Offers', 'What is included in the Complete Back Comfort Kit?', 'The Complete Back Comfort Kit includes one Kamora Adjustable Back Support Belt in your chosen size, a complimentary breathable storage pouch, instant access to our digital fit & usage guide, and free standard shipping on eligible orders.', true, true, true, 7),
  ('Payments', 'What payment methods are available?', 'We accept major Indian credit and debit cards via Stripe, other payment methods enabled on our verified merchant account, and Cash on Delivery (COD) for eligible PIN codes across India.', true, true, true, 8),
  ('Shipping', 'How long does delivery take in India?', 'Orders are typically dispatched within 24–48 business hours. Metro cities generally receive delivery in 2–4 business days, while most other Indian PIN codes receive delivery in 3–7 business days. Enter your PIN code on the product page for an exact zone estimate.', true, true, true, 9),
  ('Returns', 'What is your return and size exchange policy?', 'We offer a straightforward 7-day return and size exchange window from the date of delivery for unused items in original packaging with all tags intact. Contact our support team with your order number to initiate a quick exchange or refund.', true, true, true, 10)
on conflict do nothing;

-- 14. Educational Knowledge Hub Articles
insert into public.blog_posts (
  slug, title, excerpt, content_markdown, cover_image_url, category,
  author_name, read_time_minutes, seo_title, seo_description, is_published, published_at
) values
  (
    'understanding-everyday-lumbar-support',
    'Understanding Everyday Lumbar Support: How Adjustable Compression Works',
    'Learn how gentle, customizable lower-back support complements healthy movement habits during long workdays and travel.',
    E'## Why Lower-Back Comfort Matters in Everyday Life\n\nBetween long desk hours, daily commutes, and household routines, our lumbar spine handles continuous load throughout the day. While regular movement and core conditioning remain foundational for long-term back health, a well-fitted adjustable back support belt can serve as a practical companion during demanding stretches.\n\n## How Dual-Tension Compression Helps\n\nUnlike rigid braces that restrict natural movement, an everyday adjustable lumbar belt combines:\n\n- **Contoured rear support stays** that follow the gentle curve of the lower back.\n- **Breathable air-mesh construction** suited for warm, humid Indian climates.\n- **Dual side-pull straps** that let you loosen tension while seated and add gentle firmness while standing or walking.\n\n## Responsible Usage Note\n\nA back support belt is designed for everyday comfort and posture awareness. If you experience persistent, radiating, or acute pain, always consult an orthopedic specialist or physiotherapist for personalized medical guidance.',
    '/images/belt-lifestyle.jpg',
    'Lumbar Care',
    'Kamora Wellness Editorial',
    4,
    'Understanding Everyday Lumbar Support | Kamora Journal',
    'Discover how adjustable dual-tension back support works and how to integrate it responsibly into everyday movement.',
    true,
    now() - interval '12 days'
  ),
  (
    'how-to-measure-and-fit-your-back-support-belt',
    'How to Measure Your Waist and Fit a Back Support Belt Properly',
    'A practical step-by-step guide to measuring accurately at home and adjusting strap tension for all-day comfort.',
    E'## Step 1: Measure Around the Navel — Not Your Trouser Size\n\nTrouser waist sizes vary widely across brands and typically sit lower than your lumbar curve. Stand relaxed, exhale normally, and wrap a flexible measuring tape horizontally around your waist at navel level.\n\n## Step 2: Position the Rear Panel Correctly\n\nCentre the contoured rear panel over the curve of your lower back so the lower edge sits comfortably above the hips. It should never press uncomfortably into your ribs or dig into your thighs when seated.\n\n## Step 3: Fine-Tune Dual Tension\n\nFasten the inner main band snugly first, then pull both outer elastic straps forward evenly. The ideal tension feels supportive and reassuring while allowing you to breathe deeply and move smoothly.',
    '/images/belt-detail.jpg',
    'Sizing & Fit',
    'Kamora Wellness Editorial',
    3,
    'How to Measure & Fit a Back Support Belt | Kamora Journal',
    'Step-by-step instructions to choose the right back support belt size and wear it comfortably every day.',
    true,
    now() - interval '7 days'
  ),
  (
    'everyday-posture-habits-for-desk-and-travel',
    'Five Simple Posture Habits for Long Desk Days and Commutes',
    'Small ergonomic adjustments you can combine with mindful breaks to keep your lower back feeling fresh.',
    E'## 1. Reset Every 45 Minutes\n\nEven the best ergonomic chair cannot replace periodic movement. Stand up, roll your shoulders gently, and walk for two minutes every 45–60 minutes.\n\n## 2. Keep Screens at Eye Level\n\nRaise laptops onto a stand so your chin stays neutral rather than sloping forward, which shifts load down the entire spine.\n\n## 3. Ground Both Feet Flat\n\nKeep knees roughly level with hips and feet flat on the floor or a footrest to stabilize your pelvis.\n\n## 4. Support Your Lumbar Curve During Travel\n\nLong drives and flights often flatten the natural lower-back curve. Wearing a breathable, low-profile lumbar support belt can help maintain comfortable alignment on longer journeys.\n\n## 5. Care for Your Support Gear\n\nKeep your belt fresh by wearing it over a clean cotton layer and hand-washing periodically in cool water.',
    '/images/comfort-kit.jpg',
    'Everyday Wellness',
    'Kamora Wellness Editorial',
    4,
    'Everyday Posture Habits for Desk & Travel | Kamora Journal',
    'Practical posture habits and travel tips to support everyday lower-back comfort.',
    true,
    now() - interval '3 days'
  )
on conflict (slug) do nothing;

-- 15. Grant Super Admin role to kamoraind@gmail.com
insert into public.profiles (id, email, full_name, auth_provider)
select id, email, coalesce(raw_user_meta_data->>'full_name', 'Kamora Admin'), 'email'
from auth.users
where lower(email) = 'kamoraind@gmail.com'
on conflict (id) do update set email = excluded.email, updated_at = now();

insert into public.admin_users (user_id, role, is_active)
select id, 'super_admin'::public.admin_role, true
from auth.users
where lower(email) = 'kamoraind@gmail.com'
on conflict (user_id) do update set role = 'super_admin'::public.admin_role, is_active = true;

