import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import { verifyRazorpayWebhookSignature } from '@/lib/payments/razorpay';
import { failPendingOrder, finalizePaidOrder } from '@/lib/payments/order-finalizer';

/**
 * Authoritative Razorpay Webhook Endpoint (for Production & ngrok test forwarding).
 * Verifies X-Razorpay-Signature via RAZORPAY_WEBHOOK_SECRET and deduplicates events.
 */
export async function POST(request: Request) {
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!webhookSecret || !isServiceRoleConfigured()) {
    return NextResponse.json(
      { error: 'Razorpay webhook secret or database service role not configured.' },
      { status: 503 }
    );
  }

  const signature = request.headers.get('x-razorpay-signature');
  const eventId = request.headers.get('x-razorpay-event-id');
  if (!signature) {
    return NextResponse.json({ error: 'Missing x-razorpay-signature header.' }, { status: 400 });
  }

  const rawBody = await request.text();
  if (!verifyRazorpayWebhookSignature(rawBody, signature, webhookSecret)) {
    return NextResponse.json({ error: 'Invalid Razorpay webhook signature.' }, { status: 400 });
  }

  const payload = JSON.parse(rawBody) as {
    event: string;
    payload?: {
      payment?: {
        entity?: {
          id: string;
          order_id: string;
          method?: string;
          amount: number;
          error_description?: string;
          notes?: { internal_order_id?: string };
        };
      };
      refund?: {
        entity?: {
          id: string;
          payment_id: string;
          amount: number;
          status: string;
        };
      };
    };
  };

  const admin = createAdminSupabaseClient();

  if (eventId) {
    const { error: dedupErr } = await admin.from('webhook_events').insert({
      provider: 'razorpay',
      event_id: eventId,
      event_type: payload.event,
      payload: payload as unknown as Record<string, unknown>,
    });

    if (dedupErr?.code === '23505') {
      return NextResponse.json({ received: true, duplicate: true });
    }
  }

  try {
    const payEntity = payload.payload?.payment?.entity;

    if (
      (payload.event === 'payment.captured' || payload.event === 'order.paid') &&
      payEntity?.order_id
    ) {
      const { data: paymentRow } = await admin
        .from('payments')
        .select('order_id')
        .eq('provider_session_id', payEntity.order_id)
        .maybeSingle();

      const internalOrderId =
        paymentRow?.order_id ?? payEntity.notes?.internal_order_id;

      if (internalOrderId) {
        await finalizePaidOrder({
          orderId: internalOrderId,
          provider: 'razorpay',
          providerSessionId: payEntity.order_id,
          providerPaymentId: payEntity.id,
          methodDetails: { razorpay_method: payEntity.method },
        });
      }
    } else if (payload.event === 'payment.failed' && payEntity?.order_id) {
      const { data: paymentRow } = await admin
        .from('payments')
        .select('order_id')
        .eq('provider_session_id', payEntity.order_id)
        .maybeSingle();

      if (paymentRow?.order_id) {
        await failPendingOrder(
          paymentRow.order_id,
          payEntity.error_description ?? 'Razorpay payment failed'
        );
      }
    } else if (payload.event === 'refund.processed') {
      const refundEntity = payload.payload?.refund?.entity;
      if (refundEntity?.payment_id) {
        const { data: paymentRow } = await admin
          .from('payments')
          .select('id, order_id, amount_paise')
          .eq('provider_payment_intent_id', refundEntity.payment_id)
          .maybeSingle();

        if (paymentRow) {
          const nextStatus =
            refundEntity.amount >= paymentRow.amount_paise
              ? 'refunded'
              : 'partially_refunded';
          await admin
            .from('payments')
            .update({ status: nextStatus })
            .eq('id', paymentRow.id);
          await admin
            .from('orders')
            .update({ payment_status: nextStatus })
            .eq('id', paymentRow.order_id);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (err) {
    console.error('[POST /api/razorpay/webhook]', err);
    return NextResponse.json({ error: 'Webhook processing error.' }, { status: 500 });
  }
}
