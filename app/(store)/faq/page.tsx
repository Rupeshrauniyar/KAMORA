import type { Metadata } from 'next';
import Link from 'next/link';
import { getFaqs } from '@/lib/data/storefront';
import { FaqAccordion } from '@/components/storefront/faq-accordion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Frequently Asked Questions',
  description:
    'Answers on choosing your waist size, wearing and caring for the Kamora Back Support Belt, Indian delivery, payments, and returns.',
};

export default async function FaqPage() {
  const faqs = await getFaqs('all');

  return (
    <div className="bg-[#FAFAF8] py-14">
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Badge variant="default">Help Centre</Badge>
          <h1 className="mt-3 font-heading text-3xl font-bold text-[#11151B] sm:text-4xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-2 text-sm text-[#5C636E]">
            Clear, honest guidance on sizing, daily usage, washing care, payments, and shipping.
          </p>
        </div>

        <div className="mt-10">
          <FaqAccordion faqs={faqs} />
        </div>

        <div className="mt-10 rounded-[20px] border border-[#E6E3DC] bg-white p-6 text-center shadow-soft">
          <p className="font-heading text-base font-semibold text-[#11151B]">
            Still have a sizing or order question?
          </p>
          <p className="mt-1 text-sm text-[#5C636E]">
            Our Kamora Care team is happy to help you pick the right fit.
          </p>
          <Link href="/contact" className="mt-4 inline-block">
            <Button variant="primary">Contact Kamora Care</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
