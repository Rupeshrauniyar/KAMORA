'use client';

import * as React from 'react';
import { Mail, Phone, MapPin, CheckCircle2, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input, Textarea } from '@/components/ui/card';

export default function ContactPage() {
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [phone, setPhone] = React.useState('');
  const [orderNumber, setOrderNumber] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [status, setStatus] = React.useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [feedback, setFeedback] = React.useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus('submitting');
    setFeedback('');

    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          phone,
          order_number: orderNumber,
          message,
        }),
      });
      const data = (await res.json()) as { message?: string; error?: string };
      if (!res.ok) {
        setStatus('error');
        setFeedback(data.error ?? 'Could not submit your inquiry.');
      } else {
        setStatus('success');
        setFeedback(data.message ?? 'Message received.');
        setName('');
        setEmail('');
        setPhone('');
        setOrderNumber('');
        setMessage('');
      }
    } catch {
      setStatus('error');
      setFeedback('Network error. Please email support@kamora.in directly.');
    }
  }

  return (
    <div className="bg-[#FAFAF8] py-14">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <Badge variant="default">Kamora Care</Badge>
          <h1 className="mt-3 font-heading text-3xl font-bold text-[#11151B] sm:text-4xl">
            How Can We Help You Today?
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-[#5C636E]">
            Reach out for waist sizing assistance, order tracking, exchanges, or bulk family
            inquiries.
          </p>
        </div>

        <div className="mt-10 grid gap-8 lg:grid-cols-12">
          <div className="space-y-4 lg:col-span-5">
            {[
              {
                icon: Mail,
                title: 'Email Support',
                value: 'support@kamora.in',
                note: 'Responses within 1 business day (IST)',
              },
              {
                icon: Phone,
                title: 'Phone & WhatsApp Care',
                value: '+91 98765 43210',
                note: 'Mon–Sat, 9:30 AM – 6:30 PM IST',
              },
              {
                icon: MapPin,
                title: 'Registered Office',
                value: 'Kamora Wellness Private Limited',
                note: 'Indiranagar, Bengaluru, Karnataka 560038, India',
              },
            ].map((card) => (
              <div
                key={card.title}
                className="rounded-[18px] border border-[#E6E3DC] bg-white p-5 shadow-soft"
              >
                <div className="flex items-center gap-2.5 text-sm font-semibold text-[#11151B]">
                  <card.icon className="h-4 w-4 text-[#1C3D5A]" />
                  {card.title}
                </div>
                <p className="mt-2 font-medium text-[#11151B]">{card.value}</p>
                <p className="mt-0.5 text-xs text-[#5C636E]">{card.note}</p>
              </div>
            ))}
          </div>

          <form
            onSubmit={handleSubmit}
            className="space-y-4 rounded-[22px] border border-[#E6E3DC] bg-white p-6 shadow-soft sm:p-8 lg:col-span-7"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="c-name" className="mb-1.5 block text-xs font-semibold text-[#11151B]">
                  Full Name *
                </label>
                <Input
                  id="c-name"
                  required
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="c-email" className="mb-1.5 block text-xs font-semibold text-[#11151B]">
                  Email *
                </label>
                <Input
                  id="c-email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                />
              </div>
              <div>
                <label htmlFor="c-phone" className="mb-1.5 block text-xs font-semibold text-[#11151B]">
                  Phone (Optional)
                </label>
                <Input
                  id="c-phone"
                  type="tel"
                  autoComplete="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <label htmlFor="c-order" className="mb-1.5 block text-xs font-semibold text-[#11151B]">
                  Order Number (Optional)
                </label>
                <Input
                  id="c-order"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  placeholder="KMR-..."
                />
              </div>
            </div>

            <div>
              <label htmlFor="c-msg" className="mb-1.5 block text-xs font-semibold text-[#11151B]">
                Message *
              </label>
              <Textarea
                id="c-msg"
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us how we can assist with sizing, shipping, or your order..."
              />
            </div>

            {feedback && (
              <p
                className={`flex items-start gap-2 rounded-[12px] p-3 text-xs ${
                  status === 'success'
                    ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
                    : 'border border-rose-200 bg-rose-50 text-rose-700'
                }`}
              >
                {status === 'success' ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                )}
                <span>{feedback}</span>
              </p>
            )}

            <Button type="submit" variant="primary" size="lg" disabled={status === 'submitting'}>
              {status === 'submitting' ? 'Sending...' : 'Send Message'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
