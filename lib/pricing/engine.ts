import type {
  Coupon,
  Offer,
  PaymentMethod,
  PricingBreakdown,
  ShippingZone,
  StoreSettings,
} from '@/types/database';

export interface PricedLineInput {
  quantity: number;
  unit_mrp_paise: number;
  unit_price_paise: number;
  gst_rate_bps: number;
}

export interface CalculatePricingParams {
  items: PricedLineInput[];
  activeOffers: Offer[];
  coupon: Coupon | null;
  shippingZone: ShippingZone | null;
  settings: Pick<
    StoreSettings,
    | 'gst_inclusive_pricing'
    | 'default_gst_rate_bps'
    | 'free_shipping_threshold_paise'
    | 'default_shipping_charge_paise'
  >;
  paymentMethod?: PaymentMethod;
  now?: Date;
}

export function isWindowActive(
  startsAt: string | null | undefined,
  endsAt: string | null | undefined,
  now: Date
): boolean {
  if (startsAt && new Date(startsAt).getTime() > now.getTime()) return false;
  if (endsAt && new Date(endsAt).getTime() < now.getTime()) return false;
  return true;
}

/**
 * Pure server-authoritative pricing engine using integer paise only.
 * Never trust client-supplied prices, discounts, shipping, or totals.
 */
