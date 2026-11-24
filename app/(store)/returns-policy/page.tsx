import type { Metadata } from 'next';
import { getStoreSettings } from '@/lib/data/storefront';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Returns & Refunds Policy',
};

export default async function ReturnsPolicyPage() {
  const settings = await getStoreSettings();
  return (
    <div className="bg-[#FAFAF8] py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Badge variant="default">Policy</Badge>
        <h1 className="mt-3 font-heading text-3xl font-bold text-[#11151B]">
          Returns, Exchanges &amp; Refunds Policy
        </h1>
        <div className="mt-6 space-y-5 rounded-[22px] border border-[#E6E3DC] bg-white p-7 text-sm leading-relaxed text-[#5C636E] shadow-soft">
          <p>
            <strong className="text-[#11151B]">Return &amp; Size Exchange Window:</strong> You may
            request a return or size exchange within{' '}
            <strong>{settings.return_window_days} calendar days</strong> of delivery.
          </p>
          <p>
            <strong className="text-[#11151B]">Eligibility Conditions:</strong> Because back
            support belts are personal wellness gear, returned items must be unused, unwashed, and
            in original packaging with all complimentary accessories intact.
          </p>
          <p>
            <strong className="text-[#11151B]">Refund Processing:</strong> Approved prepaid refunds
            are processed back to your original Stripe payment method within 5–7 business days.
            Cash on Delivery refunds are issued via bank transfer / UPI upon return inspection.
          </p>
          <p>
            <strong className="text-[#11151B]">How to Initiate:</strong> Email{' '}
            <span className="font-semibold text-[#1C3D5A]">{settings.support_email}</span> with
            your order number and registered mobile number.
          </p>
        </div>
      </div>
    </div>
  );
}
