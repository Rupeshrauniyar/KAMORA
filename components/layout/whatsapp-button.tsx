'use client';

import { MessageCircle } from 'lucide-react';

export function WhatsAppFloat({
  whatsappNumber,
  brandName = 'Kamora',
}: {
  whatsappNumber: string | null;
  brandName?: string;
}) {
  if (!whatsappNumber) return null;
  const cleanNumber = whatsappNumber.replace(/\D/g, '');
  if (!cleanNumber) return null;

  const message = encodeURIComponent(
    `Hello ${brandName} Care Team, I would like sizing or ordering assistance for the Adjustable Back Support Belt.`
  );
  const href = `https://wa.me/${cleanNumber}?text=${message}`;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Chat with ${brandName} Care on WhatsApp`}
      className="fixed bottom-20 left-4 z-30 inline-flex items-center gap-2 rounded-full border border-[#E6E3DC] bg-[#0E1116] px-3.5 py-2 text-xs font-medium text-white shadow-elevated transition hover:-translate-y-0.5 hover:bg-[#1E242E] sm:bottom-6 sm:left-6"
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#25D366]/20 text-[#4ADE80]">
        <MessageCircle className="h-3.5 w-3.5" />
      </span>
      <span className="hidden sm:inline">Concierge</span>
    </a>
  );
}
