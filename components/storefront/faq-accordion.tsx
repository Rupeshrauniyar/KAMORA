'use client';

import * as React from 'react';
import { Plus, Minus } from 'lucide-react';
import type { FAQ } from '@/types/database';

export function FaqAccordion({ faqs }: { faqs: FAQ[] }) {
  const [openId, setOpenId] = React.useState<string | null>(faqs[0]?.id ?? null);

  return (
    <div className="divide-y divide-[#E6E3DC] border-y border-[#E6E3DC]">
      {faqs.map((faq, idx) => {
        const isOpen = openId === faq.id;
        return (
          <div key={faq.id} className="py-6">
            <button
              type="button"
              onClick={() => setOpenId(isOpen ? null : faq.id)}
              aria-expanded={isOpen}
              className="group flex w-full items-start justify-between gap-6 text-left cursor-pointer"
            >
              <div className="flex items-baseline gap-4 sm:gap-6">
                <span className="font-mono-tech text-[10px] text-[#8A9099]">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <div>
                  <span className="font-mono-tech text-[10px] text-[#B89768]">
                    {faq.category}
                  </span>
                  <p className="mt-1 font-heading text-base font-semibold text-[#11151B] transition group-hover:text-[#1C3D5A] sm:text-lg">
                    {faq.question}
                  </p>
                </div>
              </div>
              <span className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#E6E3DC] bg-white text-[#11151B] transition group-hover:border-[#0E1116]">
                {isOpen ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
              </span>
            </button>
            {isOpen && (
              <p className="mt-3.5 pl-8 pr-10 text-sm leading-relaxed text-[#5C636E] sm:pl-12">
                {faq.answer}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
