import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import crypto from 'crypto';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { createAdminSupabaseClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import { ensureUserProfile } from '@/lib/auth/ensure-profile';
import { INITIAL_IMAGES, INITIAL_PRODUCT, INITIAL_VARIANTS } from '@/lib/data/initial-catalog';
import type { CartLineItem } from '@/types/database';

const CART_COOKIE = 'kamora_cart_sid';

async function getOrCreateSessionToken(): Promise<{ token: string; isNew: boolean }> {
  const cookieStore = await cookies();
  const existing = cookieStore.get(CART_COOKIE)?.value;
  if (existing) return { token: existing, isNew: false };
  return { token: crypto.randomUUID(), isNew: true };
}

function attachCookie(res: NextResponse, token: string, isNew: boolean) {
  if (isNew) {
    res.cookies.set(CART_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return res;
}

async function resolveCartId(createIfMissing: boolean) {
  const { token, isNew } = await getOrCreateSessionToken();
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const db = isServiceRoleConfigured() ? createAdminSupabaseClient() : supabase;

  if (user) {
    const { data: userCart } = await db
      .from('carts')
      .select('id, coupon_code')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (userCart) return { cartId: userCart.id, couponCode: userCart.coupon_code, token, isNew, db };

    if (createIfMissing) {
      await ensureUserProfile(user);
      const { data: created } = await db
        .from('carts')
        .insert({ user_id: user.id, session_token: token })
        .select('id, coupon_code')
        .single();
      return { cartId: created?.id ?? null, couponCode: created?.coupon_code ?? null, token, isNew, db };
    }
    return { cartId: null, couponCode: null, token, isNew, db };
  }

  const { data: guestCart } = await db
    .from('carts')
    .select('id, coupon_code')
    .eq('session_token', token)
    .maybeSingle();

  if (guestCart) return { cartId: guestCart.id, couponCode: guestCart.coupon_code, token, isNew, db };

  if (createIfMissing) {
    const { data: created } = await db
      .from('carts')
      .insert({ session_token: token })
      .select('id, coupon_code')
      .single();
    return { cartId: created?.id ?? null, couponCode: created?.coupon_code ?? null, token, isNew, db };
  }

  return { cartId: null, couponCode: null, token, isNew, db };
}

async function loadCartItems(
  db: ReturnType<typeof createAdminSupabaseClient> | Awaited<ReturnType<typeof createServerSupabaseClient>>,
  cartId: string
): Promise<CartLineItem[]> {
  const { data } = await db
    .from('cart_items')
    .select(
      `
      quantity,
      variant:product_variants (
        id, sku, size_code, size_label, mrp_paise, sale_price_paise,
        inventory (stock_on_hand, stock_reserved)
      ),
      product:products (
        id, slug, name, gst_rate_bps,
        images:product_images (url, is_primary, sort_order)
      )
    `
    )
    .eq('cart_id', cartId)
    .order('created_at', { ascending: true });

  if (!data) return [];

  const items: CartLineItem[] = [];
  for (const row of data) {
    const variant = Array.isArray(row.variant) ? row.variant[0] : row.variant;
    const product = Array.isArray(row.product) ? row.product[0] : row.product;
    if (!variant || !product) continue;

    const inv = Array.isArray(variant.inventory) ? variant.inventory[0] : variant.inventory;
    const avail = Math.max(0, (inv?.stock_on_hand ?? 0) - (inv?.stock_reserved ?? 0));
    const imgs = Array.isArray(product.images) ? product.images : [];
    const primary = imgs.find((i: { is_primary: boolean }) => i.is_primary) ?? imgs[0];

    items.push({
      variant_id: variant.id,
      product_id: product.id,
      product_slug: product.slug,
      product_name: product.name,
      size_code: variant.size_code,
      size_label: variant.size_label,
      sku: variant.sku,
      image_url: primary?.url ?? '/images/hero-belt.jpg',
      quantity: row.quantity,
      unit_mrp_paise: variant.mrp_paise,
      unit_price_paise: variant.sale_price_paise,
      gst_rate_bps: product.gst_rate_bps,
      available_stock: avail,
    });
  }
  return items;
}

export async function GET() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ items: [], coupon_code: null, persisted: false });
  }

  try {
    const { cartId, couponCode, token, isNew, db } = await resolveCartId(false);
    const items = cartId ? await loadCartItems(db, cartId) : [];
    const res = NextResponse.json({ items, coupon_code: couponCode, persisted: true });
    return attachCookie(res, token, isNew);
  } catch (err) {
    console.error('[GET /api/cart]', err);
    return NextResponse.json({ items: [], coupon_code: null, persisted: false });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      variant_id?: string;
      product_id?: string;
      quantity?: number;
    };
    const quantity = Math.min(20, Math.max(1, Math.floor(Number(body.quantity ?? 1))));

    if (!body.variant_id) {
      return NextResponse.json({ error: 'variant_id is required' }, { status: 400 });
    }

    if (!isSupabaseConfigured()) {
      const fallbackVariant = INITIAL_VARIANTS.find((v) => v.id === body.variant_id);
      if (!fallbackVariant) {
        return NextResponse.json({ error: 'Variant not found' }, { status: 404 });
      }
      return NextResponse.json({
        persisted: false,
        items: [
          {
            variant_id: fallbackVariant.id,
            product_id: INITIAL_PRODUCT.id,
            product_slug: INITIAL_PRODUCT.slug,
            product_name: INITIAL_PRODUCT.name,
            size_code: fallbackVariant.size_code,
            size_label: fallbackVariant.size_label,
            sku: fallbackVariant.sku,
            image_url: INITIAL_IMAGES[0]?.url ?? '/images/hero-belt.jpg',
            quantity,
            unit_mrp_paise: fallbackVariant.mrp_paise,
            unit_price_paise: fallbackVariant.sale_price_paise,
            gst_rate_bps: INITIAL_PRODUCT.gst_rate_bps,
            available_stock: fallbackVariant.available_stock ?? 60,
          },
        ],
      });
    }

    const { cartId, token, isNew, db } = await resolveCartId(true);
    if (!cartId) {
      return NextResponse.json({ error: 'Could not initialize cart' }, { status: 500 });
    }

    // Look up authoritative product_id from variant
    const { data: variant } = await db
      .from('product_variants')
      .select('id, product_id')
      .eq('id', body.variant_id)
      .eq('is_active', true)
      .maybeSingle();

    if (!variant) {
      return NextResponse.json({ error: 'Selected size is unavailable' }, { status: 404 });
    }

    const { data: existingItem } = await db
      .from('cart_items')
      .select('id, quantity')
      .eq('cart_id', cartId)
      .eq('variant_id', variant.id)
      .maybeSingle();

    if (existingItem) {
      await db
        .from('cart_items')
        .update({ quantity: Math.min(20, existingItem.quantity + quantity) })
        .eq('id', existingItem.id);
    } else {
      await db.from('cart_items').insert({
        cart_id: cartId,
        product_id: variant.product_id,
        variant_id: variant.id,
        quantity,
      });
    }

    const items = await loadCartItems(db, cartId);
    const res = NextResponse.json({ items, persisted: true });
    return attachCookie(res, token, isNew);
  } catch (err) {
    console.error('[POST /api/cart]', err);
    return NextResponse.json({ error: 'Unable to update cart' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as { variant_id?: string; quantity?: number };
    if (!body.variant_id) {
      return NextResponse.json({ error: 'variant_id is required' }, { status: 400 });
    }
    if (!isSupabaseConfigured()) {
      return NextResponse.json({ persisted: false });
    }

    const { cartId, token, isNew, db } = await resolveCartId(false);
    if (!cartId) {
      return NextResponse.json({ items: [], persisted: true });
    }

    const qty = Math.floor(Number(body.quantity ?? 0));
    if (qty <= 0) {
      await db
        .from('cart_items')
        .delete()
        .eq('cart_id', cartId)
        .eq('variant_id', body.variant_id);
    } else {
      await db
        .from('cart_items')
        .update({ quantity: Math.min(20, qty) })
        .eq('cart_id', cartId)
        .eq('variant_id', body.variant_id);
    }

    const items = await loadCartItems(db, cartId);
    const res = NextResponse.json({ items, persisted: true });
    return attachCookie(res, token, isNew);
  } catch (err) {
    console.error('[PATCH /api/cart]', err);
    return NextResponse.json({ error: 'Unable to update quantity' }, { status: 500 });
  }
}

export async function DELETE() {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ items: [], persisted: false });
  }
  try {
    const { cartId, db } = await resolveCartId(false);
    if (cartId) {
      await db.from('cart_items').delete().eq('cart_id', cartId);
    }
    return NextResponse.json({ items: [], persisted: true });
  } catch (err) {
    console.error('[DELETE /api/cart]', err);
    return NextResponse.json({ error: 'Unable to clear cart' }, { status: 500 });
  }
}
