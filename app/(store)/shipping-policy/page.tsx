import type { Metadata } from 'next';
import { getStoreSettings } from '@/lib/data/storefront';
import { formatPaise } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Shipping Policy',
};

export default async function ShippingPolicyPage() {
  const settings = await getStoreSettings();
  return (
    <div className="bg-[#FAFAF8] py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Badge variant="default">Policy</Badge>
        <h1 className="mt-3 font-heading text-3xl font-bold text-[#11151B]">
          Shipping &amp; Delivery Policy
        </h1>
        <div className="mt-6 space-y-5 rounded-[22px] border border-[#E6E3DC] bg-white p-7 text-sm leading-relaxed text-[#5C636E] shadow-soft">
          <p>
            <strong className="text-[#11151B]">Order Processing:</strong> Confirmed orders are
            packed and handed over to our delivery partners within 24–48 business hours (Monday to
            Saturday, excluding Indian public holidays).
          </p>
          <p>
            <strong className="text-[#11151B]">Shipping Rates:</strong> Orders above{' '}
            {formatPaise(settings.free_shipping_threshold_paise)} qualify for complimentary
            standard shipping across eligible Indian PIN codes. Orders below the threshold carry
            zone-based shipping starting at {formatPaise(settings.default_shipping_charge_paise)}.
          </p>
          <p>
            <strong className="text-[#11151B]">Delivery Timelines:</strong> Metro cities typically
            receive delivery in 2–4 business days; Tier-1/Tier-2 cities in 3–5 business days; Rest
            of India in 4–7 business days; North-East and island territories in 5–9 business days.
          </p>
          <p>
            <strong className="text-[#11151B]">Tracking:</strong> Once dispatched, your courier
            name and tracking number are recorded in your account and accessible on our Track
            Order page.
          </p>
        </div>
      </div>
    </div>
  );
}
