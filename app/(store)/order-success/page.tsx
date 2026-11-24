import Link from 'next/link';
import { CheckCircle2, Clock, MapPin, Package, ArrowRight, Headphones } from 'lucide-react';
import { createAdminSupabaseClient, isServiceRoleConfigured } from '@/lib/supabase/admin';
import { getStoreSettings } from '@/lib/data/storefront';
import { formatISTDateTime, formatPaise } from '@/lib/utils/format';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { ShippingAddress } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function OrderSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderNumber } = await searchParams;
  const settings = await getStoreSettings();

  if (!orderNumber) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-heading text-2xl font-bold text-[#11151B]">No Order Specified</h1>
        <p className="mt-2 text-sm text-[#5C636E]">
          Looking for your recent purchase? Track your order anytime using your order number and
          mobile number.
        </p>
        <Link href="/track-order" className="mt-6 inline-block">
          <Button variant="primary">Track Your Order</Button>
        </Link>
      </div>
    );
  }

  interface OrderSuccessData {
    order_number: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    shipping_address: ShippingAddress;
    total_paise: number;
    payment_method: string;
    payment_status: string;
    order_status: string;
    created_at: string;
    items: {
      product_name: string;
      variant_label: string;
      quantity: number;
      line_total_paise: number;
    }[];
  }

  let order: OrderSuccessData | null = null;

  if (isServiceRoleConfigured()) {
    const admin = createAdminSupabaseClient();
    const { data } = await admin
      .from('orders')
      .select(
        'order_number, customer_name, customer_email, customer_phone, shipping_address, total_paise, payment_method, payment_status, order_status, created_at, items:order_items(product_name, variant_label, quantity, line_total_paise)'
      )
      .eq('order_number', orderNumber)
      .maybeSingle();

    if (data) {
      order = data as unknown as OrderSuccessData;
    }
  }

  if (!order) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <h1 className="font-heading text-2xl font-bold text-[#11151B]">Order Not Found</h1>
        <p className="mt-2 text-sm text-[#5C636E]">
          We could not retrieve order <strong>{orderNumber}</strong>. If you just completed
          payment, please refresh in a few seconds or track it directly.
        </p>
        <Link href="/track-order" className="mt-6 inline-block">
          <Button variant="primary">Go to Order Tracking</Button>
        </Link>
      </div>
    );
  }

  // Strictly distinguish verified paid / COD confirmed vs awaiting webhook confirmation
  const isConfirmed =
    order.payment_status === 'paid' || order.payment_status === 'cod_pending_collection';

  return (
    <div className="bg-[#FAFAF8] py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="rounded-[24px] border border-[#E6E3DC] bg-white p-8 shadow-soft sm:p-10">
          <div className="flex flex-col items-center text-center">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full ${
                isConfirmed
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-[#F2F0EB] text-[#1C3D5A]'
              }`}
            >
              {isConfirmed ? (
                <CheckCircle2 className="h-8 w-8" />
              ) : (
                <Clock className="h-8 w-8" />
              )}
            </div>

            <Badge variant={isConfirmed ? 'success' : 'default'} className="mt-4">
              {order.payment_status === 'paid'
                ? 'Payment Confirmed'
                : order.payment_status === 'cod_pending_collection'
                ? 'COD Order Confirmed'
                : 'Awaiting Payment Webhook Confirmation'}
            </Badge>

            <h1 className="mt-3 font-heading text-3xl font-bold text-[#11151B]">
              {isConfirmed
                ? `Thank You, ${order.customer_name}!`
                : 'We Received Your Checkout Request'}
            </h1>
            <p className="mt-2 max-w-lg text-sm text-[#5C636E]">
              {isConfirmed
                ? `Your order ${order.order_number} is confirmed and queued for careful packing.`
                : `Your order ${order.order_number} is currently verifying payment confirmation from Stripe. Once verified via webhook, your status will update automatically.`}
            </p>
          </div>

          {/* Order Meta Grid */}
          <div className="mt-8 grid gap-4 rounded-[18px] border border-[#E6E3DC] bg-[#FAFAF8] p-5 text-sm sm:grid-cols-3">
            <div>
              <p className="text-xs text-[#5C636E]">Order Number</p>
              <p className="mt-0.5 font-heading font-bold text-[#11151B]">
                {order.order_number}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#5C636E]">Placed On (IST)</p>
              <p className="mt-0.5 font-medium text-[#11151B]">
                {formatISTDateTime(order.created_at)}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#5C636E]">Total Amount</p>
              <p className="mt-0.5 font-heading font-bold text-[#11151B]">
                {formatPaise(order.total_paise)}
              </p>
            </div>
          </div>

          {/* Items */}
          <div className="mt-6">
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-[#11151B]">
              <Package className="h-4 w-4 text-[#1C3D5A]" />
              Items Ordered
            </h2>
            <ul className="mt-3 divide-y divide-[#E6E3DC] rounded-[14px] border border-[#E6E3DC]">
              {order.items.map((item, idx) => (
                <li
                  key={idx}
                  className="flex items-center justify-between px-4 py-3 text-sm"
                >
                  <div>
                    <p className="font-medium text-[#11151B]">{item.product_name}</p>
                    <p className="text-xs text-[#5C636E]">
                      {item.variant_label} × {item.quantity}
                    </p>
                  </div>
                  <span className="font-semibold text-[#11151B]">
                    {formatPaise(item.line_total_paise)}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {/* Delivery Address */}
          <div className="mt-6 rounded-[16px] border border-[#E6E3DC] p-5 text-sm">
            <h2 className="flex items-center gap-2 font-heading text-sm font-semibold text-[#11151B]">
              <MapPin className="h-4 w-4 text-[#1C3D5A]" />
              Delivery Address
            </h2>
            <p className="mt-2 text-[#5C636E]">
              <strong className="text-[#11151B]">{order.shipping_address.full_name}</strong>
              <br />
              {order.shipping_address.address_line1}
              {order.shipping_address.address_line2
                ? `, ${order.shipping_address.address_line2}`
                : ''}
              {order.shipping_address.landmark ? ` (Near ${order.shipping_address.landmark})` : ''}
              <br />
              {order.shipping_address.city}, {order.shipping_address.state} –{' '}
              {order.shipping_address.pincode}
              <br />
              Mobile: {order.customer_phone}
            </p>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-wrap items-center justify-between gap-4 border-t border-[#E6E3DC] pt-6">
            <div className="flex items-center gap-2 text-xs text-[#5C636E]">
              <Headphones className="h-4 w-4 text-[#1C3D5A]" />
              Need assistance? Email{' '}
              <a
                href={`mailto:${settings.support_email}`}
                className="font-semibold text-[#1C3D5A] underline"
              >
                {settings.support_email}
              </a>
            </div>
            <div className="flex gap-3">
              <Link href="/track-order">
                <Button variant="primary">
                  Track Order <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href="/">
                <Button variant="secondary">Back to Store</Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
