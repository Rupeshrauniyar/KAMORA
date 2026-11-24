import { NextResponse } from 'next/server';
import { checkoutFormSchema } from '@/lib/validation/schemas';
import { createServerSupabaseClient, isSupabaseConfigured } from '@/lib/supabase/server';
import { createAdminSupabaseClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import { getActiveOffers, getShippingZones, getStoreSettings } from '@/lib/data/storefront';
import { calculateOrderPricing, matchShippingZone } from '@/lib/pricing/engine';
import { getActivePaymentProvider } from '@/lib/payments/provider';
import {
  createRazorpayOrder,
  getRazorpayKeyId,
  isRazorpayConfigured,
} from '@/lib/payments/razorpay';
import { generateOrderNumber, normalizeIndianPhone } from '@/lib/utils/format';
import { ensureUserProfile } from '@/lib/auth/ensure-profile';
import type { Coupon } from '@/types/database';

export async function POST(request: Request) {
  if (!isSupabaseConfigured() || !isServiceRoleConfigured()) {
    return NextResponse.json(
      {
        error:
          'Checkout requires configured Supabase credentials in .env.local. Orders and payments are never simulated.',
      },
      { status: 503 }
    );
  }

  try {
    const rawBody = (await request.json()) as Record<string, unknown>;
    const parsed = checkoutFormSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json(
        {
          error: parsed.error.issues[0]?.message ?? 'Please check your checkout details.',
          issues: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const requestedItems = Array.isArray(rawBody.items)
      ? (rawBody.items as { variant_id: string; quantity: number }[])
      : [];

    if (requestedItems.length === 0) {
      return NextResponse.json({ error: 'Your shopping bag is empty.' }, { status: 400 });
    }

    const idempotencyKey =
      typeof rawBody.idempotency_key === 'string' && rawBody.idempotency_key.length >= 8
        ? rawBody.idempotency_key
        : null;

    const admin = createAdminSupabaseClient();

    // Idempotency check
    if (idempotencyKey) {
      const { data: existingOrder } = await admin
        .from('orders')
        .select('id, order_number, payment_method, payment_status, total_paise, customer_name, customer_email, customer_phone')
        .eq('idempotency_key', idempotencyKey)
        .maybeSingle();

      if (existingOrder) {
        if (existingOrder.payment_method === 'cod' || existingOrder.payment_status === 'paid') {
          return NextResponse.json({
            order_number: existingOrder.order_number,
            redirect_url: `/order-success?order=${encodeURIComponent(existingOrder.order_number)}`,
          });
        }

        const { data: existingPay } = await admin
          .from('payments')
          .select('provider, provider_session_id')
          .eq('order_id', existingOrder.id)
          .maybeSingle();

        if (existingPay?.provider === 'razorpay' && existingPay.provider_session_id) {
          return NextResponse.json({
            provider: 'razorpay',
            internal_order_id: existingOrder.id,
            order_number: existingOrder.order_number,
            razorpay: {
              key_id: getRazorpayKeyId(),
              order_id: existingPay.provider_session_id,
              amount_paise: existingOrder.total_paise,
              currency: 'INR',
              name: 'Kamora',
              description: `Kamora Order ${existingOrder.order_number}`,
              prefill: {
                name: existingOrder.customer_name,
                email: existingOrder.customer_email,
                contact: existingOrder.customer_phone,
              },
            },
          });
        }
      }
    }

    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const [offers, zones, settings] = await Promise.all([
      getActiveOffers(),
      getShippingZones(),
      getStoreSettings(),
    ]);

    const shippingZone = matchShippingZone(input.pincode, zones);
    if (!shippingZone || !shippingZone.is_serviceable) {
      return NextResponse.json(
        { error: `PIN code ${input.pincode} is currently not serviceable.` },
        { status: 400 }
      );
    }

    const variantIds = requestedItems.map((i) => i.variant_id);
    const { data: variants } = await admin
      .from('product_variants')
      .select('*, product:products(id, name, slug, gst_rate_bps, status)')
      .in('id', variantIds)
      .eq('is_active', true);

    if (!variants || variants.length === 0) {
      return NextResponse.json(
        { error: 'Selected product size is unavailable. Ensure supabase/seed.sql has been executed.' },
        { status: 400 }
      );
    }

    const orderItemsPayload: {
      product_id: string;
      variant_id: string;
      product_name: string;
      variant_label: string;
      sku: string;
      quantity: number;
      unit_mrp_paise: number;
      unit_price_paise: number;
      line_total_paise: number;
      gst_rate_bps: number;
    }[] = [];

    for (const reqItem of requestedItems) {
      const variant = variants.find((v) => v.id === reqItem.variant_id);
      const product = variant
        ? Array.isArray(variant.product)
          ? variant.product[0]
          : variant.product
        : null;

      if (!variant || !product || product.status !== 'published') {
        return NextResponse.json(
          { error: 'One or more items in your bag are no longer available.' },
          { status: 400 }
        );
      }

      const qty = Math.min(20, Math.max(1, Math.floor(reqItem.quantity)));
      orderItemsPayload.push({
        product_id: product.id,
        variant_id: variant.id,
        product_name: product.name,
        variant_label: variant.size_label,
        sku: variant.sku,
        quantity: qty,
        unit_mrp_paise: variant.mrp_paise,
        unit_price_paise: variant.sale_price_paise,
        line_total_paise: variant.sale_price_paise * qty,
        gst_rate_bps: product.gst_rate_bps,
      });
    }

    const normalizedPhone = normalizeIndianPhone(input.phone);
    const customerEmail =
      input.email && input.email.trim().length > 0
        ? input.email.trim().toLowerCase()
        : `${normalizedPhone.replace(/\D/g, '')}@express.kamora.in`;

    // Validate coupon
    let coupon: Coupon | null = null;
    const rawCoupon = (input.coupon_code ?? '').trim().toUpperCase();
    if (rawCoupon) {
      const { data: couponRow } = await admin
        .from('coupons')
        .select('*')
        .eq('code', rawCoupon)
        .eq('is_active', true)
        .maybeSingle();

      if (couponRow) {
        const { count: usedByCustomer } = await admin
          .from('coupon_redemptions')
          .select('*', { count: 'exact', head: true })
          .eq('coupon_id', couponRow.id)
          .eq('customer_email', customerEmail);

        if ((usedByCustomer ?? 0) < couponRow.per_customer_limit) {
          coupon = couponRow as Coupon;
        }
      }
    }

    const pricing = calculateOrderPricing({
      items: orderItemsPayload.map((item) => ({
        quantity: item.quantity,
        unit_mrp_paise: item.unit_mrp_paise,
        unit_price_paise: item.unit_price_paise,
        gst_rate_bps: item.gst_rate_bps,
      })),
      activeOffers: offers,
      coupon,
      shippingZone,
      settings,
      paymentMethod: input.payment_method,
    });

    const isCod = input.payment_method === 'cod';
    const isRazorpay =
      !isCod &&
      (input.payment_method.startsWith('razorpay') ||
        (process.env.PAYMENT_PROVIDER ?? '').toLowerCase() === 'razorpay');

    if (isCod) {
      if (!settings.cod_enabled || !shippingZone.cod_available) {
        return NextResponse.json(
          { error: 'Cash on Delivery is not available for this PIN code.' },
          { status: 400 }
        );
      }
      if (pricing.total_paise > settings.cod_max_order_paise) {
        return NextResponse.json(
          { error: 'Order exceeds maximum limit for Cash on Delivery.' },
          { status: 400 }
        );
      }
    } else if (isRazorpay) {
      if (!isRazorpayConfigured()) {
        return NextResponse.json(
          {
            error:
              'Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are not configured in .env.local.',
          },
          { status: 503 }
        );
      }
    } else {
      const stripeProvider = getActivePaymentProvider();
      if (!stripeProvider.isConfigured()) {
        return NextResponse.json(
          { error: 'Stripe credentials are not configured in .env.local.' },
          { status: 503 }
        );
      }
    }

    // Ensure a matching public.profiles row exists before any FK-linked inserts
    const hasProfile = user
      ? await ensureUserProfile(user, {
          full_name: input.full_name,
          email: customerEmail,
          phone: normalizedPhone,
        })
      : false;
    const orderUserId = user && hasProfile ? user.id : null;

    if (orderUserId && input.save_address) {
      await admin.from('user_addresses').insert({
        user_id: orderUserId,
        label: 'Checkout Address',
        full_name: input.full_name,
        phone: normalizedPhone,
        address_line1: input.address_line1,
        address_line2: input.address_line2 || null,
        landmark: input.landmark || null,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        country: 'India',
      });
    }

    // Reserve stock transactionally (row-locked)
    const reservedItems: { variant_id: string; quantity: number }[] = [];
    for (const item of orderItemsPayload) {
      const { data: reserved, error: reserveErr } = await admin.rpc('reserve_inventory', {
        p_variant_id: item.variant_id,
        p_quantity: item.quantity,
        p_order_id: null,
        p_actor: user?.id ?? null,
      });

      if (reserveErr || !reserved) {
        for (const r of reservedItems) {
          await admin.rpc('release_inventory_reservation', {
            p_variant_id: r.variant_id,
            p_quantity: r.quantity,
          });
        }
        return NextResponse.json(
          {
            error: `Insufficient stock for ${item.variant_label}. Please adjust quantity and try again.`,
          },
          { status: 409 }
        );
      }
      reservedItems.push({ variant_id: item.variant_id, quantity: item.quantity });
    }

    const orderNumber = generateOrderNumber();
    // Map cleanly to existing PostgreSQL payment_method enum ('cod', 'stripe_card', 'stripe_upi', 'external')
    const dbPaymentMethod = isCod
      ? 'cod'
      : isRazorpay
      ? 'external'
      : input.payment_method;

    const { data: order, error: orderErr } = await admin
      .from('orders')
      .insert({
        order_number: orderNumber,
        idempotency_key: idempotencyKey,
        user_id: orderUserId,
        customer_name: input.full_name,
        customer_email: customerEmail,
        customer_phone: normalizedPhone,
        shipping_address: {
          full_name: input.full_name,
          email: customerEmail,
          phone: normalizedPhone,
          address_line1: input.address_line1,
          address_line2: input.address_line2 || undefined,
          landmark: input.landmark || undefined,
          city: input.city,
          state: input.state,
          pincode: input.pincode,
          country: 'India',
        },
        currency: 'INR',
        subtotal_paise: pricing.subtotal_paise,
        offer_discount_paise: pricing.offer_discount_paise,
        coupon_discount_paise: pricing.coupon_discount_paise,
        shipping_paise: pricing.shipping_paise + pricing.cod_fee_paise,
        tax_paise: pricing.tax_paise,
        total_paise: pricing.total_paise,
        applied_offer_codes: pricing.applied_offers.map((o) => o.code),
        applied_coupon_code: pricing.applied_coupon?.code ?? null,
        payment_method: dbPaymentMethod,
        payment_status: isCod ? 'cod_pending_collection' : 'pending_payment',
        order_status: isCod ? 'confirmed' : 'pending',
        inventory_deducted: isCod,
        customer_notes: input.customer_notes || null,
      })
      .select('id, order_number')
      .single();

    if (orderErr || !order) {
      for (const r of reservedItems) {
        await admin.rpc('release_inventory_reservation', {
          p_variant_id: r.variant_id,
          p_quantity: r.quantity,
        });
      }
      return NextResponse.json(
        { error: orderErr?.message ?? 'Could not create order.' },
        { status: 500 }
      );
    }

    await admin.from('order_items').insert(
      orderItemsPayload.map((item) => ({
        order_id: order.id,
        ...item,
      }))
    );

    if (isCod) {
      for (const r of reservedItems) {
        await admin.rpc('confirm_order_inventory', {
          p_variant_id: r.variant_id,
          p_quantity: r.quantity,
          p_order_id: order.id,
          p_from_reservation: true,
        });
      }

      if (coupon && pricing.applied_coupon) {
        await admin.from('coupon_redemptions').insert({
          coupon_id: coupon.id,
          order_id: order.id,
          user_id: orderUserId,
          customer_email: customerEmail,
          discount_paise: pricing.applied_coupon.discount_paise,
        });
        await admin
          .from('coupons')
          .update({ usage_count: coupon.usage_count + 1 })
          .eq('id', coupon.id);
      }

      await admin.from('payments').insert({
        order_id: order.id,
        provider: 'cod',
        amount_paise: pricing.total_paise,
        currency: 'INR',
        status: 'cod_pending_collection',
      });

      return NextResponse.json({
        provider: 'cod',
        order_number: order.order_number,
        redirect_url: `/order-success?order=${encodeURIComponent(order.order_number)}`,
      });
    }

    // RAZORPAY TEST / LIVE ORDER CREATION
    if (isRazorpay) {
      try {
        const rzpOrder = await createRazorpayOrder({
          amountPaise: pricing.total_paise,
          receipt: order.order_number,
          notes: {
            internal_order_id: order.id,
            order_number: order.order_number,
            preferred_method: input.payment_method,
          },
        });

        await admin.from('payments').insert({
          order_id: order.id,
          provider: 'razorpay',
          provider_session_id: rzpOrder.id,
          amount_paise: pricing.total_paise,
          currency: 'INR',
          status: 'pending_payment',
          method_details: { requested_method: input.payment_method },
        });

        return NextResponse.json({
          provider: 'razorpay',
          internal_order_id: order.id,
          order_number: order.order_number,
          razorpay: {
            key_id: getRazorpayKeyId(),
            order_id: rzpOrder.id,
            amount_paise: rzpOrder.amount,
            currency: rzpOrder.currency,
            name: settings.brand_name,
            description: `Order ${order.order_number}`,
            prefill: {
              name: input.full_name,
              email: customerEmail,
              contact: normalizedPhone,
            },
            preferred_method: input.payment_method === 'razorpay_upi' ? 'upi' : 'card',
          },
        });
      } catch (rzpErr) {
        for (const r of reservedItems) {
          await admin.rpc('release_inventory_reservation', {
            p_variant_id: r.variant_id,
            p_quantity: r.quantity,
            p_order_id: order.id,
          });
        }
        await admin
          .from('orders')
          .update({ payment_status: 'failed', order_status: 'cancelled' })
          .eq('id', order.id);

        console.error('[Razorpay Order Error]', rzpErr);
        return NextResponse.json(
          {
            error:
              rzpErr instanceof Error
                ? rzpErr.message
                : 'Unable to initialize Razorpay order.',
          },
          { status: 502 }
        );
      }
    }

    // STRIPE CHECKOUT FALLBACK
    const stripeProvider = getActivePaymentProvider();
    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';
    try {
      const session = await stripeProvider.createCheckoutSession({
        orderId: order.id,
        orderNumber: order.order_number,
        customerEmail,
        customerName: input.full_name,
        customerPhone: normalizedPhone,
        amountPaise: pricing.total_paise,
        lineItems: orderItemsPayload.map((item) => ({
          name: `${item.product_name} (${item.variant_label})`,
          unitAmountPaise: item.unit_price_paise,
          quantity: item.quantity,
        })),
        shippingPaise: pricing.shipping_paise,
        discountPaise: pricing.offer_discount_paise + pricing.coupon_discount_paise,
        successUrl: `${appUrl}/order-success?order=${encodeURIComponent(order.order_number)}&session_id={CHECKOUT_SESSION_ID}`,
        cancelUrl: `${appUrl}/checkout?cancelled=true&order=${encodeURIComponent(order.order_number)}`,
        preferredMethod: input.payment_method as 'stripe_card' | 'stripe_upi',
      });

      await admin.from('payments').insert({
        order_id: order.id,
        provider: session.provider,
        provider_session_id: session.sessionId,
        provider_payment_intent_id: session.paymentIntentId,
        amount_paise: pricing.total_paise,
        currency: 'INR',
        status: 'pending_payment',
      });

      return NextResponse.json({
        provider: 'stripe',
        order_number: order.order_number,
        checkout_url: session.checkoutUrl,
      });
    } catch (stripeErr) {
      for (const r of reservedItems) {
        await admin.rpc('release_inventory_reservation', {
          p_variant_id: r.variant_id,
          p_quantity: r.quantity,
          p_order_id: order.id,
        });
      }
      await admin
        .from('orders')
        .update({ payment_status: 'failed', order_status: 'cancelled' })
        .eq('id', order.id);

      return NextResponse.json(
        {
          error:
            stripeErr instanceof Error
              ? stripeErr.message
              : 'Unable to initiate Stripe payment session.',
        },
        { status: 502 }
      );
    }
  } catch (err) {
    console.error('[POST /api/checkout]', err);
    return NextResponse.json({ error: 'Unexpected checkout error.' }, { status: 500 });
  }
}
