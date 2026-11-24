import 'server-only';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';

/**
 * Idempotently marks an order paid, deducts reserved inventory exactly once,
 * records coupon redemption, and queues confirmation notification.
 */
export async function finalizePaidOrder(params: {
  orderId: string;
  provider: 'razorpay' | 'stripe';
  providerSessionId?: string | null;
  providerPaymentId?: string | null;
  methodDetails?: Record<string, unknown>;
}) {
  const admin = createAdminSupabaseClient();

  const { data: order } = await admin
    .from('orders')
    .select(
      'id, order_number, user_id, customer_email, inventory_deducted, applied_coupon_code, coupon_discount_paise, payment_status'
    )
    .eq('id', params.orderId)
    .maybeSingle();

  if (!order || order.payment_status === 'paid') {
    return { alreadyPaid: true, orderNumber: order?.order_number ?? null };
  }

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
      ...(params.providerPaymentId
        ? { provider_payment_intent_id: params.providerPaymentId }
        : {}),
      ...(params.providerSessionId
        ? { provider_session_id: params.providerSessionId }
        : {}),
      ...(params.methodDetails ? { method_details: params.methodDetails } : {}),
    })
    .eq('order_id', order.id);

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
    body: `Your ${params.provider.toUpperCase()} payment for order ${order.order_number} is confirmed.`,
    status: 'queued',
  });

  return { alreadyPaid: false, orderNumber: order.order_number };
}

/**
 * Releases reserved stock and cancels an unpaid pending order cleanly.
 */
export async function failPendingOrder(orderId: string, reason: string) {
  const admin = createAdminSupabaseClient();
  const { data: order } = await admin
    .from('orders')
    .select('id, payment_status, inventory_deducted')
    .eq('id', orderId)
    .maybeSingle();

  if (!order || order.payment_status === 'paid' || order.payment_status === 'failed') {
    return;
  }

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
