import { NextResponse } from 'next/server';
import { trackOrderSchema } from '@/lib/validation/schemas';
import { createAdminSupabaseClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import { normalizeIndianPhone } from '@/lib/utils/format';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = trackOrderSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message ?? 'Invalid tracking input.' },
        { status: 400 }
      );
    }

    if (!isServiceRoleConfigured()) {
      return NextResponse.json(
        { error: 'Order tracking requires a connected Supabase database.' },
        { status: 503 }
      );
    }

    const normalizedPhone = normalizeIndianPhone(parsed.data.phone);
    const admin = createAdminSupabaseClient();

    const { data: order } = await admin
      .from('orders')
      .select(
        `
        id, order_number, order_status, payment_status, payment_method,
        total_paise, created_at, updated_at, delivered_at, cancelled_at,
        customer_phone,
        shipping_address,
        items:order_items(product_name, variant_label, quantity, line_total_paise),
        shipments(courier_name, tracking_number, tracking_url, shipment_status, estimated_delivery_date, dispatched_at, delivered_at, tracking_events)
      `
      )
      .ilike('order_number', parsed.data.order_number.trim())
      .maybeSingle();

    if (!order || normalizeIndianPhone(order.customer_phone) !== normalizedPhone) {
      return NextResponse.json(
        { error: 'No matching order found for that order number and mobile number.' },
        { status: 404 }
      );
    }

    const shipment = Array.isArray(order.shipments) ? order.shipments[0] ?? null : order.shipments;

    return NextResponse.json({
      order: {
        order_number: order.order_number,
        order_status: order.order_status,
        payment_status: order.payment_status,
        payment_method: order.payment_method,
        total_paise: order.total_paise,
        created_at: order.created_at,
        delivered_at: order.delivered_at,
        cancelled_at: order.cancelled_at,
        city: (order.shipping_address as { city?: string })?.city ?? null,
        state: (order.shipping_address as { state?: string })?.state ?? null,
        pincode: (order.shipping_address as { pincode?: string })?.pincode ?? null,
        items: order.items ?? [],
        shipment,
      },
    });
  } catch (err) {
    console.error('[POST /api/orders/track]', err);
    return NextResponse.json({ error: 'Unable to look up order status.' }, { status: 500 });
  }
}
