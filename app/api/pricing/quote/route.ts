import { NextResponse } from 'next/server';
import { getActiveOffers, getShippingZones, getStoreSettings } from '@/lib/data/storefront';
import { calculateOrderPricing, matchShippingZone } from '@/lib/pricing/engine';
import { createAdminSupabaseClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import { INITIAL_VARIANTS, INITIAL_PRODUCT } from '@/lib/data/initial-catalog';
import type { Coupon, PaymentMethod } from '@/types/database';

const SEEDED_FALLBACK_COUPONS: Record<string, Coupon> = {
  WELCOME150: {
    id: 'seed-welcome150',
    code: 'WELCOME150',
    description: '₹150 off on orders above ₹2,000',
    discount_type: 'fixed_paise',
    discount_value: 15000,
    min_order_paise: 200000,
    max_discount_paise: 15000,
    usage_limit: 1000,
    per_customer_limit: 1,
    usage_count: 0,
    starts_at: null,
    expires_at: null,
    is_active: true,
  },
  KAMORA10: {
    id: 'seed-kamora10',
    code: 'KAMORA10',
    description: '10% launch discount (up to ₹350)',
    discount_type: 'percentage',
    discount_value: 10,
    min_order_paise: 149900,
    max_discount_paise: 35000,
    usage_limit: 1000,
    per_customer_limit: 1,
    usage_count: 0,
    starts_at: null,
    expires_at: null,
    is_active: true,
  },
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      items?: { variant_id: string; quantity: number }[];
      coupon_code?: string;
      pincode?: string;
      payment_method?: PaymentMethod;
    };

    const requestedItems = Array.isArray(body.items) ? body.items : [];
    const [offers, zones, settings] = await Promise.all([
      getActiveOffers(),
      getShippingZones(),
      getStoreSettings(),
    ]);

    // Authoritative server-side price lookup (DB first, graceful fallback to seeded catalog if tables not migrated yet)
    const pricedLines: {
      quantity: number;
      unit_mrp_paise: number;
      unit_price_paise: number;
      gst_rate_bps: number;
    }[] = [];

    let dbVariants:
      | {
          id: string;
          mrp_paise: number;
          sale_price_paise: number;
          product: { gst_rate_bps?: number } | { gst_rate_bps?: number }[] | null;
        }[]
      | null = null;

    if (isServiceRoleConfigured() && requestedItems.length > 0) {
      try {
        const admin = createAdminSupabaseClient();
        const variantIds = requestedItems.map((i) => i.variant_id);
        const { data, error } = await admin
          .from('product_variants')
          .select('id, mrp_paise, sale_price_paise, product:products(gst_rate_bps)')
          .in('id', variantIds)
          .eq('is_active', true);

        if (!error && data && data.length > 0) {
          dbVariants = data;
        }
      } catch {
        dbVariants = null;
      }
    }

    for (const reqItem of requestedItems) {
      const qty = Math.min(20, Math.max(1, Math.floor(reqItem.quantity)));
      const dbMatch = dbVariants?.find((row) => row.id === reqItem.variant_id);

      if (dbMatch) {
        const prod = Array.isArray(dbMatch.product) ? dbMatch.product[0] : dbMatch.product;
        pricedLines.push({
          quantity: qty,
          unit_mrp_paise: dbMatch.mrp_paise,
          unit_price_paise: dbMatch.sale_price_paise,
          gst_rate_bps: prod?.gst_rate_bps ?? settings.default_gst_rate_bps,
        });
        continue;
      }

      // Fallback match by variant ID or default flagship belt price so subtotal is NEVER ₹0
      const fallbackVariant =
        INITIAL_VARIANTS.find((row) => row.id === reqItem.variant_id) ?? INITIAL_VARIANTS[0]!;
      pricedLines.push({
        quantity: qty,
        unit_mrp_paise: fallbackVariant.mrp_paise,
        unit_price_paise: fallbackVariant.sale_price_paise,
        gst_rate_bps: INITIAL_PRODUCT.gst_rate_bps,
      });
    }

    // Validate coupon against DB (with fallback to seeded coupons if DB tables not yet created)
    let coupon: Coupon | null = null;
    let couponMessage: string | null = null;
    const rawCode = (body.coupon_code ?? '').trim().toUpperCase();

    if (rawCode) {
      let checkedDb = false;
      if (isServiceRoleConfigured()) {
        try {
          const admin = createAdminSupabaseClient();
          const { data: couponRow, error } = await admin
            .from('coupons')
            .select('*')
            .eq('code', rawCode)
            .maybeSingle();

          if (!error) {
            checkedDb = true;
            if (!couponRow || !couponRow.is_active) {
              couponMessage = `Coupon "${rawCode}" is invalid or inactive.`;
            } else {
              coupon = couponRow as Coupon;
            }
          }
        } catch {
          checkedDb = false;
        }
      }

      if (!checkedDb) {
        const seeded = SEEDED_FALLBACK_COUPONS[rawCode];
        if (seeded) {
          coupon = seeded;
        } else {
          couponMessage = `Coupon "${rawCode}" was not found. Try WELCOME150 or KAMORA10.`;
        }
      }
    }

    const shippingZone = body.pincode ? matchShippingZone(body.pincode, zones) : null;

    const pricing = calculateOrderPricing({
      items: pricedLines,
      activeOffers: offers,
      coupon,
      shippingZone,
      settings,
      paymentMethod: body.payment_method,
    });

    if (rawCode && coupon && !pricing.applied_coupon) {
      couponMessage = `Coupon "${rawCode}" requires a minimum order of ₹${(coupon.min_order_paise / 100).toLocaleString('en-IN')} or has expired.`;
    }

    return NextResponse.json({
      pricing,
      shipping_zone: shippingZone
        ? {
            name: shippingZone.name,
            estimated_min_days: shippingZone.estimated_min_days,
            estimated_max_days: shippingZone.estimated_max_days,
            cod_available: shippingZone.cod_available && settings.cod_enabled,
            cod_fee_paise: shippingZone.cod_fee_paise,
          }
        : null,
      coupon_message: couponMessage,
    });
  } catch (err) {
    console.error('[POST /api/pricing/quote]', err);
    return NextResponse.json({ error: 'Unable to calculate order pricing' }, { status: 500 });
  }
}
