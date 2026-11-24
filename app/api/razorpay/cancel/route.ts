import { NextResponse } from 'next/server';
import { isServiceRoleConfigured } from '@/lib/supabase/admin';
import { failPendingOrder } from '@/lib/payments/order-finalizer';

/**
 * Releases reserved stock if the user closes the Razorpay modal without paying.
 */
export async function POST(request: Request) {
  if (!isServiceRoleConfigured()) {
    return NextResponse.json({ ok: true });
  }
  try {
    const body = (await request.json()) as { internal_order_id?: string };
    if (body.internal_order_id) {
      await failPendingOrder(body.internal_order_id, 'Customer dismissed Razorpay modal');
    }
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
