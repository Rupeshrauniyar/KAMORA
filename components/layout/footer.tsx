'use client';

import * as React from 'react';
import Link from 'next/link';
import { ArrowRight, CheckCircle2, Lock, ShieldCheck } from 'lucide-react';
import type { StoreSettings } from '@/types/database';

export function Footer({ settings }: { settings: StoreSettings }) {
  const [email, setEmail] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = React.useState('');

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus('submitting');
    setFeedback('');

    try {
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, source: 'footer' }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setStatus('error');
        setFeedback(data.error ?? 'Could not subscribe right now.');
      } else {
        setStatus('success');
        setFeedback(data.message ?? 'Subscribed to Kamora notes.');
        setEmail('');
      }
    } catch {
      setStatus('error');
      setFeedback('Network error. Please try again.');
    }
  }

  return (
    <footer className="bg-[#0E1116] text-white">
      <div className="mx-auto max-w-[1380px] px-4 py-20 sm:px-8">
        <div className="grid gap-14 lg:grid-cols-12">
          {/* Editorial Brand Column */}
          <div className="lg:col-span-5">
            <p className="font-mono-tech text-[10px] text-[#B89768]">
              ARCHITECTURAL LUMBAR STUDIO · INDIA
            </p>
            <h2 className="mt-4 font-editorial text-4xl leading-[1.08] text-white sm:text-5xl">
              Designed for calm,{' '}
              <span className="italic text-[#D6BA8E]">unrestricted</span> daily movement.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/60">
              {settings.business_legal_name} — {settings.business_address}. Questions about
              sizing or delivery? Reach us at{' '}
              <a
                href={`mailto:${settings.support_email}`}
                className="text-white underline decoration-white/30 underline-offset-4 hover:decoration-white"
              >
                {settings.support_email}
              </a>{' '}
              or {settings.support_phone}.
            </p>

            {/* Minimalist Newsletter */}
            <form onSubmit={handleSubscribe} className="mt-7 max-w-md">
              <label htmlFor="footer-newsletter" className="font-mono-tech block text-[10px] text-white/50">
                JOURNAL &amp; LAUNCH NOTES
              </label>
              <div className="mt-2.5 flex items-center gap-2 border-b border-white/20 pb-2 focus-within:border-[#B89768]">
                <input
                  id="footer-newsletter"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full bg-transparent text-sm text-white placeholder:text-white/35 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={status === 'submitting'}
                  aria-label="Subscribe to newsletter"
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-[#0E1116] transition hover:bg-[#D6BA8E] cursor-pointer"
                >
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
              {feedback && (
                <p
                  className={`mt-2.5 flex items-center gap-1.5 text-xs ${
                    status === 'success' ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {status === 'success' && <CheckCircle2 className="h-3.5 w-3.5" />}
                  {feedback}
                </p>
              )}
            </form>
          </div>

          {/* Link Columns */}
          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 lg:col-span-7 lg:pl-10">
            <div>
              <h3 className="font-mono-tech text-[10px] text-white/45">PRODUCT</h3>
              <ul className="mt-5 space-y-3 text-sm text-white/75">
                <li>
                  <Link href="/products/back-support-belt" className="hover:text-white">
                    Back Support Belt
                  </Link>
                </li>
                <li>
                  <Link href="/products/back-support-belt#comfort-kit" className="hover:text-white">
                    Complete Comfort Kit
                  </Link>
                </li>
                <li>
                  <Link href="/products/back-support-belt#size-guide" className="hover:text-white">
                    Waist Size Finder
                  </Link>
                </li>
                <li>
                  <Link href="/cart" className="hover:text-white">
                    Shopping Bag
                  </Link>
                </li>
                <li>
                  <Link href="/track-order" className="hover:text-white">
                    Track Order
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-mono-tech text-[10px] text-white/45">STUDIO</h3>
              <ul className="mt-5 space-y-3 text-sm text-white/75">
                <li>
                  <Link href="/about" className="hover:text-white">
                    About Kamora
                  </Link>
                </li>
                <li>
                  <Link href="/blog" className="hover:text-white">
                    Wellness Journal
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="hover:text-white">
                    FAQs
                  </Link>
                </li>
                <li>
                  <Link href="/contact" className="hover:text-white">
                    Contact Care
                  </Link>
                </li>
                <li>
                  <Link href="/account" className="hover:text-white">
                    My Account
                  </Link>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="font-mono-tech text-[10px] text-white/45">POLICIES</h3>
              <ul className="mt-5 space-y-3 text-sm text-white/75">
                <li>
                  <Link href="/shipping-policy" className="hover:text-white">
                    Shipping Policy
                  </Link>
                </li>
                <li>
                  <Link href="/returns-policy" className="hover:text-white">
                    Returns &amp; Refunds
                  </Link>
                </li>
                <li>
                  <Link href="/privacy-policy" className="hover:text-white">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link href="/terms" className="hover:text-white">
                    Terms &amp; Conditions
                  </Link>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Bottom Architectural Hairline Bar */}
        <div className="mt-16 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-8 sm:flex-row sm:items-center">
          <div className="text-xs text-white/45">
            <p>
              © {new Date().getFullYear()} {settings.business_legal_name}
              {settings.gstin ? ` · GSTIN ${settings.gstin}` : ''}
            </p>
            <p className="mt-1 text-[11px] text-white/35">
              Everyday lumbar support accessory — not intended to diagnose, treat, or cure medical
              spinal conditions.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-white/65">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1">
              <Lock className="h-3 w-3 text-[#D6BA8E]" />
              Razorpay Secured
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1">
              <ShieldCheck className="h-3 w-3 text-[#D6BA8E]" />
              INR · Eligible COD
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
