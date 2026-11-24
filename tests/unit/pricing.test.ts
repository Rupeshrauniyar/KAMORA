import { describe, it, expect } from 'vitest';
import { calculateOrderPricing, matchShippingZone } from '@/lib/pricing/engine';
import { INITIAL_OFFERS, INITIAL_SETTINGS, INITIAL_SHIPPING_ZONES } from '@/lib/data/initial-catalog';
import { formatPaise } from '@/lib/utils/format';
import type { Coupon, Offer } from '@/types/database';

describe('Kamora Server-Side Integer Paise Pricing Engine', () => {
  it('calculates single belt with Complete Back Comfort Kit and free shipping', () => {
    const metroZone = matchShippingZone('560038', INITIAL_SHIPPING_ZONES);
    const result = calculateOrderPricing({
      items: [
        {
          quantity: 1,
          unit_mrp_paise: 349900,
          unit_price_paise: 249900,
          gst_rate_bps: 1200,
        },
      ],
      activeOffers: INITIAL_OFFERS,
      coupon: null,
      shippingZone: metroZone,
      settings: INITIAL_SETTINGS,
      paymentMethod: 'stripe_card',
    });

    expect(result.mrp_total_paise).toBe(349900);
    expect(result.subtotal_paise).toBe(249900);
    expect(result.catalog_savings_paise).toBe(100000);
    expect(result.qualifies_for_comfort_kit).toBe(true);
    expect(result.qualifies_for_free_shipping).toBe(true);
    expect(result.shipping_paise).toBe(0);
    expect(result.total_paise).toBe(249900);
    // 12% GST inclusive extraction: round(249900 * 1200 / 11200) = 26775
    expect(result.tax_paise).toBe(26775);
  });

  it('applies Family Comfort Add-On ₹400 discount when ordering 2 belts', () => {
    const result = calculateOrderPricing({
      items: [
        {
          quantity: 2,
          unit_mrp_paise: 349900,
          unit_price_paise: 249900,
          gst_rate_bps: 1200,
        },
      ],
      activeOffers: INITIAL_OFFERS,
      coupon: null,
      shippingZone: matchShippingZone('400001', INITIAL_SHIPPING_ZONES),
      settings: INITIAL_SETTINGS,
      paymentMethod: 'stripe_card',
    });

    expect(result.subtotal_paise).toBe(499800);
    expect(result.offer_discount_paise).toBe(40000);
    expect(result.total_paise).toBe(459800);
    expect(result.applied_offers.map((o) => o.code)).toContain('FAMILY_COMFORT_ADDON');
  });

  it('ignores expired offers and applies valid percentage coupon with max cap', () => {
    const expiredOffer: Offer = {
      ...INITIAL_OFFERS[1]!,
      ends_at: '2020-01-01T00:00:00Z',
    };
    const coupon: Coupon = {
      id: 'c1',
      code: 'SAVE20',
      description: '20% off up to ₹300',
      discount_type: 'percentage',
      discount_value: 20,
      min_order_paise: 150000,
      max_discount_paise: 30000,
      usage_limit: 100,
      per_customer_limit: 1,
      usage_count: 5,
      starts_at: null,
      expires_at: '2099-01-01T00:00:00Z',
      is_active: true,
    };

    const result = calculateOrderPricing({
      items: [
        {
          quantity: 2,
          unit_mrp_paise: 349900,
          unit_price_paise: 249900,
          gst_rate_bps: 1200,
        },
      ],
      activeOffers: [expiredOffer],
      coupon,
      shippingZone: null,
      settings: INITIAL_SETTINGS,
      now: new Date('2026-11-24T00:00:00Z'),
    });

    expect(result.offer_discount_paise).toBe(0);
    expect(result.coupon_discount_paise).toBe(30000); // capped at ₹300
    expect(result.total_paise).toBe(469800);
  });

  it('matches Indian PIN code zones using longest prefix priority and adds COD fee when configured', () => {
    const metro = matchShippingZone('560038', INITIAL_SHIPPING_ZONES);
    const restOfIndia = matchShippingZone('590001', INITIAL_SHIPPING_ZONES);
    const northEast = matchShippingZone('781001', INITIAL_SHIPPING_ZONES);

    expect(metro?.name).toContain('Metro');
    expect(restOfIndia?.name).toBe('Rest of India');
    expect(restOfIndia?.cod_fee_paise).toBe(4900);
    expect(northEast?.cod_available).toBe(false);

    const codOrder = calculateOrderPricing({
      items: [
        {
          quantity: 1,
          unit_mrp_paise: 349900,
          unit_price_paise: 249900,
          gst_rate_bps: 1200,
        },
      ],
      activeOffers: INITIAL_OFFERS,
      coupon: null,
      shippingZone: restOfIndia,
      settings: INITIAL_SETTINGS,
      paymentMethod: 'cod',
    });

    expect(codOrder.cod_fee_paise).toBe(4900);
    expect(codOrder.total_paise).toBe(254800);
    expect(formatPaise(codOrder.total_paise)).toBe('₹2,548');
  });
});
