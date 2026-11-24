import { NextResponse } from 'next/server';
import { createAdminSupabaseClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import {
  captureRazorpayPayment,
  fetchRazorpayPayment,
  verifyRazorpayPaymentSignature,
} from '@/lib/payments/razorpay';
import { finalizePaidOrder } from '@/lib/payments/order-finalizer';

/**
 * Cryptographically verifies Razorpay Checkout completion on the server:
 * 1. Validates HMAC-SHA256 signature using RAZORPAY_KEY_SECRET (timing-safe).
 * 2. Fetches authoritative payment status & amount directly from Razorpay API.
 * 3. Captures authorized test/live payments if not already auto-captured.
 * 4. Marks order paid & deducts inventory idempotently.
 */
export async function POST(request: Request) {
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ error: 'Server database not configured.' }, { status: 503 });
  }

  try {
    const body = (await request.json()) as {
      internal_order_id?: string;
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };

    if (
      !body.internal_order_id ||
      !body.razorpay_order_id ||
      !body.razorpay_payment_id ||
      !body.razorpay_signature
    ) {
      return NextResponse.json(
        { error: 'Missing required Razorpay payment verification parameters.' },
        { status: 400 }
      );
    }

    // 1. Cryptographic HMAC signature check
    const signatureValid = verifyRazorpayPaymentSignature({
      razorpayOrderId: body.razorpay_order_id,
      razorpayPaymentId: body.razorpay_payment_id,
      razorpaySignature: body.razorpay_signature,
    });

    if (!signatureValid) {
      return NextResponse.json(
        { error: 'Invalid Razorpay payment signature.' },
        { status: 400 }
      );
    }

    const admin = createAdminSupabaseClient();
    const { data: paymentRow } = await admin
      .from('payments')
      .select('id, order_id, provider_session_id, amount_paise')
      .eq('order_id', body.internal_order_id)
      .eq('provider', 'razorpay')
      .maybeSingle();

    if (!paymentRow || paymentRow.provider_session_id !== body.razorpay_order_id) {
      return NextResponse.json(
        { error: 'Razorpay order ID does not match this Kamora order.' },
        { status: 400 }
      );
    }

    // 2. Independently verify live payment state with Razorpay API
    let rzpPayment = await fetchRazorpayPayment(body.razorpay_payment_id);

    if (
      rzpPayment.order_id !== body.razorpay_order_id ||
      rzpPayment.amount !== paymentRow.amount_paise
    ) {
      return NextResponse.json(
        { error: 'Payment amount or order mismatch detected during server verification.' },
        { status: 400 }
      );
    }

    if (rzpPayment.status === 'authorized') {
      rzpPayment = await captureRazorpayPayment(
        rzpPayment.id,
        paymentRow.amount_paise
      );
    }

    if (rzpPayment.status !== 'captured') {
      return NextResponse.json(
        {
          error:
            rzpPayment.error_description ??
            `Payment is not captured (current status: ${rzpPayment.status}).`,
        },
        { status: 402 }
      );
    }

    // 3. Finalize order & deduct reserved inventory idempotently
    const result = await finalizePaidOrder({
      orderId: body.internal_order_id,
      provider: 'razorpay',
      providerSessionId: body.razorpay_order_id,
      providerPaymentId: body.razorpay_payment_id,
      methodDetails: {
        razorpay_method: rzpPayment.method,
        captured: rzpPayment.captured,
      },
    });

    return NextResponse.json({
      verified: true,
      order_number: result.orderNumber,
      redirect_url: `/order-success?order=${encodeURIComponent(result.orderNumber ?? '')}`,
    });
  } catch (err) {
    console.error('[POST /api/razorpay/verify]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Payment verification failed.' },
      { status: 500 }
    );
  }
}
