import type { Metadata } from 'next';
import { getStoreSettings } from '@/lib/data/storefront';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
};

export default async function TermsPage() {
  const settings = await getStoreSettings();
  return (
    <div className="bg-[#FAFAF8] py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Badge variant="default">Legal</Badge>
        <h1 className="mt-3 font-heading text-3xl font-bold text-[#11151B]">
          Terms &amp; Conditions
        </h1>
        <div className="mt-6 space-y-5 rounded-[22px] border border-[#E6E3DC] bg-white p-7 text-sm leading-relaxed text-[#5C636E] shadow-soft">
          <p>
            By accessing or purchasing from {settings.brand_name}, operated by{' '}
            {settings.business_legal_name}, you agree to these terms and all referenced shipping,
            return, and privacy policies.
          </p>
          <p>
            <strong className="text-[#11151B]">Pricing &amp; Taxes:</strong> All prices are listed
            in Indian Rupees (INR) and are inclusive of applicable GST unless explicitly stated
            otherwise. Promotional offers and coupons are subject to active campaign windows and
            server-side verification.
          </p>
          <p>
            <strong className="text-[#11151B]">Wellness Disclaimer:</strong> Kamora back support
            belts are designed for everyday lumbar support and posture awareness. They do not
            constitute medical advice or treatment. Always consult a qualified physician for
            medical spinal conditions.
          </p>
          <p>
            <strong className="text-[#11151B]">Governing Law:</strong> These terms are governed by
            the laws of India, with exclusive jurisdiction in Bengaluru, Karnataka.
          </p>
        </div>
      </div>
    </div>
  );
}
