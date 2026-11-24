import type { Metadata } from 'next';
import { getStoreSettings } from '@/lib/data/storefront';
import { Badge } from '@/components/ui/badge';

export const metadata: Metadata = {
  title: 'Privacy Policy',
};

export default async function PrivacyPolicyPage() {
  const settings = await getStoreSettings();
  return (
    <div className="bg-[#FAFAF8] py-14">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Badge variant="default">Legal</Badge>
        <h1 className="mt-3 font-heading text-3xl font-bold text-[#11151B]">Privacy Policy</h1>
        <div className="mt-6 space-y-5 rounded-[22px] border border-[#E6E3DC] bg-white p-7 text-sm leading-relaxed text-[#5C636E] shadow-soft">
          <p>
            {settings.business_legal_name} (&ldquo;{settings.brand_name}&rdquo;) respects your
            privacy and processes personal data strictly in accordance with applicable Indian data
            protection norms.
          </p>
          <p>
            <strong className="text-[#11151B]">Information We Collect:</strong> Name, email,
            mobile number, shipping address, and order details necessary to fulfil your order and
            provide customer support.
          </p>
          <p>
            <strong className="text-[#11151B]">Payment Security:</strong> Kamora never stores card
            numbers or CVV data. All online transactions are processed securely through Stripe.
          </p>
          <p>
            <strong className="text-[#11151B]">Your Rights:</strong> You may request access to,
            correction of, or deletion of your account information by emailing{' '}
            <span className="font-semibold text-[#1C3D5A]">{settings.support_email}</span>.
          </p>
        </div>
      </div>
    </div>
  );
}