export function calculateOrderPricing(params: CalculatePricingParams): PricingBreakdown {
  const { items, activeOffers, coupon, shippingZone, settings, paymentMethod } = params;
  const now = params.now ?? new Date();

  let mrpTotal = 0;
  let subtotal = 0;
  let totalQuantity = 0;

  for (const item of items) {
    const qty = Math.max(0, Math.floor(item.quantity));
    mrpTotal += Math.round(item.unit_mrp_paise) * qty;
    subtotal += Math.round(item.unit_price_paise) * qty;
    totalQuantity += qty;
  }

  const catalogSavings = Math.max(0, mrpTotal - subtotal);

  // 1. Evaluate active non-expired offers
  const appliedOffers: { code: string; name: string; discount_paise: number }[] = [];
  let offerDiscount = 0;
  let qualifiesForComfortKit = false;
  let offerGrantsFreeShipping = false;

  for (const offer of activeOffers) {
    if (!offer.is_active) continue;
    if (!isWindowActive(offer.starts_at, offer.ends_at, now)) continue;
    if (offer.stock_limit !== null && offer.usage_count >= offer.stock_limit) continue;
    if (totalQuantity < offer.min_quantity) continue;
    if (subtotal < offer.min_order_paise) continue;

    let discountForOffer = 0;

    if (offer.campaign_type === 'bundle_kit') {
      qualifiesForComfortKit = true;
      if (offer.discount_type === 'fixed_paise') {
        discountForOffer = offer.discount_value;
      } else {
        discountForOffer = Math.round((subtotal * offer.discount_value) / 100);
      }
    } else if (offer.campaign_type === 'second_unit_addon') {
      // Discount applies per additional unit beyond the first (or once per pair)
      const eligibleExtraUnits = Math.max(0, totalQuantity - 1);
      if (eligibleExtraUnits > 0) {
        if (offer.discount_type === 'fixed_paise') {
          discountForOffer = offer.discount_value * eligibleExtraUnits;
        } else {
          const avgUnitPrice = totalQuantity > 0 ? Math.round(subtotal / totalQuantity) : 0;
          discountForOffer = Math.round(
            (avgUnitPrice * eligibleExtraUnits * offer.discount_value) / 100
          );
        }
      }
    } else {
      if (offer.discount_type === 'fixed_paise') {
        discountForOffer = offer.discount_value;
      } else {
        discountForOffer = Math.round((subtotal * offer.discount_value) / 100);
      }
    }

    if (offer.free_shipping) {
      offerGrantsFreeShipping = true;
    }

    discountForOffer = Math.min(discountForOffer, Math.max(0, subtotal - offerDiscount));
    if (discountForOffer > 0 || offer.campaign_type === 'bundle_kit') {
      offerDiscount += discountForOffer;
      appliedOffers.push({
        code: offer.code,
        name: offer.name,
        discount_paise: discountForOffer,
      });
    }
  }

  const afterOfferSubtotal = Math.max(0, subtotal - offerDiscount);

  // 2. Evaluate coupon (validated against post-offer subtotal)
  let couponDiscount = 0;
  let appliedCoupon: { code: string; discount_paise: number } | null = null;

  if (
    coupon &&
    coupon.is_active &&
    isWindowActive(coupon.starts_at, coupon.expires_at, now) &&
    (coupon.usage_limit === null || coupon.usage_count < coupon.usage_limit) &&
    afterOfferSubtotal >= coupon.min_order_paise &&
    afterOfferSubtotal > 0
  ) {
    if (coupon.discount_type === 'fixed_paise') {
      couponDiscount = coupon.discount_value;
    } else {
      couponDiscount = Math.round((afterOfferSubtotal * coupon.discount_value) / 100);
    }

    if (coupon.max_discount_paise !== null) {
      couponDiscount = Math.min(couponDiscount, coupon.max_discount_paise);
    }

    couponDiscount = Math.min(couponDiscount, afterOfferSubtotal);
    if (couponDiscount > 0) {
      appliedCoupon = { code: coupon.code, discount_paise: couponDiscount };
    }
  }

  const discountedSubtotal = Math.max(0, afterOfferSubtotal - couponDiscount);

  // 3. Shipping & COD fees
  const freeThreshold =
    shippingZone?.free_shipping_threshold_paise ?? settings.free_shipping_threshold_paise;
  const baseShipping =
    shippingZone?.shipping_charge_paise ?? settings.default_shipping_charge_paise;

  const qualifiesForFreeShipping =
    totalQuantity > 0 && (offerGrantsFreeShipping || discountedSubtotal >= freeThreshold);

  const shippingPaise =
    totalQuantity === 0 ? 0 : qualifiesForFreeShipping ? 0 : baseShipping;

  const codFeePaise =
    paymentMethod === 'cod' && shippingZone?.cod_available
      ? shippingZone.cod_fee_paise
      : 0;

  // 4. GST Tax breakdown (inclusive vs exclusive)
  const gstRateBps = items[0]?.gst_rate_bps ?? settings.default_gst_rate_bps;
  let taxPaise = 0;
  let totalPaise = 0;

  if (settings.gst_inclusive_pricing) {
    // Price already includes GST: extract GST component = round(amount * rate / (10000 + rate))
    taxPaise =
      gstRateBps > 0
        ? Math.round((discountedSubtotal * gstRateBps) / (10000 + gstRateBps))
        : 0;
    totalPaise = discountedSubtotal + shippingPaise + codFeePaise;
  } else {
    taxPaise = Math.round((discountedSubtotal * gstRateBps) / 10000);
    totalPaise = discountedSubtotal + taxPaise + shippingPaise + codFeePaise;
  }

  const totalSavingsPaise =
    catalogSavings +
    offerDiscount +
    couponDiscount +
    (qualifiesForFreeShipping ? baseShipping : 0);

  return {
    mrp_total_paise: mrpTotal,
    subtotal_paise: subtotal,
    catalog_savings_paise: catalogSavings,
    offer_discount_paise: offerDiscount,
    coupon_discount_paise: couponDiscount,
    shipping_paise: shippingPaise,
    cod_fee_paise: codFeePaise,
    tax_paise: taxPaise,
    tax_inclusive: settings.gst_inclusive_pricing,
    total_paise: totalPaise,
    total_savings_paise: totalSavingsPaise,
    qualifies_for_comfort_kit: qualifiesForComfortKit,
    qualifies_for_free_shipping: qualifiesForFreeShipping,
    applied_offers: appliedOffers,
    applied_coupon: appliedCoupon,
  };
}

/**
 * Matches an Indian 6-digit PIN code against admin-configured shipping zones.
 * Longest matching prefix wins (e.g. '56' beats '5').
 */
export function matchShippingZone(
  pincode: string,
  zones: ShippingZone[]
): ShippingZone | null {
  const clean = pincode.trim();
  if (!/^[1-9][0-9]{5}$/.test(clean)) return null;

  let bestZone: ShippingZone | null = null;
  let bestPrefixLen = -1;

  for (const zone of zones) {
    if (!zone.is_active) continue;
    for (const prefix of zone.pincode_prefixes) {
      if (clean.startsWith(prefix) && prefix.length > bestPrefixLen) {
        bestPrefixLen = prefix.length;
        bestZone = zone;
      }
    }
  }

  return bestZone;
}
