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
