'use client';

import * as React from 'react';
import {
  CheckCircle2,
  Circle,
  Package,
  Search,
  Truck,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/card';
import { formatISTDateTime, formatPaise } from '@/lib/utils/format';

interface TrackedOrder {
  order_number: string;
  order_status: string;
  payment_status: string;
  payment_method: string;
  total_paise: number;
  created_at: string;
  city: string | null;
  state: string | null;
  pincode: string | null;
  items: { product_name: string; variant_label: string; quantity: number; line_total_paise: number }[];
  shipment: {
    courier_name: string | null;
    tracking_number: string | null;
    tracking_url: string | null;
    shipment_status: string;
    estimated_delivery_date: string | null;
  } | null;
}

const STEPS = [
  { key: 'pending', label: 'Order Placed' },
  { key: 'confirmed', label: 'Payment Confirmed' },
  { key: 'processing', label: 'Processing & Packing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'out_for_delivery', label: 'Out for Delivery' },
  { key: 'delivered', label: 'Delivered' },
];

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState('');
  const [order, setOrder] = React.useState<TrackedOrder | null>(null);

  async function handleTrack(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setOrder(null);
    setLoading(true);

    try {
      const res = await fetch('/api/orders/track', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_number: orderNumber, phone }),
      });
      const data = (await res.json()) as { order?: TrackedOrder; error?: string };
      if (!res.ok || !data.order) {
        setError(data.error ?? 'Order not found.');
      } else {
        setOrder(data.order);
      }
    } catch {
      setError('Network error while checking order status.');
    } finally {
      setLoading(false);
    }
  }

  const currentIndex = order
    ? STEPS.findIndex((s) => s.key === order.order_status)
    : -1;
  const isCancelledOrReturned =
    order?.order_status === 'cancelled' || order?.order_status === 'returned';

  return (
    <div className="bg-[#FAFAF8] py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <div className="text-center">
          <Badge variant="default">Order Status</Badge>
          <h1 className="mt-3 font-heading text-3xl font-bold text-[#11151B]">
            Track Your Kamora Order
          </h1>
          <p className="mt-2 text-sm text-[#5C636E]">
            Enter your Kamora order number and registered Indian mobile number to view live
            fulfilment updates.
          </p>
        </div>

        <form
          onSubmit={handleTrack}
          className="mt-8 rounded-[22px] border border-[#E6E3DC] bg-white p-6 shadow-soft sm:p-8"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="track-order-id" className="mb-1.5 block text-xs font-semibold text-[#11151B]">
                Order Number
              </label>
              <Input
                id="track-order-id"
                required
                value={orderNumber}
                onChange={(e) => setOrderNumber(e.target.value)}
                placeholder="e.g. KMR-261124-123456"
              />
            </div>
            <div>
              <label htmlFor="track-phone" className="mb-1.5 block text-xs font-semibold text-[#11151B]">
                Registered Mobile Number
              </label>
              <Input
                id="track-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91 98765 43210"
              />
            </div>
          </div>

          {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}

          <Button
            type="submit"
            variant="primary"
            size="lg"
            className="mt-5 w-full"
            disabled={loading}
          >
            <Search className="h-4 w-4" />
            {loading ? 'Looking Up Order...' : 'Track Order Status'}
          </Button>
        </form>

        {order && (
          <div className="mt-8 rounded-[22px] border border-[#E6E3DC] bg-white p-6 shadow-soft sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#E6E3DC] pb-5">
              <div>
                <p className="text-xs text-[#5C636E]">Order Number</p>
                <p className="font-heading text-xl font-bold text-[#11151B]">
                  {order.order_number}
                </p>
                <p className="mt-1 text-xs text-[#5C636E]">
                  Placed {formatISTDateTime(order.created_at)}
                  {order.city ? ` · Delivering to ${order.city}, ${order.pincode}` : ''}
                </p>
              </div>
              <div className="text-right">
                <Badge
                  variant={
                    isCancelledOrReturned
                      ? 'danger'
                      : order.order_status === 'delivered'
                      ? 'success'
                      : 'default'
                  }
                >
                  {order.order_status.replaceAll('_', ' ').toUpperCase()}
                </Badge>
                <p className="mt-1.5 font-heading text-base font-bold text-[#11151B]">
                  {formatPaise(order.total_paise)}
                </p>
              </div>
            </div>

            {/* Timeline */}
            {isCancelledOrReturned ? (
              <div className="mt-6 flex items-center gap-3 rounded-[14px] border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
                <XCircle className="h-5 w-5 shrink-0" />
                This order has been marked as <strong>{order.order_status}</strong>. Contact
                Kamora Care if you need refund or exchange assistance.
              </div>
            ) : (
              <ol className="mt-6 space-y-4">
                {STEPS.map((step, idx) => {
                  const done = idx <= currentIndex;
                  return (
                    <li key={step.key} className="flex items-center gap-3.5">
                      {done ? (
                        <CheckCircle2 className="h-5 w-5 shrink-0 text-[#1C3D5A]" />
                      ) : (
                        <Circle className="h-5 w-5 shrink-0 text-[#D9E6EF]" />
                      )}
                      <span
                        className={`text-sm ${
                          done ? 'font-semibold text-[#11151B]' : 'text-[#5C636E]'
                        }`}
                      >
                        {step.label}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            {/* Shipment Tracking (Only real admin-entered courier details — never fabricated) */}
            {order.shipment?.tracking_number && (
              <div className="mt-6 rounded-[16px] border border-[#E6E3DC] bg-[#F2F0EB]/60 p-4 text-sm">
                <p className="flex items-center gap-2 font-semibold text-[#11151B]">
                  <Truck className="h-4 w-4 text-[#1C3D5A]" />
                  Courier Details
                </p>
                <p className="mt-1 text-xs text-[#5C636E]">
                  Courier: <strong className="text-[#11151B]">{order.shipment.courier_name ?? 'Assigned Partner'}</strong>{' '}
                  · Tracking ID:{' '}
                  <strong className="text-[#11151B]">{order.shipment.tracking_number}</strong>
                </p>
                {order.shipment.tracking_url && (
                  <a
                    href={order.shipment.tracking_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[#1C3D5A] hover:underline"
                  >
                    Open Courier Tracking <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
            )}

            {/* Items */}
            <div className="mt-6 border-t border-[#E6E3DC] pt-5">
              <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#5C636E]">
                <Package className="h-3.5 w-3.5 text-[#1C3D5A]" />
                Order Items
              </p>
              <ul className="mt-3 space-y-2 text-sm">
                {order.items.map((item, i) => (
                  <li key={i} className="flex justify-between">
                    <span className="text-[#11151B]">
                      {item.product_name} ({item.variant_label}) × {item.quantity}
                    </span>
                    <span className="font-medium text-[#11151B]">
                      {formatPaise(item.line_total_paise)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
