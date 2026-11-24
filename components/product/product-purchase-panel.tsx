'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  BellRing,
  Check,
  CheckCircle2,
  Heart,
  Minus,
  Plus,
  Ruler,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Star,
  Truck,
} from 'lucide-react';
import type {
  Offer,
  Product,
  ProductImage,
  ProductVariant,
  SizeGuideEntry,
} from '@/types/database';
import { useCart } from '@/components/cart/cart-provider';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/card';
import { ModalDialog } from '@/components/ui/dialog';
import { SizeGuideModal } from '@/components/product/size-guide-modal';
import { PincodeChecker } from '@/components/product/pincode-checker';
import { calculateDiscountPercent, cn, formatPaise } from '@/lib/utils/format';

interface ProductPurchasePanelProps {
  product: Product;
  variants: ProductVariant[];
  images: ProductImage[];
  sizeGuides: SizeGuideEntry[];
  offers: Offer[];
  averageRating: number | null;
  reviewCount: number;
}

export function ProductPurchasePanel({
  product,
  variants: initialVariants,
  images,
  sizeGuides,
  offers,
  averageRating,
  reviewCount,
}: ProductPurchasePanelProps) {
  const router = useRouter();
  const { addItem } = useCart();

  const [variants, setVariants] = React.useState<ProductVariant[]>(initialVariants);

  // Refresh live belt inventory counts on mount without blocking page switch speed
  React.useEffect(() => {
    let active = true;
    fetch('/api/inventory/status', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then(
        (
          data: {
            variants?: {
              variant_id: string;
              available_stock: number;
              stock_on_hand: number;
              stock_reserved: number;
              low_stock_threshold: number;
              allow_backorder: boolean;
            }[];
          } | null
        ) => {
          if (!active || !data?.variants || data.variants.length === 0) return;
          setVariants((prev) =>
            prev.map((v) => {
              const live = data.variants?.find((lv) => lv.variant_id === v.id);
              return live
                ? {
                    ...v,
                    stock_on_hand: live.stock_on_hand,
                    stock_reserved: live.stock_reserved,
                    available_stock: live.available_stock,
                    low_stock_threshold: live.low_stock_threshold,
                    allow_backorder: live.allow_backorder,
                  }
                : v;
            })
          );
        }
      )
      .catch(() => undefined);

    return () => {
      active = false;
    };
  }, []);

  const defaultVariant =
    variants.find((v) => v.size_code === 'M' && (v.available_stock ?? 0) > 0) ??
    variants.find((v) => (v.available_stock ?? 0) > 0) ??
    variants[0];

  const [selectedVariantId, setSelectedVariantId] = React.useState(
    defaultVariant?.id ?? ''
  );
  const [quantity, setQuantity] = React.useState(1);
  const [sizeGuideOpen, setSizeGuideOpen] = React.useState(false);
  const [wishlisted, setWishlisted] = React.useState(false);
  const [adding, setAdding] = React.useState(false);

  // Out-of-stock Place Order Alert & Restock Notification state
  const [outOfStockModalOpen, setOutOfStockModalOpen] = React.useState(false);
  const [notifyEmail, setNotifyEmail] = React.useState('');
  const [notifyPhone, setNotifyPhone] = React.useState('');
  const [notifyStatus, setNotifyStatus] = React.useState<
    'idle' | 'submitting' | 'success' | 'error'
  >('idle');
  const [notifyMessage, setNotifyMessage] = React.useState('');

  const selectedVariant =
    variants.find((v) => v.id === selectedVariantId) ?? defaultVariant;

  const primaryImage =
    images.find((i) => i.is_primary)?.url ?? images[0]?.url ?? '/images/hero-belt.jpg';

  const unitMrp = selectedVariant?.mrp_paise ?? product.mrp_paise;
  const unitPrice = selectedVariant?.sale_price_paise ?? product.sale_price_paise;
  const discountPct = calculateDiscountPercent(unitMrp, unitPrice);
  const availableStock = selectedVariant?.available_stock ?? 0;
  const lowThreshold = selectedVariant?.low_stock_threshold ?? 10;
  const isOutOfStock = availableStock <= 0 && !selectedVariant?.allow_backorder;
  const isLowStock = !isOutOfStock && availableStock > 0 && availableStock <= lowThreshold;

  const otherInStockVariants = variants.filter(
    (v) => v.id !== selectedVariant?.id && ((v.available_stock ?? 0) > 0 || v.allow_backorder)
  );

  const comfortKitOffer = offers.find((o) => o.campaign_type === 'bundle_kit');
  const familyAddonOffer = offers.find((o) => o.campaign_type === 'second_unit_addon');

  async function handleOrderAttempt(redirectToCheckout = false) {
    if (!selectedVariant) return;

    // If unavailable, keep "Place Order" clickable and alert the user + offer instant restock notification
    if (isOutOfStock) {
      setNotifyStatus('idle');
      setNotifyMessage('');
      setOutOfStockModalOpen(true);
      return;
    }

    setAdding(true);
    try {
      await addItem(
        {
          variant_id: selectedVariant.id,
          product_id: product.id,
          product_slug: product.slug,
          product_name: product.name,
          size_code: selectedVariant.size_code,
          size_label: selectedVariant.size_label,
          sku: selectedVariant.sku,
          image_url: primaryImage,
          unit_mrp_paise: unitMrp,
          unit_price_paise: unitPrice,
          gst_rate_bps: product.gst_rate_bps,
          available_stock: availableStock,
        },
        quantity
      );
      if (redirectToCheckout) {
        router.push('/checkout');
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleRestockNotifySubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedVariant) return;
    setNotifyStatus('submitting');
    setNotifyMessage('');

    try {
      const res = await fetch('/api/stock-notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variant_id: selectedVariant.id,
          size_code: selectedVariant.size_code,
          size_label: selectedVariant.size_label,
          product_name: product.name,
          email: notifyEmail,
          phone: notifyPhone,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setNotifyStatus('error');
        setNotifyMessage(data.error ?? 'Could not save your restock alert.');
      } else {
        setNotifyStatus('success');
        setNotifyMessage(
          data.message ??
            'Saved! Once restocked, we will notify you immediately.'
        );
        setNotifyEmail('');
        setNotifyPhone('');
      }
    } catch {
      setNotifyStatus('error');
      setNotifyMessage('Network error while saving your restock notification.');
    }
  }

  async function handleWishlistToggle() {
    setWishlisted((prev) => !prev);
    try {
      await fetch('/api/wishlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: product.id }),
      });
    } catch {
      // ignore if guest
    }
  }

  return (
    <>
      <div className="space-y-6 lg:sticky lg:top-24">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="champagne">Edition 01 · Flagship</Badge>
            {isOutOfStock ? (
              <Badge variant="danger">Size {selectedVariant?.size_code} Out of Stock</Badge>
            ) : isLowStock ? (
              <Badge variant="warning">
                Low Stock · Only {availableStock} left in {selectedVariant?.size_code}
              </Badge>
            ) : (
              <Badge variant="success">
                In Stock · {availableStock} ready to ship
              </Badge>
            )}
          </div>

          <h1 className="mt-3 font-heading text-3xl font-semibold tracking-[-0.03em] text-[#0E1116] sm:text-4xl">
            {product.name}
          </h1>
          {product.subtitle && (
            <p className="mt-1.5 text-sm leading-relaxed text-[#5C636E]">
              {product.subtitle}
            </p>
          )}

          <div className="mt-3 flex items-center gap-2 text-xs">
            {averageRating !== null && reviewCount > 0 ? (
              <>
                <div className="flex items-center gap-0.5 text-[#B89768]">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star
                      key={i}
                      className={cn(
                        'h-3.5 w-3.5',
                        i < Math.round(averageRating) ? 'fill-[#B89768]' : 'text-[#E6E3DC]'
                      )}
                    />
                  ))}
                </div>
                <span className="font-semibold text-[#11151B]">{averageRating}</span>
                <a href="#reviews" className="text-[#5C636E] underline underline-offset-4">
                  ({reviewCount} verified {reviewCount === 1 ? 'review' : 'reviews'})
                </a>
              </>
            ) : (
              <a
                href="#reviews"
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#8A9099] hover:text-[#11151B]"
              >
                <Star className="h-3.5 w-3.5 text-[#B89768]" />
                No synthetic ratings — verified buyer reviews publish after delivery
              </a>
            )}
          </div>
        </div>

        {/* Dynamic Price Block */}
        <div className="rounded-[22px] border border-[#E6E3DC] bg-white p-5">
          <div className="flex flex-wrap items-baseline gap-3">
            <span className="font-heading text-3xl font-bold text-[#0E1116]">
              {formatPaise(unitPrice)}
            </span>
            {unitMrp > unitPrice && (
              <>
                <span className="text-sm text-[#8A9099] line-through">
                  {formatPaise(unitMrp)}
                </span>
                <Badge variant="success">
                  Save {formatPaise(unitMrp - unitPrice)} ({discountPct}%)
                </Badge>
              </>
            )}
          </div>
          <p className="mt-1 text-[11px] text-[#8A9099]">
            Inclusive of all taxes (GST) · Free shipping across India
          </p>

          {comfortKitOffer && (
            <div className="mt-4 rounded-[16px] border border-[#E6E3DC] bg-[#FAFAF8] p-4">
              <p className="font-mono-tech flex items-center gap-1.5 text-[10px] text-[#86683D]">
                <Sparkles className="h-3 w-3 text-[#B89768]" />
                INCLUDED · {comfortKitOffer.name}
              </p>
              <ul className="mt-2.5 space-y-1.5 text-xs text-[#11151B]">
                {(comfortKitOffer.items ?? [])
                  .filter((item) => item.is_included)
                  .map((item) => (
                    <li key={item.id} className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 shrink-0 text-[#0E1116]" />
                      <span>{item.item_title}</span>
                    </li>
                  ))}
              </ul>
            </div>
          )}
        </div>

        {/* Size Configurator — All sizes selectable so out-of-stock sizes still allow Restock Alert */}
        <div id="size-guide" className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <span className="font-mono-tech text-[10px] text-[#8A9099]">WAIST SIZE</span>
              <p className="text-sm font-semibold text-[#11151B]">
                {selectedVariant?.size_label}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSizeGuideOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#E6E3DC] bg-white px-3.5 py-1.5 text-xs font-medium text-[#11151B] transition hover:border-[#0E1116] cursor-pointer"
            >
              <Ruler className="h-3.5 w-3.5 text-[#B89768]" />
              Size Guide &amp; Calculator
            </button>
          </div>

          <div className="grid grid-cols-5 gap-2">
            {variants.map((variant) => {
              const out = (variant.available_stock ?? 0) <= 0 && !variant.allow_backorder;
              const selected = variant.id === selectedVariant?.id;
              return (
                <button
                  key={variant.id}
                  type="button"
                  onClick={() => setSelectedVariantId(variant.id)}
                  className={cn(
                    'relative flex flex-col items-center justify-center rounded-[14px] border py-2.5 text-center transition cursor-pointer',
                    selected
                      ? 'border-[#0E1116] bg-[#0E1116] text-white'
                      : 'border-[#E6E3DC] bg-white text-[#11151B] hover:border-[#0E1116]/40',
                    out && !selected && 'border-dashed bg-[#FAFAF8] text-[#8A9099]'
                  )}
                >
                  <span className="font-heading text-sm font-semibold">
                    {variant.size_code}
                  </span>
                  <span
                    className={cn(
                      'text-[10px]',
                      selected ? 'text-white/75' : 'text-[#8A9099]'
                    )}
                  >
                    {out ? 'Sold out' : `${variant.waist_min_inches}–${variant.waist_max_inches}"`}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Inline Out-of-Stock Alert Notice */}
          {isOutOfStock && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-[14px] border border-amber-300/80 bg-amber-50 px-4 py-3 text-xs text-amber-950"
            >
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
              <p>
                <strong>Size {selectedVariant?.size_code} is currently out of stock.</strong>{' '}
                Click <strong>Place Order</strong> below to join our priority restock alert — once
                restocked, we will notify you immediately.
              </p>
            </div>
          )}
        </div>

        {/* Quantity & Family Add-On */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-4">
            <span className="font-mono-tech text-[10px] text-[#8A9099]">QUANTITY</span>
            <div className="inline-flex items-center rounded-full border border-[#E6E3DC] bg-white">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                aria-label="Decrease quantity"
                className="px-3.5 py-2 text-[#11151B] hover:bg-[#F2F0EB] rounded-l-full cursor-pointer"
              >
                <Minus className="h-3.5 w-3.5" />
              </button>
              <span className="min-w-10 text-center text-sm font-semibold">{quantity}</span>
              <button
                type="button"
                onClick={() =>
                  setQuantity((q) =>
                    Math.min(Math.max(1, Math.min(10, availableStock || 10)), q + 1)
                  )
                }
                aria-label="Increase quantity"
                className="px-3.5 py-2 text-[#11151B] hover:bg-[#F2F0EB] rounded-r-full cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {familyAddonOffer && (
            <button
              type="button"
              onClick={() => setQuantity((q) => (q < 2 ? 2 : 1))}
              className={cn(
                'flex w-full items-center justify-between gap-3 rounded-[16px] border px-4 py-3.5 text-left transition cursor-pointer',
                quantity >= 2
                  ? 'border-[#B89768] bg-[#B89768]/10'
                  : 'border-[#E6E3DC] bg-white hover:border-[#B89768]'
              )}
            >
              <div>
                <p className="font-mono-tech text-[10px] text-[#86683D]">
                  {familyAddonOffer.name}
                </p>
                <p className="mt-1 text-xs font-medium text-[#11151B]">
                  {familyAddonOffer.headline}
                </p>
              </div>
              <Badge
                variant={quantity >= 2 ? 'success' : 'champagne'}
                className="shrink-0 whitespace-nowrap"
              >
                {quantity >= 2 ? 'Applied' : 'Select 2'}
              </Badge>
            </button>
          )}
        </div>

        {/* Action Buttons — Always show Place Order / Add to Bag; out of stock triggers Restock Alert Modal */}
        <div className="space-y-2.5">
          <div className="flex gap-2.5">
            <Button
              variant="primary"
              size="lg"
              className="flex-1"
              disabled={adding}
              onClick={() => void handleOrderAttempt(false)}
            >
              {isOutOfStock ? (
                <>
                  <BellRing className="h-4 w-4 text-[#D6BA8E]" />
                  Place Order — {formatPaise(unitPrice * quantity)}
                </>
              ) : (
                <>
                  <ShoppingBag className="h-4 w-4 text-[#D6BA8E]" />
                  {adding
                    ? 'Adding...'
                    : `Add to Bag — ${formatPaise(unitPrice * quantity)}`}
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="h-13 w-13"
              aria-label={wishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
              onClick={() => void handleWishlistToggle()}
            >
              <Heart
                className={cn(
                  'h-4 w-4',
                  wishlisted ? 'fill-rose-500 text-rose-500' : 'text-[#5C636E]'
                )}
              />
            </Button>
          </div>

          <Button
            variant="outline"
            size="lg"
            className="w-full"
            disabled={adding}
            onClick={() => void handleOrderAttempt(true)}
          >
            {isOutOfStock ? 'Notify Me When Restocked' : 'Place Order — Instant Checkout'}
          </Button>
        </div>

        <PincodeChecker orderValuePaise={unitPrice * quantity} />

        <div className="grid grid-cols-2 gap-3 text-xs text-[#5C636E]">
          <div className="flex items-center gap-2 rounded-[14px] border border-[#E6E3DC] bg-white px-3.5 py-2.5">
            <Truck className="h-4 w-4 shrink-0 text-[#0E1116]" />
            <span>Tracked India shipping</span>
          </div>
          <div className="flex items-center gap-2 rounded-[14px] border border-[#E6E3DC] bg-white px-3.5 py-2.5">
            <ShieldCheck className="h-4 w-4 shrink-0 text-[#0E1116]" />
            <span>7-day size exchange</span>
          </div>
        </div>
      </div>

      {/* Mobile Sticky Purchase Bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E6E3DC] bg-[#FAFAF8]/95 px-4 py-3 backdrop-blur-lg lg:hidden">
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3">
          <div>
            <p className="font-mono-tech text-[10px] text-[#8A9099]">
              SIZE {selectedVariant?.size_code} · {isOutOfStock ? 'OUT OF STOCK' : `QTY ${quantity}`}
            </p>
            <p className="font-heading text-lg font-bold text-[#0E1116]">
              {formatPaise(unitPrice * quantity)}
            </p>
          </div>
          <Button
            variant="primary"
            size="md"
            disabled={adding}
            onClick={() => void handleOrderAttempt(false)}
            className="min-w-[165px]"
          >
            {isOutOfStock ? (
              <>
                <BellRing className="h-4 w-4 text-[#D6BA8E]" />
                Place Order
              </>
            ) : (
              <>
                <ShoppingBag className="h-4 w-4 text-[#D6BA8E]" />
                Add to Bag
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Out-of-Stock Alert & Priority Restock Notification Modal */}
      <ModalDialog
        open={outOfStockModalOpen}
        onClose={() => setOutOfStockModalOpen(false)}
        title={`Size ${selectedVariant?.size_code ?? ''} Is Currently Out of Stock`}
        description="Leave your details below — once restocked, we will notify you immediately."
        size="md"
      >
        <div className="space-y-5">
          <div
            role="alert"
            className="flex items-start gap-3 rounded-[16px] border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
          >
            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <div>
              <p className="font-semibold">
                {product.name} ({selectedVariant?.size_label}) is currently out of stock.
              </p>
              <p className="mt-1 text-xs leading-relaxed text-amber-900/90">
                We craft our lumbar belts in controlled quality batches. Enter your email (and
                optional WhatsApp/mobile number) and the moment this size is restocked, we will
                notify you first.
              </p>
            </div>
          </div>

          {notifyStatus === 'success' ? (
            <div className="rounded-[16px] border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-900">
              <p className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
                Restock Alert Confirmed
              </p>
              <p className="mt-1.5 text-xs leading-relaxed">{notifyMessage}</p>
            </div>
          ) : (
            <form onSubmit={handleRestockNotifySubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="restock-email"
                  className="mb-1.5 block text-xs font-semibold text-[#11151B]"
                >
                  Email Address *
                </label>
                <Input
                  id="restock-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={notifyEmail}
                  onChange={(e) => setNotifyEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>

              <div>
                <label
                  htmlFor="restock-phone"
                  className="mb-1.5 block text-xs font-semibold text-[#11151B]"
                >
                  WhatsApp / Mobile Number (+91, Optional)
                </label>
                <Input
                  id="restock-phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  value={notifyPhone}
                  onChange={(e) => setNotifyPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>

              {notifyStatus === 'error' && notifyMessage && (
                <p className="text-xs text-rose-600">{notifyMessage}</p>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="w-full"
                disabled={notifyStatus === 'submitting'}
              >
                <BellRing className="h-4 w-4 text-[#D6BA8E]" />
                {notifyStatus === 'submitting'
                  ? 'Saving Restock Alert...'
                  : 'Notify Me Once Restocked'}
              </Button>
            </form>
          )}

          {otherInStockVariants.length > 0 && (
            <div className="border-t border-[#E6E3DC] pt-4">
              <p className="font-mono-tech text-[10px] text-[#8A9099]">
                CURRENTLY AVAILABLE SIZES
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {otherInStockVariants.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setSelectedVariantId(v.id);
                      setOutOfStockModalOpen(false);
                    }}
                    className="rounded-full border border-[#E6E3DC] bg-white px-3.5 py-1.5 text-xs font-medium text-[#11151B] transition hover:border-[#0E1116] cursor-pointer"
                  >
                    Switch to {v.size_code} ({v.available_stock} left)
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </ModalDialog>

      <SizeGuideModal
        open={sizeGuideOpen}
        onClose={() => setSizeGuideOpen(false)}
        sizeGuides={sizeGuides}
        onSelectSize={(sizeCode) => {
          const match = variants.find((v) => v.size_code === sizeCode);
          if (match) setSelectedVariantId(match.id);
        }}
      />
    </>
  );
}
