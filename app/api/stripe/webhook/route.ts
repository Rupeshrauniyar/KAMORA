import { NextResponse } from 'next/server';
import type Stripe from 'stripe';
import { getStripeClient } from '@/lib/payments/provider';
import { createAdminSupabaseClient, isServiceRoleConfigured } from '@/lib/supabase/admin';

/**
 * Authoritative Stripe Webhook Endpoint.
 * - Verifies cryptographic webhook signature via STRIPE_WEBHOOK_SECRET.
 * - Enforces idempotent event deduplication via public.webhook_events.
 * - Confirms paid orders and deducts reserved stock ONLY on verified payment events.
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret || !isServiceRoleConfigured()) {
    return NextResponse.json(
      { error: 'Webhook endpoint is not fully configured.' },
      { status: 503 }
    );
  }

  const signature = request.headers.get('stripe-signature');
  if (!signature) {
    return NextResponse.json({ error: 'Missing stripe-signature header.' }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;

  try {
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error('[Stripe Webhook] Signature verification failed:', err);
    return NextResponse.json({ error: 'Invalid webhook signature.' }, { status: 400 });
  }

  const admin = createAdminSupabaseClient();

  // Deduplicate event IDs to guarantee idempotency across retries
  const { error: dedupErr } = await admin.from('webhook_events').insert({
    provider: 'stripe',
    event_id: event.id,
    event_type: event.type,
    payload: event.data.object as unknown as Record<string, unknown>,
  });

  if (dedupErr) {
    // Unique violation (23505) means we already processed this exact Stripe event
    if (dedupErr.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }
    console.error('[Stripe Webhook] Failed to record event:', dedupErr);
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id ?? session.client_reference_id;
        if (!orderId) break;

        if (session.payment_status === 'paid') {
          await finalizePaidOrder(
            admin,
            orderId,
            session.id,
            typeof session.payment_intent === 'string'
              ? session.payment_intent
              : session.payment_intent?.id ?? null
          );
        }
        break;
      }

      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.order_id;
        if (orderId) {
          await finalizePaidOrder(admin, orderId, null, pi.id);
        }
        break;
      }

      case 'checkout.session.expired': {
        const session = event.data.object as Stripe.Checkout.Session;
        const orderId = session.metadata?.order_id ?? session.client_reference_id;
        if (orderId) {
          await handleFailedPayment(admin, orderId, 'Checkout session expired');
        }
        break;
      }

      case 'payment_intent.payment_failed': {
        const pi = event.data.object as Stripe.PaymentIntent;
        const orderId = pi.metadata?.order_id;
        if (orderId) {
          await handleFailedPayment(
            admin,
            orderId,
            pi.last_payment_error?.message ?? 'Payment failed'
          );
        }
        break;
      }

      case 'charge.refunded': {
        const charge = event.data.object as Stripe.Charge;
        const paymentIntentId =
          typeof charge.payment_intent === 'string'
            ? charge.payment_intent
            : charge.payment_intent?.id;

        if (paymentIntentId) {
          const { data: payment } = await admin
            .from('payments')
            .select('id, order_id, amount_paise')
            .eq('provider_payment_intent_id', paymentIntentId)
            .maybeSingle();

          if (payment) {
            const fullRefund = charge.amount_refunded >= payment.amount_paise;
            const nextStatus = fullRefund ? 'refunded' : 'partially_refunded';

            await admin
              .from('payments')
              .update({ status: nextStatus })
              .eq('id', payment.id);

            await admin
              .from('orders')
              .update({ payment_status: nextStatus })
              .eq('id', payment.order_id);
          }
        }
        break;
      }

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[Stripe Webhook] Processing error:', err);
    return NextResponse.json({ error: 'Webhook handler error' }, { status: 500 });
  }
}

async function finalizePaidOrder(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  orderId: string,
  sessionId: string | null,
  paymentIntentId: string | null
) {
  const { data: order } = await admin
    .from('orders')
    .select(
      'id, order_number, user_id, customer_email, inventory_deducted, applied_coupon_code, coupon_discount_paise, payment_status'
    )
    .eq('id', orderId)
    .maybeSingle();

  if (!order || order.payment_status === 'paid') return;

  await admin
    .from('orders')
    .update({
      payment_status: 'paid',
      order_status: 'confirmed',
      inventory_deducted: true,
    })
    .eq('id', order.id);

  await admin
    .from('payments')
    .update({
      status: 'paid',
      paid_at: new Date().toISOString(),
      ...(paymentIntentId ? { provider_payment_intent_id: paymentIntentId } : {}),
      ...(sessionId ? { provider_session_id: sessionId } : {}),
    })
    .eq('order_id', order.id);

  // Confirm inventory deduction once
  if (!order.inventory_deducted) {
    const { data: items } = await admin
      .from('order_items')
      .select('variant_id, quantity')
      .eq('order_id', order.id);

    for (const item of items ?? []) {
      if (item.variant_id) {
        await admin.rpc('confirm_order_inventory', {
          p_variant_id: item.variant_id,
          p_quantity: item.quantity,
          p_order_id: order.id,
          p_from_reservation: true,
        });
      }
    }
  }

  // Record coupon redemption if used
  if (order.applied_coupon_code) {
    const { data: coupon } = await admin
      .from('coupons')
      .select('id, usage_count')
      .eq('code', order.applied_coupon_code)
      .maybeSingle();

    if (coupon) {
      await admin.from('coupon_redemptions').upsert(
        {
          coupon_id: coupon.id,
          order_id: order.id,
          user_id: order.user_id,
          customer_email: order.customer_email,
          discount_paise: order.coupon_discount_paise,
        },
        { onConflict: 'coupon_id,order_id' }
      );
      await admin
        .from('coupons')
        .update({ usage_count: coupon.usage_count + 1 })
        .eq('id', coupon.id);
    }
  }

  await admin.from('notifications').insert({
    user_id: order.user_id,
    order_id: order.id,
    channel: 'email',
    event_type: 'payment_confirmed',
    recipient: order.customer_email,
    subject: `Payment Confirmed — Kamora Order ${order.order_number}`,
    body: `We have received your payment for order ${order.order_number}.`,
    status: 'queued',
  });
}

async function handleFailedPayment(
  admin: ReturnType<typeof createAdminSupabaseClient>,
  orderId: string,
  reason: string
) {
  const { data: order } = await admin
    .from('orders')
    .select('id, payment_status, inventory_deducted')
    .eq('id', orderId)
    .maybeSingle();

  if (!order || order.payment_status === 'paid') return;

  await admin
    .from('orders')
    .update({
      payment_status: 'failed',
      order_status: 'cancelled',
      cancelled_at: new Date().toISOString(),
    })
    .eq('id', order.id);

  await admin
    .from('payments')
    .update({ status: 'failed', failure_reason: reason })
    .eq('order_id', order.id);

  if (!order.inventory_deducted) {
    const { data: items } = await admin
      .from('order_items')
      .select('variant_id, quantity')
      .eq('order_id', order.id);

    for (const item of items ?? []) {
      if (item.variant_id) {
        await admin.rpc('release_inventory_reservation', {
          p_variant_id: item.variant_id,
          p_quantity: item.quantity,
          p_order_id: order.id,
        });
      }
    }
  }
}
