'use client';

import * as React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  CreditCard,
  Lock,
  MapPin,
  Minus,
  Pencil,
  Plus,
  ShieldCheck,
  Smartphone,
  Tag,
  Truck,
  X,
  Zap,
} from 'lucide-react';
import { useCart } from '@/components/cart/cart-provider';
import { checkoutFormSchema, type CheckoutFormValues } from '@/lib/validation/schemas';
import { INDIAN_STATES, cn, formatPaise } from '@/lib/utils/format';
import { resolveIndianPincode } from '@/lib/utils/pincode';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input, Select, Textarea } from '@/components/ui/card';
import type { PricingBreakdown } from '@/types/database';

const EXPRESS_PROFILE_KEY = 'kamora_express_checkout_v1';

interface RazorpaySuccessPayload {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

interface RazorpayCheckoutOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  order_id: string;
  prefill: { name: string; email: string; contact: string };
  theme: { color: string };
  handler: (response: RazorpaySuccessPayload) => void;
  modal?: { ondismiss?: () => void };
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayCheckoutOptions) => {
      open: () => void;
      on: (event: string, cb: (resp: { error?: { description?: string } }) => void) => void;
    };
  }
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== 'undefined' && window.Razorpay) {
      resolve(true);
      return;
    }
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]'
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(true));
      existing.addEventListener('error', () => resolve(false));
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function CheckoutInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const cancelled = searchParams.get('cancelled') === 'true';

  const {
    items,
    subtotalPaise: cartSubtotalPaise,
    couponCode,
    setCouponCode,
    updateQuantity,
    clearCart,
    isLoading: cartLoading,
  } = useCart();

  const [pricing, setPricing] = React.useState<PricingBreakdown | null>(null);
  const [couponInput, setCouponInput] = React.useState(couponCode);
  const [couponFeedback, setCouponFeedback] = React.useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [quoting, setQuoting] = React.useState(false);

  const [zoneInfo, setZoneInfo] = React.useState<{
    name: string;
    estimated_min_days: number;
    estimated_max_days: number;
    cod_available: boolean;
    cod_fee_paise: number;
  } | null>(null);

  const [hasSavedExpress, setHasSavedExpress] = React.useState(false);
  const [editingDetails, setEditingDetails] = React.useState(true);
  const [showOptionalFields, setShowOptionalFields] = React.useState(false);
  const [submitError, setSubmitError] = React.useState('');
  const [submitting, setSubmitting] = React.useState(false);
  const [verifying, setVerifying] = React.useState(false);

  const idempotencyKeyRef = React.useRef<string>(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `chk_${Date.now()}_${Math.random().toString(36).slice(2)}`
  );

  const form = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutFormSchema),
    mode: 'onBlur',
    defaultValues: {
      full_name: '',
      email: '',
      phone: '',
      address_line1: '',
      address_line2: '',
      landmark: '',
      city: '',
      state: 'Karnataka',
      pincode: '',
      payment_method: 'razorpay_upi',
      coupon_code: couponCode,
      customer_notes: '',
      save_address: false,
    },
  });

  // Restore saved Express 1-Click Checkout profile if available
  React.useEffect(() => {
    try {
      const raw = window.localStorage.getItem(EXPRESS_PROFILE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as Partial<CheckoutFormValues>;
      if (saved.full_name && saved.phone && saved.pincode && saved.address_line1) {
        form.reset({
          ...form.getValues(),
          ...saved,
          coupon_code: couponCode || saved.coupon_code || '',
        });
        setHasSavedExpress(true);
        setEditingDetails(false);
      }
    } catch {
      // ignore storage errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const watchedPincode = form.watch('pincode');
  const watchedMethod = form.watch('payment_method');
  const watchedName = form.watch('full_name');
  const watchedPhone = form.watch('phone');
  const watchedAddress = form.watch('address_line1');
  const watchedCity = form.watch('city');
  const watchedState = form.watch('state');

  // Auto-resolve Indian City & State immediately when a valid 6-digit PIN is entered
  React.useEffect(() => {
    const resolved = resolveIndianPincode(watchedPincode);
    if (resolved) {
      form.setValue('city', resolved.city, { shouldValidate: true });
      form.setValue('state', resolved.state, { shouldValidate: true });
    }
  }, [watchedPincode, form]);

  // Sync coupon input if changed from cart page
  React.useEffect(() => {
    if (couponCode) setCouponInput(couponCode);
  }, [couponCode]);

  // Fetch authoritative server quote whenever items, coupon, PIN, or payment method change
  const fetchQuote = React.useCallback(
    async (activeCoupon: string, signal?: AbortSignal) => {
      if (items.length === 0) return;
      setQuoting(true);
      try {
        const res = await fetch('/api/pricing/quote', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal,
          body: JSON.stringify({
            items: items.map((i) => ({ variant_id: i.variant_id, quantity: i.quantity })),
            coupon_code: activeCoupon,
            pincode: /^[1-9][0-9]{5}$/.test(watchedPincode) ? watchedPincode : undefined,
            payment_method: watchedMethod,
          }),
        });
        if (res.ok) {
          const data = (await res.json()) as {
            pricing: PricingBreakdown;
            shipping_zone: typeof zoneInfo;
            coupon_message?: string | null;
          };
          setPricing(data.pricing);
          setZoneInfo(data.shipping_zone);

          if (activeCoupon) {
            if (data.pricing.applied_coupon) {
              setCouponFeedback({
                type: 'success',
                text: `Coupon ${data.pricing.applied_coupon.code} applied — saved ${formatPaise(
                  data.pricing.applied_coupon.discount_paise
                )}`,
              });
            } else if (data.coupon_message) {
              setCouponFeedback({ type: 'error', text: data.coupon_message });
            }
          } else {
            setCouponFeedback(null);
          }
        }
      } catch {
        // ignore abort
      } finally {
        setQuoting(false);
      }
    },
    [items, watchedPincode, watchedMethod]
  );

  React.useEffect(() => {
    const controller = new AbortController();
    const t = setTimeout(() => {
      void fetchQuote(couponCode, controller.signal);
    }, 150);
    return () => {
      clearTimeout(t);
      controller.abort();
    };
  }, [fetchQuote, couponCode]);

  function handleApplyCoupon(codeOverride?: string) {
    const code = (codeOverride ?? couponInput).trim().toUpperCase();
    setCouponInput(code);
    setCouponCode(code);
    form.setValue('coupon_code', code);
    void fetchQuote(code);
  }

  function handleRemoveCoupon() {
    setCouponInput('');
    setCouponCode('');
    setCouponFeedback(null);
    form.setValue('coupon_code', '');
    void fetchQuote('');
  }

  // Always compute crisp fallback numbers from cart items so Subtotal NEVER flashes ₹0
  const localMrpPaise = React.useMemo(
    () => items.reduce((s, i) => s + i.unit_mrp_paise * i.quantity, 0),
    [items]
  );
  const displaySubtotal =
    pricing && pricing.subtotal_paise > 0 ? pricing.subtotal_paise : cartSubtotalPaise;
  const displayOfferDiscount = pricing?.offer_discount_paise ?? 0;
  const displayCouponDiscount = pricing?.coupon_discount_paise ?? 0;
  const displayShipping = pricing?.shipping_paise ?? 0;
  const displayCodFee = pricing?.cod_fee_paise ?? 0;
  const displayTax =
    pricing && pricing.subtotal_paise > 0
      ? pricing.tax_paise
      : Math.round((cartSubtotalPaise * 1200) / 11200);
  const displayTotal =
    pricing && pricing.total_paise > 0
      ? pricing.total_paise
      : Math.max(0, displaySubtotal - displayOfferDiscount - displayCouponDiscount);

  async function onSubmit(values: CheckoutFormValues) {
    setSubmitError('');
    setSubmitting(true);

    // Ensure city & state are populated from PIN if hidden
    const resolved = resolveIndianPincode(values.pincode);
    const payloadValues: CheckoutFormValues = {
      ...values,
      city: values.city?.trim() || resolved?.city || 'India',
      state: values.state?.trim() || resolved?.state || 'Karnataka',
      coupon_code: couponCode || values.coupon_code || '',
    };

    // Save details locally for instant 1-Click Checkout on future orders
    try {
      window.localStorage.setItem(
        EXPRESS_PROFILE_KEY,
        JSON.stringify({
          full_name: payloadValues.full_name,
          phone: payloadValues.phone,
          email: payloadValues.email,
          pincode: payloadValues.pincode,
          address_line1: payloadValues.address_line1,
          city: payloadValues.city,
          state: payloadValues.state,
        })
      );
    } catch {
      // ignore
    }

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payloadValues,
          items: items.map((i) => ({ variant_id: i.variant_id, quantity: i.quantity })),
          idempotency_key: idempotencyKeyRef.current,
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        provider?: 'razorpay' | 'stripe' | 'cod';
        internal_order_id?: string;
        order_number?: string;
        checkout_url?: string;
        redirect_url?: string;
        razorpay?: {
          key_id: string;
          order_id: string;
          amount_paise: number;
          currency: string;
          name: string;
          description: string;
          prefill: { name: string; email: string; contact: string };
        };
      };

      if (!res.ok) {
        setSubmitError(data.error ?? 'Could not process checkout. Please try again.');
        setSubmitting(false);
        return;
      }

      if (data.provider === 'razorpay' && data.razorpay && data.internal_order_id) {
        const loaded = await loadRazorpayScript();
        if (!loaded || !window.Razorpay) {
          setSubmitError(
            'Unable to load Razorpay Checkout SDK. Check your internet connection or ad blocker.'
          );
          setSubmitting(false);
          return;
        }

        const internalOrderId = data.internal_order_id;
        const rzp = new window.Razorpay({
          key: data.razorpay.key_id,
          amount: data.razorpay.amount_paise,
          currency: data.razorpay.currency,
          name: data.razorpay.name,
          description: data.razorpay.description,
          order_id: data.razorpay.order_id,
          prefill: data.razorpay.prefill,
          theme: { color: '#0E1116' },
          handler: async (response: RazorpaySuccessPayload) => {
            setVerifying(true);
            try {
              const verifyRes = await fetch('/api/razorpay/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  internal_order_id: internalOrderId,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });
              const verifyData = (await verifyRes.json()) as {
                verified?: boolean;
                redirect_url?: string;
                error?: string;
              };

              if (!verifyRes.ok || !verifyData.verified) {
                setSubmitError(
                  verifyData.error ?? 'Payment verification failed on the server.'
                );
                setVerifying(false);
                setSubmitting(false);
                return;
              }

              await clearCart();
              router.push(
                verifyData.redirect_url ??
                  `/order-success?order=${encodeURIComponent(data.order_number ?? '')}`
              );
            } catch {
              setSubmitError('Network error while verifying Razorpay payment.');
              setVerifying(false);
              setSubmitting(false);
            }
          },
          modal: {
            ondismiss: async () => {
              await fetch('/api/razorpay/cancel', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ internal_order_id: internalOrderId }),
              }).catch(() => undefined);

              idempotencyKeyRef.current =
                typeof crypto !== 'undefined' && 'randomUUID' in crypto
                  ? crypto.randomUUID()
                  : `chk_${Date.now()}_${Math.random().toString(36).slice(2)}`;
              setSubmitError('Payment window closed before completion. You can retry anytime.');
              setSubmitting(false);
            },
          },
        });

        rzp.on('payment.failed', (failure) => {
          setSubmitError(
            failure.error?.description ?? 'Razorpay payment failed. Please try another method.'
          );
          setSubmitting(false);
        });

        rzp.open();
        return;
      }

      if (data.checkout_url) {
        window.location.href = data.checkout_url;
        return;
      }

      if (data.redirect_url) {
        await clearCart();
        router.push(data.redirect_url);
      }
    } catch {
      setSubmitError('Network error while submitting your order. Please try again.');
      setSubmitting(false);
    }
  }

  if (cartLoading && items.length === 0) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-20">
        <div className="animate-pulse grid gap-8 lg:grid-cols-12">
          <div className="h-96 rounded-[24px] bg-[#F2F0EB] lg:col-span-7" />
          <div className="h-80 rounded-[24px] bg-[#F2F0EB] lg:col-span-5" />
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <Badge variant="default">Express Checkout</Badge>
        <h1 className="mt-3 font-heading text-2xl font-bold text-[#11151B]">
          Your Bag Is Empty
        </h1>
        <p className="mt-2 text-sm text-[#5C636E]">
          Select your waist size on the Kamora Adjustable Back Support Belt to begin checkout.
        </p>
        <Link href="/products/back-support-belt" className="mt-6 inline-block">
          <Button variant="primary" size="lg">
            Configure Back Support Belt
          </Button>
        </Link>
      </div>
    );
  }

  const errors = form.formState.errors;

  return (
    <div className="bg-[#FAFAF8] py-10 sm:py-14">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {/* Compact Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#E6E3DC] pb-6">
          <div>
            <Badge variant="champagne">
              <Zap className="h-3 w-3" />
              One-Click Express Checkout
            </Badge>
            <h1 className="mt-2.5 font-heading text-3xl font-semibold tracking-[-0.03em] text-[#0E1116]">
              Fast, effortless{' '}
              <span className="font-editorial italic font-normal text-[#1C3D5A]">
                order placement.
              </span>
            </h1>
          </div>
          <Link
            href="/products/back-support-belt"
            className="text-xs font-medium text-[#5C636E] underline underline-offset-4 hover:text-[#0E1116]"
          >
            Back to Product
          </Link>
        </div>

        {cancelled && (
          <div className="mt-5 flex items-center gap-2.5 rounded-[14px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <AlertCircle className="h-4 w-4 shrink-0" />
            Payment was cancelled before completion. Your bag is ready below.
          </div>
        )}

        <form
          onSubmit={form.handleSubmit(onSubmit)}
          noValidate
          className="mt-8 grid gap-8 lg:grid-cols-12 lg:items-start"
        >
          {/* Left: Ultra-Streamlined Express Details + Payment */}
          <div className="space-y-6 lg:col-span-7">
            {/* Saved One-Click Summary Card (when returning customer) */}
            {hasSavedExpress && !editingDetails ? (
              <section className="rounded-[22px] border border-[#0E1116]/20 bg-white p-6 shadow-soft">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-mono-tech flex items-center gap-1.5 text-[10px] text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      SAVED EXPRESS DELIVERY DETAILS
                    </p>
                    <p className="mt-2 font-heading text-base font-semibold text-[#11151B]">
                      {watchedName} · {watchedPhone}
                    </p>
                    <p className="mt-1 text-sm text-[#5C636E]">
                      {watchedAddress}
                      {watchedCity ? `, ${watchedCity}` : ''}
                      {watchedState ? `, ${watchedState}` : ''} – {watchedPincode}
                    </p>
                    {zoneInfo && (
                      <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-[#1C3D5A]">
                        <Truck className="h-3.5 w-3.5" />
                        Estimated arrival: {zoneInfo.estimated_min_days}–
                        {zoneInfo.estimated_max_days} business days
                      </p>
                    )}
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    onClick={() => setEditingDetails(true)}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                    Edit
                  </Button>
                </div>
              </section>
            ) : (
              /* Minimal 4-Field Express Delivery Form */
              <section className="rounded-[22px] border border-[#E6E3DC] bg-white p-6 shadow-soft">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="font-mono-tech text-[10px] text-[#8A9099]">STEP 01</p>
                    <h2 className="mt-0.5 font-heading text-lg font-semibold text-[#11151B]">
                      Delivery Details (4 Quick Fields)
                    </h2>
                  </div>
                  {hasSavedExpress && (
                    <button
                      type="button"
                      onClick={() => setEditingDetails(false)}
                      className="text-xs font-medium text-[#5C636E] hover:text-[#0E1116] cursor-pointer"
                    >
                      Done
                    </button>
                  )}
                </div>

                <div className="mt-5 grid gap-4 sm:grid-cols-2">
                  <div>
                    <label
                      htmlFor="chk-name"
                      className="mb-1.5 block text-xs font-semibold text-[#11151B]"
                    >
                      Full Name *
                    </label>
                    <Input
                      id="chk-name"
                      type="text"
                      autoComplete="name"
                      required
                      placeholder="Ananya Sharma"
                      {...form.register('full_name')}
                    />
                    {errors.full_name && (
                      <p className="mt-1 text-xs text-rose-600">{errors.full_name.message}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="chk-phone"
                      className="mb-1.5 block text-xs font-semibold text-[#11151B]"
                    >
                      Mobile Number (+91) *
                    </label>
                    <Input
                      id="chk-phone"
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      required
                      placeholder="9876543210"
                      {...form.register('phone')}
                    />
                    {errors.phone && (
                      <p className="mt-1 text-xs text-rose-600">{errors.phone.message}</p>
                    )}
                  </div>

                  <div>
                    <label
                      htmlFor="chk-pincode"
                      className="mb-1.5 block text-xs font-semibold text-[#11151B]"
                    >
                      6-Digit PIN Code *
                    </label>
                    <Input
                      id="chk-pincode"
                      type="text"
                      inputMode="numeric"
                      autoComplete="postal-code"
                      maxLength={6}
                      required
                      placeholder="560038"
                      {...form.register('pincode')}
                    />
                    {errors.pincode && (
                      <p className="mt-1 text-xs text-rose-600">{errors.pincode.message}</p>
                    )}
                  </div>

                  {/* Auto-detected City/State & Delivery ETA */}
                  <div className="flex flex-col justify-end">
                    {watchedCity && /^[1-9][0-9]{5}$/.test(watchedPincode) ? (
                      <div className="flex h-11 items-center gap-2 rounded-[12px] border border-[#E6E3DC] bg-[#FAFAF8] px-3.5 text-xs text-[#11151B]">
                        <MapPin className="h-3.5 w-3.5 shrink-0 text-[#B89768]" />
                        <span className="truncate font-medium">
                          {watchedCity}, {watchedState}
                          {zoneInfo
                            ? ` · ${zoneInfo.estimated_min_days}–${zoneInfo.estimated_max_days}d`
                            : ''}
                        </span>
                      </div>
                    ) : (
                      <p className="flex h-11 items-center text-xs text-[#8A9099]">
                        City &amp; state auto-fill from PIN code
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label
                      htmlFor="chk-addr1"
                      className="mb-1.5 block text-xs font-semibold text-[#11151B]"
                    >
                      Complete Delivery Address *
                    </label>
                    <Textarea
                      id="chk-addr1"
                      autoComplete="street-address"
                      required
                      placeholder="House / Flat No., Building, Street, Area / Landmark"
                      className="min-h-[78px]"
                      {...form.register('address_line1')}
                    />
                    {errors.address_line1 && (
                      <p className="mt-1 text-xs text-rose-600">
                        {errors.address_line1.message}
                      </p>
                    )}
                  </div>
                </div>

                {/* Optional email / manual city-state override collapsed by default */}
                <div className="mt-4 border-t border-[#E6E3DC] pt-3.5">
                  <button
                    type="button"
                    onClick={() => setShowOptionalFields((s) => !s)}
                    className="text-xs font-medium text-[#5C636E] underline underline-offset-4 hover:text-[#0E1116] cursor-pointer"
                  >
                    {showOptionalFields
                      ? 'Hide optional email & city override'
                      : '+ Add email receipt or edit city/state (optional)'}
                  </button>

                  {showOptionalFields && (
                    <div className="mt-4 grid gap-4 sm:grid-cols-3">
                      <div>
                        <label
                          htmlFor="chk-email"
                          className="mb-1 block text-xs font-semibold text-[#11151B]"
                        >
                          Email (Optional)
                        </label>
                        <Input
                          id="chk-email"
                          type="email"
                          autoComplete="email"
                          placeholder="you@example.com"
                          {...form.register('email')}
                        />
                        {errors.email && (
                          <p className="mt-1 text-xs text-rose-600">{errors.email.message}</p>
                        )}
                      </div>
                      <div>
                        <label
                          htmlFor="chk-city"
                          className="mb-1 block text-xs font-semibold text-[#11151B]"
                        >
                          City
                        </label>
                        <Input
                          id="chk-city"
                          type="text"
                          autoComplete="address-level2"
                          placeholder="Bengaluru"
                          {...form.register('city')}
                        />
                      </div>
                      <div>
                        <label
                          htmlFor="chk-state"
                          className="mb-1 block text-xs font-semibold text-[#11151B]"
                        >
                          State
                        </label>
                        <Select
                          id="chk-state"
                          autoComplete="address-level1"
                          {...form.register('state')}
                        >
                          {INDIAN_STATES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              </section>
            )}

            {/* Compact 3-Option Payment Picker */}
            <section className="rounded-[22px] border border-[#E6E3DC] bg-white p-6 shadow-soft">
              <p className="font-mono-tech text-[10px] text-[#8A9099]">STEP 02</p>
              <h2 className="mt-0.5 font-heading text-lg font-semibold text-[#11151B]">
                Choose Payment Method
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <label className="flex cursor-pointer flex-col justify-between rounded-[16px] border border-[#E6E3DC] p-4 transition has-[:checked]:border-[#0E1116] has-[:checked]:bg-[#F2F0EB]/60">
                  <div className="flex items-center justify-between">
                    <Smartphone className="h-4 w-4 text-[#0E1116]" />
                    <input
                      type="radio"
                      value="razorpay_upi"
                      {...form.register('payment_method')}
                      className="accent-[#0E1116]"
                    />
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-[#11151B]">UPI Instant</p>
                    <p className="mt-0.5 text-[11px] text-[#5C636E]">
                      GPay, PhonePe, Paytm
                    </p>
                  </div>
                </label>

                <label className="flex cursor-pointer flex-col justify-between rounded-[16px] border border-[#E6E3DC] p-4 transition has-[:checked]:border-[#0E1116] has-[:checked]:bg-[#F2F0EB]/60">
                  <div className="flex items-center justify-between">
                    <CreditCard className="h-4 w-4 text-[#0E1116]" />
                    <input
                      type="radio"
                      value="razorpay_card"
                      {...form.register('payment_method')}
                      className="accent-[#0E1116]"
                    />
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-[#11151B]">Cards &amp; Bank</p>
                    <p className="mt-0.5 text-[11px] text-[#5C636E]">
                      Visa, RuPay, NetBanking
                    </p>
                  </div>
                </label>

                <label
                  className={cn(
                    'flex cursor-pointer flex-col justify-between rounded-[16px] border border-[#E6E3DC] p-4 transition has-[:checked]:border-[#0E1116] has-[:checked]:bg-[#F2F0EB]/60',
                    zoneInfo && !zoneInfo.cod_available && 'pointer-events-none opacity-45'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <Banknote className="h-4 w-4 text-[#0E1116]" />
                    <input
                      type="radio"
                      value="cod"
                      disabled={Boolean(zoneInfo && !zoneInfo.cod_available)}
                      {...form.register('payment_method')}
                      className="accent-[#0E1116]"
                    />
                  </div>
                  <div className="mt-3">
                    <p className="text-sm font-semibold text-[#11151B]">Cash on Delivery</p>
                    <p className="mt-0.5 text-[11px] text-[#5C636E]">
                      {zoneInfo && !zoneInfo.cod_available
                        ? 'Unavailable for PIN'
                        : zoneInfo?.cod_fee_paise
                        ? `+${formatPaise(zoneInfo.cod_fee_paise)} fee`
                        : 'Pay at doorstep'}
                    </p>
                  </div>
                </label>
              </div>
            </section>
          </div>

          {/* Right: Order Summary + Built-in Coupon Code + 1-Click CTA */}
          <aside className="rounded-[24px] border border-[#E6E3DC] bg-white p-6 shadow-soft lg:sticky lg:top-24 lg:col-span-5">
            <p className="font-mono-tech text-[10px] text-[#8A9099]">ORDER SUMMARY</p>

            {/* Line Items with inline +/- quantity controls */}
            <ul className="mt-4 divide-y divide-[#E6E3DC]">
              {items.map((item) => (
                <li key={item.variant_id} className="flex items-center gap-3.5 py-3.5">
                  <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-[12px] bg-[#F2F0EB]">
                    <Image
                      src={item.image_url}
                      alt={item.product_name}
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#11151B]">
                      {item.product_name}
                    </p>
                    <p className="text-xs text-[#5C636E]">{item.size_label}</p>
                    <div className="mt-1.5 inline-flex items-center rounded-full border border-[#E6E3DC] bg-[#FAFAF8]">
                      <button
                        type="button"
                        onClick={() =>
                          void updateQuantity(item.variant_id, item.quantity - 1)
                        }
                        aria-label="Decrease quantity"
                        className="px-2 py-0.5 text-[#11151B] hover:bg-[#F2F0EB] rounded-l-full cursor-pointer"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="min-w-6 text-center text-xs font-semibold">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          void updateQuantity(item.variant_id, item.quantity + 1)
                        }
                        aria-label="Increase quantity"
                        className="px-2 py-0.5 text-[#11151B] hover:bg-[#F2F0EB] rounded-r-full cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-[#11151B]">
                      {formatPaise(item.unit_price_paise * item.quantity)}
                    </p>
                    {item.unit_mrp_paise > item.unit_price_paise && (
                      <p className="text-[11px] text-[#8A9099] line-through">
                        {formatPaise(item.unit_mrp_paise * item.quantity)}
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            {/* Built-In Coupon Code Box */}
            <div className="mt-4 border-t border-[#E6E3DC] pt-4">
              <label
                htmlFor="checkout-coupon-input"
                className="font-mono-tech flex items-center gap-1.5 text-[10px] text-[#5C636E]"
              >
                <Tag className="h-3 w-3 text-[#B89768]" />
                COUPON / PROMO CODE
              </label>

              {pricing?.applied_coupon ? (
                <div className="mt-2 flex items-center justify-between rounded-[12px] border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-xs text-emerald-900">
                  <span className="flex items-center gap-1.5 font-semibold">
                    <CheckCircle2 className="h-4 w-4 text-emerald-700" />
                    {pricing.applied_coupon.code} applied (–
                    {formatPaise(pricing.applied_coupon.discount_paise)})
                  </span>
                  <button
                    type="button"
                    onClick={handleRemoveCoupon}
                    aria-label="Remove coupon"
                    className="rounded-full p-1 text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="mt-2 flex gap-2">
                    <Input
                      id="checkout-coupon-input"
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleApplyCoupon();
                        }
                      }}
                      placeholder="Enter code (e.g. WELCOME150)"
                      className="h-10 uppercase"
                    />
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      disabled={quoting || !couponInput.trim()}
                      onClick={() => handleApplyCoupon()}
                      className="h-10 shrink-0 px-4"
                    >
                      {quoting ? '...' : 'Apply'}
                    </Button>
                  </div>

                  {/* One-tap Coupon Chips */}
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon('WELCOME150')}
                      className="rounded-full border border-dashed border-[#B89768] bg-[#B89768]/10 px-2.5 py-1 text-[11px] font-medium text-[#86683D] transition hover:bg-[#B89768]/20 cursor-pointer"
                    >
                      Tap to apply <strong>WELCOME150</strong> (₹150 off)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApplyCoupon('KAMORA10')}
                      className="rounded-full border border-dashed border-[#E6E3DC] bg-[#FAFAF8] px-2.5 py-1 text-[11px] font-medium text-[#5C636E] transition hover:border-[#0E1116] cursor-pointer"
                    >
                      <strong>KAMORA10</strong> (10% off)
                    </button>
                  </div>
                </>
              )}

              {couponFeedback?.type === 'error' && (
                <p className="mt-2 text-xs text-rose-600">{couponFeedback.text}</p>
              )}
            </div>

            {/* Price Breakdown — Never shows ₹0 */}
            <dl className="mt-5 space-y-2.5 border-t border-[#E6E3DC] pt-4 text-sm">
              {localMrpPaise > displaySubtotal && (
                <div className="flex justify-between text-xs text-[#8A9099]">
                  <dt>Total MRP</dt>
                  <dd className="line-through">{formatPaise(localMrpPaise)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-[#5C636E]">Product Subtotal</dt>
                <dd className="font-semibold text-[#11151B]">
                  {formatPaise(displaySubtotal)}
                </dd>
              </div>
              {displayOfferDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Family Add-On Savings</dt>
                  <dd className="font-medium">–{formatPaise(displayOfferDiscount)}</dd>
                </div>
              )}
              {displayCouponDiscount > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <dt>Coupon ({pricing?.applied_coupon?.code})</dt>
                  <dd className="font-medium">–{formatPaise(displayCouponDiscount)}</dd>
                </div>
              )}
              <div className="flex justify-between">
                <dt className="text-[#5C636E]">Shipping</dt>
                <dd className="font-medium text-emerald-700">
                  {displayShipping === 0 ? 'FREE' : formatPaise(displayShipping)}
                </dd>
              </div>
              {displayCodFee > 0 && (
                <div className="flex justify-between">
                  <dt className="text-[#5C636E]">COD Handling Fee</dt>
                  <dd>{formatPaise(displayCodFee)}</dd>
                </div>
              )}
              <div className="flex justify-between text-xs text-[#8A9099]">
                <dt>GST (Included in price)</dt>
                <dd>{formatPaise(displayTax)}</dd>
              </div>
              <div className="flex justify-between border-t border-[#E6E3DC] pt-4 text-base">
                <dt className="font-heading font-bold text-[#0E1116]">Total Payable</dt>
                <dd className="font-heading text-xl font-bold text-[#0E1116]">
                  {formatPaise(displayTotal)}
                </dd>
              </div>
            </dl>

            {submitError && (
              <div className="mt-4 flex items-start gap-2 rounded-[12px] border border-rose-200 bg-rose-50 p-3.5 text-xs text-rose-700">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{submitError}</span>
              </div>
            )}

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="mt-6 w-full"
              disabled={submitting || verifying}
            >
              <Lock className="h-4 w-4 text-[#D6BA8E]" />
              {verifying
                ? 'Verifying Payment...'
                : submitting
                ? 'Placing Order...'
                : watchedMethod === 'cod'
                ? `Place COD Order — ${formatPaise(displayTotal)}`
                : `Pay ${formatPaise(displayTotal)} Now`}
            </Button>

            <p className="mt-3.5 flex items-center justify-center gap-1.5 text-[11px] text-[#8A9099]">
              <ShieldCheck className="h-3.5 w-3.5 text-[#1C3D5A]" />
              Razorpay Test Mode · Use UPI <code>success@razorpay</code>
            </p>
          </aside>
        </form>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <React.Suspense
      fallback={
        <div className="mx-auto max-w-5xl px-4 py-20 text-center text-sm text-[#5C636E]">
          Loading Express Checkout...
        </div>
      }
    >
      <CheckoutInner />
    </React.Suspense>
  );
}
