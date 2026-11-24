'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  ArrowRight,
  CheckCircle2,
  Minus,
  Plus,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Tag,
  Trash2,
} from 'lucide-react';
import { useCart } from '@/components/cart/cart-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/card';
import { formatPaise } from '@/lib/utils/format';
import type { PricingBreakdown } from '@/types/database';

export default function CartPage() {
  const {
    items,
    totalQuantity,
    couponCode,
    setCouponCode,
    updateQuantity,
    removeItem,
    isLoading,
  } = useCart();

  const [couponInput, setCouponInput] = React.useState(couponCode);
  const [couponMessage, setCouponMessage] = React.useState<string | null>(null);
  const [pricing, setPricing] = React.useState<PricingBreakdown | null>(null);
  const [quoting, setQuoting] = React.useState(false);

  const fetchQuote = React.useCallback(
    async (codeToApply: string) => {
      if (items.length === 0) {
        setPricing(null);
        return;
      }
      setQuoting(true);
      try {
        const res = await fetch('/api/pricing/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: items.map((i) => ({ variant_id: i.variant_id, quantity: i.quantity })),
            coupon_code: codeToApply,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            pricing: PricingBreakdown;
            coupon_message?: string | null;
          };
          setPricing(data.pricing);
          setCouponMessage(data.coupon_message ?? null);
        }
      } finally {
        setQuoting(false);
      }
    },
    [items]
  );

  React.useEffect(() => {
    void fetchQuote(couponCode);
  }, [fetchQuote, couponCode]);

  function handleApplyCoupon(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = couponInput.trim().toUpperCase();
    setCouponCode(cleaned);
    void fetchQuote(cleaned);
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-20 text-center text-sm text-[#5C636E]">
        Loading your shopping cart...
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center sm:px-6">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#F2F0EB] text-[#1C3D5A]">
          <ShoppingBag className="h-7 w-7" />
        </div>
        <h1 className="mt-5 font-heading text-3xl font-bold text-[#11151B]">
          Your Cart is Empty
        </h1>
        <p className="mt-2 text-sm text-[#5C636E]">
          Explore the Kamora Adjustable Back Support Belt and select your waist size to enjoy
          the Complete Back Comfort Kit.
        </p>
        <Link href="/products/back-support-belt" className="mt-7 inline-block">
          <Button variant="primary" size="lg">
            Shop Back Support Belt
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-[#FAFAF8] py-12">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Badge variant="default">Shopping Cart</Badge>
            <h1 className="mt-2 font-heading text-3xl font-bold text-[#11151B]">
              Your Comfort Selection ({totalQuantity}{' '}
              {totalQuantity === 1 ? 'Item' : 'Items'})
            </h1>
          </div>
          <Link
            href="/products/back-support-belt"
            className="text-sm font-medium text-[#1C3D5A] hover:underline"
          >
            Continue Shopping
          </Link>
        </div>

        {/* Complete Back Comfort Kit qualification banner */}
        {pricing?.qualifies_for_comfort_kit && (
          <div className="mt-6 flex items-center gap-3 rounded-[16px] border border-[#E6E3DC] bg-[#F2F0EB] px-5 py-3.5 text-sm text-[#11151B]">
            <Sparkles className="h-5 w-5 shrink-0 text-[#B89768]" />
            <p>
              <strong>Complete Back Comfort Kit Unlocked:</strong> Your order includes a
              complimentary breathable storage pouch, digital fit &amp; usage guide, and free
              standard shipping across India.
            </p>
          </div>
        )}

        <div className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start">
          {/* Cart Items List */}
          <div className="space-y-4 lg:col-span-7">
            {items.map((item) => (
              <div
                key={item.variant_id}
                className="flex flex-col gap-4 rounded-[20px] border border-[#E6E3DC] bg-white p-5 shadow-soft sm:flex-row"
              >
                <div className="relative h-28 w-full shrink-0 overflow-hidden rounded-[14px] border border-[#E6E3DC] bg-[#FAFAF8] sm:h-28 sm:w-32">
                  <Image
                    src={item.image_url}
                    alt={item.product_name}
                    fill
                    sizes="128px"
                    className="object-cover"
                  />
                </div>

                <div className="flex flex-1 flex-col justify-between">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/products/${item.product_slug}`}
                        className="font-heading text-base font-semibold text-[#11151B] hover:text-[#1C3D5A]"
                      >
                        {item.product_name}
                      </Link>
                      <p className="mt-0.5 text-xs text-[#5C636E]">
                        Size: <strong className="text-[#11151B]">{item.size_label}</strong> · SKU:{' '}
                        {item.sku}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeItem(item.variant_id)}
                      aria-label={`Remove ${item.size_label}`}
                      className="rounded-lg p-1.5 text-[#5C636E] transition hover:bg-rose-50 hover:text-rose-600 cursor-pointer"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="inline-flex items-center rounded-[11px] border border-[#E6E3DC] bg-[#FAFAF8]">
                      <button
                        type="button"
                        onClick={() =>
                          void updateQuantity(item.variant_id, item.quantity - 1)
                        }
                        aria-label="Decrease quantity"
                        className="px-3 py-1.5 text-[#11151B] hover:bg-[#F2F0EB] cursor-pointer"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="min-w-9 text-center text-sm font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          void updateQuantity(item.variant_id, item.quantity + 1)
                        }
                        aria-label="Increase quantity"
                        className="px-3 py-1.5 text-[#11151B] hover:bg-[#F2F0EB] cursor-pointer"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="font-heading text-lg font-bold text-[#11151B]">
                        {formatPaise(item.unit_price_paise * item.quantity)}
                      </p>
                      {item.unit_mrp_paise > item.unit_price_paise && (
                        <p className="text-xs text-[#5C636E] line-through">
                          {formatPaise(item.unit_mrp_paise * item.quantity)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {totalQuantity === 1 && (
              <div className="rounded-[18px] border border-[#B89768]/50 bg-[#B89768]/10 p-5">
                <p className="text-xs font-semibold uppercase tracking-wider text-[#8A6D3B]">
                  Family Comfort Add-On Available
                </p>
                <p className="mt-1 text-sm text-[#11151B]">
                  Ordering for a parent or partner? Increase quantity to 2 (or add another size)
                  to receive an automatic <strong>₹400 discount</strong> on the second belt.
                </p>
              </div>
            )}
          </div>

          {/* Order Summary Sidebar */}
          <aside className="rounded-[22px] border border-[#E6E3DC] bg-white p-6 shadow-soft lg:col-span-5">
            <h2 className="font-heading text-lg font-bold text-[#11151B]">Order Summary</h2>

            {/* Coupon Form */}
            <form onSubmit={handleApplyCoupon} className="mt-4">
              <label htmlFor="cart-coupon" className="mb-1.5 block text-xs font-semibold text-[#5C636E]">
                Have a Coupon Code?
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#5C636E]" />
                  <Input
                    id="cart-coupon"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter code (e.g. WELCOME150)"
                    className="pl-9 uppercase"
                  />
                </div>
                <Button type="submit" variant="secondary" disabled={quoting}>
                  Apply
                </Button>
              </div>
              {pricing?.applied_coupon && (
                <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Coupon {pricing.applied_coupon.code} applied (–
                  {formatPaise(pricing.applied_coupon.discount_paise)})
                </p>
              )}
              {couponMessage && (
                <p className="mt-2 text-xs text-rose-600">{couponMessage}</p>
              )}
            </form>

            {/* Server-Verified Breakdown */}
            {pricing && (
              <dl className="mt-6 space-y-3 border-t border-[#E6E3DC] pt-5 text-sm">
                <div className="flex justify-between">
                  <dt className="text-[#5C636E]">Total MRP</dt>
                  <dd className="text-[#5C636E] line-through">
                    {formatPaise(pricing.mrp_total_paise)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-[#5C636E]">Launch Subtotal</dt>
                  <dd className="font-medium text-[#11151B]">
                    {formatPaise(pricing.subtotal_paise)}
                  </dd>
                </div>
                {pricing.offer_discount_paise > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <dt>Campaign Discount</dt>
                    <dd className="font-medium">
                      –{formatPaise(pricing.offer_discount_paise)}
                    </dd>
                  </div>
                )}
                {pricing.coupon_discount_paise > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <dt>Coupon ({pricing.applied_coupon?.code})</dt>
                    <dd className="font-medium">
                      –{formatPaise(pricing.coupon_discount_paise)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between">
                  <dt className="text-[#5C636E]">Shipping</dt>
                  <dd className="font-medium text-emerald-700">
                    {pricing.shipping_paise === 0
                      ? 'FREE'
                      : formatPaise(pricing.shipping_paise)}
                  </dd>
                </div>
                <div className="flex justify-between text-xs text-[#5C636E]">
                  <dt>
                    GST ({pricing.tax_inclusive ? 'Included in price' : 'Added at checkout'})
                  </dt>
                  <dd>{formatPaise(pricing.tax_paise)}</dd>
                </div>
                <div className="flex justify-between border-t border-[#E6E3DC] pt-4 text-base">
                  <dt className="font-heading font-bold text-[#11151B]">Total Payable</dt>
                  <dd className="font-heading text-xl font-bold text-[#11151B]">
                    {formatPaise(pricing.total_paise)}
                  </dd>
                </div>
                {pricing.total_savings_paise > 0 && (
                  <p className="rounded-[10px] bg-emerald-50 px-3 py-2 text-center text-xs font-medium text-emerald-700">
                    You save {formatPaise(pricing.total_savings_paise)} on this order
                  </p>
                )}
              </dl>
            )}

            <Link href="/checkout" className="mt-6 block">
              <Button variant="primary" size="lg" className="w-full">
                Proceed to Checkout
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>

            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[#5C636E]">
              <ShieldCheck className="h-4 w-4 text-[#1C3D5A]" />
              Final prices are verified server-side before payment
            </p>
          </aside>
        </div>
      </div>
    </div>
  );
}
